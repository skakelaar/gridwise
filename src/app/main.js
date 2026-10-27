// Entry point: hash router and controllers. Wires session state (session.js), persistence (storage.js)
// and rendering (ui.js) together. Puzzle logic never lives here; the engine is only asked to generate.
import { parseHash as parseRouteHash } from './routes.js';
import { generatePuzzle, generateAny } from '../engine/index.js';
import { INTRO_STEPS, ITEM_GUIDES, PRODUCT_NAME } from './content.js';
import * as storage from './storage.js';
import * as session from './session.js';
import * as ui from './ui.js';
import { createCountdown } from './timer.js';
import * as challenge from './challenge.js';
import * as mock from './mocktest.js';
import { savedPuzzle } from './replay.js';
import { summarise, byGroup, byDifficulty, formatClock } from './stats.js';

const app = document.getElementById('app');
const nav = document.querySelector('.site-nav');

// ---------------------------------------------------------------- routing

let lastRouteHash = '#/';

const parseHash = () => parseRouteHash(location.hash);

function navigate(hash, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) route();
}

const ROUTES = {
  '': showHome,
  intro: showIntro,
  practice: () => showPractice(),
  guided: () => { storage.saveSettings({ practiceHints: true }); navigate('#/practice', { replace: true }); },
  test: () => navigate(`#/${storage.loadSettings().testFormat || 'mock'}`, { replace: true }),
  timed: showTimed,
  challenge: showChallenge,
  mock: showMock,
  results: showResults,
  review: (parts) => (parts[0] ? showReviewPuzzle(parts[0]) : navigate('#/results/mistakes', { replace: true })),
  progress: () => navigate('#/results', { replace: true }),
  settings: showSettings,
  about: showAbout,
};
// Which nav entry a route belongs to.
const NAV_SECTION = { intro: 'intro', practice: 'practice', guided: 'practice', test: 'test', timed: 'test', challenge: 'test', mock: 'test', results: 'results', review: 'results', progress: 'results', settings: 'settings' };

let teardown = null; // cleanup for the active screen (timers, listeners)

function mount(element, { title, focusTitle = true } = {}) {
  if (teardown) { teardown(); teardown = null; }
  ui.clear(app);
  if (storage.storageWarned()) app.appendChild(ui.renderStorageNotice());
  app.appendChild(element);
  document.title = title ? `${title} – ${PRODUCT_NAME}` : PRODUCT_NAME;
  if (focusTitle) ui.focusEl(element.querySelector('#screen-title'));
  updateNav();
}

function updateNav() {
  if (!nav) return;
  const top = parseHash()[0] || '';
  nav.querySelectorAll('a').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#\/?/, '').split('/')[0];
    const active = target === (NAV_SECTION[top] || top);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function route() {
  if (location.hash.startsWith('#/')) lastRouteHash = location.hash;
  const parts = parseHash();
  const handler = ROUTES[parts[0] || ''];
  try {
    if (handler) handler(parts.slice(1));
    else mount(ui.renderNotFound(), { title: 'Not found' });
  } catch (err) {
    console.error(err);
    mount(ui.renderError(err && err.message ? err.message : String(err)), { title: 'Error' });
  }
}

// ---------------------------------------------------------------- shared: recording results

function recordAttempt(puzzle, attempt, { addMistake = true } = {}) {
  storage.appendAttempt(attempt);
  if (addMistake && !attempt.correct && attempt.chosenIndex != null) {
    storage.upsertMistake(puzzle
      ? session.makeMistake(puzzle, { chosenIndex: attempt.chosenIndex, at: Date.parse(attempt.at), mode: attempt.mode })
      : attempt); // legacy mock: retain its recorded result without fabricating a question
  }
}

function numberKeyHandler(getView) {
  return (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || e.target?.isContentEditable) return;
    const view = getView();
    if (!view) return;
    if (/^[1-6]$/.test(e.key)) {
      const target = document.getElementById(`opt-${Number(e.key) - 1}`);
      if (!target) return; // fewer options on this question
      e.preventDefault();
      view.select(Number(e.key) - 1);
      target.focus();
    }
  };
}

// ---------------------------------------------------------------- home / intro / about

function showHome() {
  const samplePuzzle = generatePuzzle({ family: 'rotation', difficulty: 1, seed: 'welcome' });
  mount(ui.renderHome({ samplePuzzle }), { title: 'Home' });
}

function showIntro(parts) {
  const tab = parts[0] || 'matrices';
  if (tab !== 'matrices') {
    const guide = ITEM_GUIDES[tab];
    if (!guide) { navigate('#/intro', { replace: true }); return; }
    const examples = guide.examples.map((spec) => { try { return generateAny(spec); } catch { return null; } });
    const onPractise = (family) => {
      storage.saveSettings({ practiceFamily: family, practiceHints: true, practiceClock: 'off' });
      practiceSessions.guided = null; practiceSessions.untimed = null;
      navigate('#/practice');
      ui.announce(`Practice set to ${guide.title.toLowerCase()} with hints on.`);
    };
    mount(ui.renderItemGuide({ tab, guide, examples }, { onPractise }), { title: `Learn – ${guide.title}` });
    return;
  }
  const examples = INTRO_STEPS.map((step) => {
    if (!step.example) return null;
    try { return generatePuzzle(step.example); } catch { return null; }
  });
  mount(ui.renderIntro({ examples }), { title: 'Learn – matrices' });
}

function showAbout() {
  mount(ui.renderAbout(), { title: 'About' });
}

// ---------------------------------------------------------------- guided / untimed practice

const practiceSessions = { guided: null, untimed: null };

function showPractice() {
  const settings = storage.loadSettings();
  const mode = settings.practiceHints === false ? 'untimed' : 'guided';
  let current = practiceSessions[mode];
  if (!current) current = practiceSessions[mode] = newPracticePuzzle(mode, settings);
  renderPractice(mode, current, { focus: 'title' });
}

function newPracticePuzzle(mode, settings) {
  const spec = session.chooseSpec({
    filter: settings.practiceFamily,
    difficulty: settings.practiceDifficulty,
    personalise: settings.personalise,
    attempts: storage.loadAttempts(),
    adaptive: storage.loadAdaptive(),
  });
  return session.startPuzzle({ mode, spec });
}

function renderPractice(mode, s, { focus } = {}) {
  const settings = storage.loadSettings();
  const adaptive = storage.loadAdaptive();
  const restart = () => {
    practiceSessions[mode] = newPracticePuzzle(mode, storage.loadSettings());
    renderPractice(mode, practiceSessions[mode], { focus: 'title' });
    ui.announce('New puzzle loaded.');
  };
  const bar = ui.renderPracticeBar({
    settings,
    adaptive,
    onFamily: (v) => { storage.saveSettings({ practiceFamily: v }); restart(); },
    onDifficulty: (v) => {
      storage.saveSettings({ practiceDifficulty: v });
      if (v !== 'mixed') storage.saveAdaptive({ ...storage.DEFAULT_ADAPTIVE, level: Number(v) });
      restart();
    },
    onClock: (v) => { storage.saveSettings({ practiceClock: v }); restart(); },
    onHints: (on) => {
      // Keep the current puzzle; just switch the help on or off.
      storage.saveSettings({ practiceHints: !!on });
      const newMode = on ? 'guided' : 'untimed';
      practiceSessions[newMode] = s;
      s.mode = newMode;
      renderPractice(newMode, s, { focus: 'hints' });
      ui.announce(on ? 'Hints switched on.' : 'Hints switched off.');
    },
  });
  const handlers = {
    onSelect: (i) => { session.selectOption(s, i); ui.setSelectedOption(app, s.selected); },
    onSubmit: () => {
      if (s.selected == null) {
        const msg = app.querySelector('.submit-msg');
        if (msg) msg.textContent = 'Choose one of the options first.';
        document.getElementById('opt-0')?.focus();
        return;
      }
      const attempt = session.submitAnswer(s);
      if (!attempt) return;
      recordAttempt(s.puzzle, attempt);
      if (settings.personalise) storage.saveAdaptive(session.updateAdaptive(adaptive, attempt.correct));
      renderPractice(mode, s, { focus: 'feedback' });
      ui.announce(attempt.correct ? 'Correct.' : `Not quite. The correct answer is option ${s.puzzle.correctIndex + 1}.`);
    },
    onHint: () => {
      session.revealHint(s);
      renderPractice(mode, s, { focus: 'hint' });
      ui.announce(`Hint ${s.hintsUsed} of ${s.puzzle.hints.length}: ${s.puzzle.hints[s.hintsUsed - 1]}`);
    },
    onReveal: () => {
      session.revealSolution(s);
      renderPractice(mode, s, { focus: 'feedback' });
      ui.announce(`Solution revealed. The correct answer is option ${s.puzzle.correctIndex + 1}.`);
    },
    onNext: restart,
  };
  const clockSecs = Number(settings.practiceClock) || 0;
  const clockOn = clockSecs > 0 && !s.answered && !s.revealed;
  const model = {
    puzzle: s.puzzle,
    mode,
    heading: 'Practise',
    selected: s.selected,
    answered: s.answered,
    revealed: s.revealed,
    hintsUsed: s.hintsUsed,
    showHints: mode === 'guided',
    showCountdown: clockOn,
    hideEndEarly: true,
    countdownLabel: 'Time remaining for this question',
    bar,
  };
  mount(ui.renderPuzzleScreen(model, handlers), { title: model.heading, focusTitle: focus === 'title' });
  if (clockOn) {
    // The clock only runs while the puzzle is on screen: leaving the screen stores the remaining time.
    if (!s.deadline) s.deadline = Date.now() + (s.remainingMs ?? clockSecs * 1000);
    const clock = document.getElementById('countdown');
    const countdown = createCountdown({
      endsAt: s.deadline,
      announceAt: [10],
      onTick: (sec) => { if (clock) clock.textContent = formatClock(sec); },
      onAnnounce: (mark) => ui.announce(`${mark} seconds remaining.`),
      onEnd: () => {
        if (s.answered || s.revealed) return;
        const now = Date.now();
        s.answered = { chosenIndex: null, correct: false, ms: clockSecs * 1000, timedOut: true };
        storage.appendAttempt(session.makeAttempt(s.puzzle, { chosenIndex: -1, correct: false, ms: clockSecs * 1000, hintsUsed: s.hintsUsed, mode: s.mode, at: now }));
        storage.upsertMistake(session.makeMistake(s.puzzle, { chosenIndex: null, at: now, mode: s.mode }));
        if (settings.personalise) storage.saveAdaptive(session.updateAdaptive(adaptive, false));
        renderPractice(mode, s, { focus: 'feedback' });
        ui.announce('Time ran out. This counts as a mistake; the explanation is shown.');
      },
    }).start();
    const prev = teardown;
    teardown = () => {
      countdown.stop();
      if (!s.answered && !s.revealed) { s.remainingMs = Math.max(0, s.deadline - Date.now()); s.deadline = null; }
      if (prev) prev();
    };
  }
  if (focus === 'feedback') ui.focusEl(document.getElementById('feedback-title'));
  if (focus === 'hint') ui.focusEl(document.getElementById('hint-btn') || document.getElementById('reveal-btn'));
  if (focus === 'hints') ui.focusEl(document.getElementById('hints-toggle'));
  installNumberKeys(() => (s.answered || s.revealed ? null : { select: handlers.onSelect }));
}

function installNumberKeys(getView) {
  const handler = numberKeyHandler(getView);
  document.addEventListener('keydown', handler);
  const prev = teardown;
  teardown = () => { document.removeEventListener('keydown', handler); if (prev) prev(); };
}

// ---------------------------------------------------------------- timed sessions

let timed = null; // in-memory copy of the stored timed session

function loadTimedSession() {
  if (!timed) timed = storage.loadTimed();
  return timed;
}

function persistTimed() {
  if (timed) storage.saveTimed(timed);
}

function showTimed(parts) {
  const sub = parts[0];
  if (sub === 'run') return showTimedRun();
  if (sub === 'summary') return parts[1] != null ? showTimedReview(Number(parts[1])) : showTimedSummary();
  const existing = loadTimedSession();
  const resumable = existing && !existing.finished && Date.now() < existing.endsAt ? existing : null;
  if (existing && !existing.finished && Date.now() >= existing.endsAt) {
    session.finishTimed(existing, 'time', existing.endsAt);
    persistTimed();
  }
  const lastFinished = existing && existing.finished ? existing : null;
  const settings = storage.loadSettings();
  storage.saveSettings({ testFormat: 'timed' });
  mount(ui.renderTimedSetup({ settings, resumable, lastFinished }, {
    onStart: ({ count, minutes, family, difficulty }) => {
      storage.saveSettings({ timedCount: count, timedMinutes: minutes, timedFamily: family, timedDifficulty: difficulty });
      timed = session.createTimedSession({ count, minutes, filter: family, difficulty });
      persistTimed();
      navigate('#/timed/run');
    },
    onResume: () => navigate('#/timed/run'),
    onDiscard: () => { timed = null; storage.clearTimed(); showTimed([]); ui.announce('Unfinished session discarded.'); },
  }), { title: 'Timed session' });
}

function showTimedRun() {
  const t = loadTimedSession();
  if (!t) return navigate('#/timed', { replace: true });
  if (t.finished) return navigate('#/timed/summary', { replace: true });
  if (Date.now() >= t.endsAt) {
    session.finishTimed(t, 'time', t.endsAt);
    persistTimed();
    return navigate('#/timed/summary', { replace: true });
  }
  renderTimedPuzzle(t, { focus: 'title' });
}

function endTimed(t, reason) {
  session.finishTimed(t, reason);
  persistTimed();
  navigate('#/timed/summary', { replace: true });
  ui.announce(reason === 'time' ? 'Time is up. Showing your session summary.' : 'Session ended. Showing your summary.');
}

function renderTimedPuzzle(t, { focus } = {}) {
  const cur = session.timedCurrent(t);
  if (!cur) return endTimed(t, 'completed');
  const { puzzle } = cur;
  let selected = null;
  const advance = (afterText) => {
    persistTimed();
    if (t.finished) return endTimed(t, 'completed');
    renderTimedPuzzle(t, { focus: 'title' });
    ui.announce(`${afterText} Puzzle ${t.index + 1} of ${t.items.length}.`);
  };
  const handlers = {
    onSelect: (i) => { selected = i; ui.setSelectedOption(app, selected); },
    onSubmit: () => {
      if (selected == null) {
        const msg = app.querySelector('.submit-msg');
        if (msg) msg.textContent = `Choose one of the ${puzzle.options.length} options first, or skip.`;
        document.getElementById('opt-0')?.focus();
        return;
      }
      const attempt = session.timedAnswer(t, selected);
      if (attempt) recordAttempt(puzzle, attempt);
      advance(attempt ? 'Answer recorded.' : 'Time ran out before the answer was recorded.');
    },
    onSkip: () => { session.timedSkip(t); advance('Skipped.'); },
    onStop: () => endTimed(t, 'stopped'),
  };
  const model = {
    puzzle,
    mode: 'timed',
    heading: 'Timed session',
    progress: `Puzzle ${t.index + 1} of ${t.items.length}`,
    selected,
    answered: null,
    revealed: false,
    showHints: false,
    showCountdown: true,
    canSkip: true,
  };
  mount(ui.renderPuzzleScreen(model, handlers), { title: `Timed session – puzzle ${t.index + 1}`, focusTitle: focus === 'title' });
  installNumberKeys(() => ({ select: handlers.onSelect }));

  const clock = document.getElementById('countdown');
  const countdown = createCountdown({
    endsAt: t.endsAt,
    onTick: (s) => { if (clock) clock.textContent = formatClock(s); },
    onAnnounce: (mark) => ui.announce(mark >= 60 ? `${Math.round(mark / 60)} minute remaining.` : `${mark} seconds remaining.`),
    onEnd: () => endTimed(t, 'time'),
  }).start();
  const prev = teardown;
  teardown = () => { countdown.stop(); if (prev) prev(); };
}

function showTimedSummary() {
  const t = loadTimedSession();
  if (!t) return navigate('#/timed', { replace: true });
  if (!t.finished) {
    if (Date.now() >= t.endsAt) { session.finishTimed(t, 'time', t.endsAt); persistTimed(); }
    else return navigate('#/timed/run', { replace: true });
  }
  mount(ui.renderTimedSummary({ session: t, summary: session.timedSummary(t) }), { title: 'Session summary' });
}

function showTimedReview(index) {
  const t = loadTimedSession();
  if (!t || !t.finished) return navigate('#/timed', { replace: true });
  const item = t.items[index];
  if (!item) return mount(ui.renderNotFound(), { title: 'Not found' });
  const puzzle = savedPuzzle(item);
  if (!puzzle) return mount(ui.renderReplayUnavailable(item, '#/timed/summary'), { title: 'Question unavailable' });
  const model = {
    puzzle,
    mode: 'summary',
    heading: `Review puzzle ${index + 1} of ${t.items.length}`,
    answered: { chosenIndex: item.chosenIndex, correct: item.correct, ms: item.ms, skipped: item.chosenIndex == null },
    revealed: false,
    selected: null,
    showHints: false,
    prevHref: index > 0 ? `#/timed/summary/${index - 1}` : null,
    nextHref: index < t.items.length - 1 ? `#/timed/summary/${index + 1}` : null,
  };
  mount(ui.renderPuzzleScreen(model, {}), { title: `Review puzzle ${index + 1}` });
}

// ---------------------------------------------------------------- adaptive 12-in-12 challenge

let chal = null;

function loadChallenge() {
  if (!chal) chal = storage.loadChallenge();
  return chal;
}

function persistChallenge() {
  if (chal) storage.saveChallenge(chal);
}

function settleChallenge(c) {
  // Apply timeouts that elapsed while away; archive if that finished it.
  if (c && !c.finished && challenge.catchUp(c)) persistChallenge();
  if (c && c.finished) { storage.archiveChallenge(c); storage.clearChallenge(); chal = null; }
  return c;
}

function showChallenge(parts) {
  const sub = parts[0];
  if (sub === 'run') return showChallengeRun();
  if (sub === 'report') return showChallengeReport(parts[1]);
  const existing = settleChallenge(loadChallenge());
  const resumable = existing && !existing.finished ? existing : null;
  storage.saveSettings({ testFormat: 'challenge' });
  mount(ui.renderChallengeSetup({ resumable, history: storage.loadChallengeHistory() }, {
    onStart: (format) => { chal = challenge.createChallenge({ format }); persistChallenge(); navigate('#/challenge/run'); },
    onResume: () => navigate('#/challenge/run'),
    onDiscard: () => { chal = null; storage.clearChallenge(); showChallenge([]); ui.announce('Challenge discarded.'); },
  }), { title: 'Challenge' });
}

function showChallengeRun() {
  const c = loadChallenge();
  if (!c) return navigate('#/challenge', { replace: true });
  settleChallenge(c);
  if (c.finished) return navigate(`#/challenge/report/${c.id}`, { replace: true });
  renderChallengePuzzle(c, { focus: 'title' });
}

function endChallenge(c, reason) {
  challenge.finishChallenge(c, reason);
  persistChallenge();
  settleChallenge(c);
  navigate(`#/challenge/report/${c.id}`, { replace: true });
  ui.announce(reason === 'time' ? 'Time is up. Showing your challenge report.' : 'Challenge finished. Showing your report.');
}

function renderChallengePuzzle(c, { focus } = {}) {
  const cur = challenge.challengeCurrent(c);
  if (!cur) return endChallenge(c, 'completed');
  const { puzzle } = cur;
  let selected = null;
  const advance = (afterText) => {
    persistChallenge();
    if (c.finished) return endChallenge(c, 'completed');
    renderChallengePuzzle(c, { focus: 'title' });
    ui.announce(`${afterText} Question ${c.index + 1} of ${c.items.length}, level ${c.level}.`);
  };
  const handlers = {
    onSelect: (i) => { selected = i; ui.setSelectedOption(app, selected); },
    onSubmit: () => {
      if (selected == null) {
        const msg = app.querySelector('.submit-msg');
        if (msg) msg.textContent = 'Choose one of the options first.';
        document.getElementById('opt-0')?.focus();
        return;
      }
      const attempt = challenge.challengeAnswer(c, selected);
      if (attempt) recordAttempt(puzzle, attempt);
      advance(attempt ? 'Answer recorded.' : 'Time ran out before the answer was recorded.');
    },
    onStop: () => endChallenge(c, 'stopped'),
  };
  const model = {
    puzzle,
    mode: 'challenge',
    heading: 'Challenge',
    progress: `Question ${c.index + 1} of ${c.items.length}`,
    selected,
    answered: null,
    revealed: false,
    showHints: false,
    showCountdown: true,
    countdownLabel: 'Time remaining for this question',
    canSkip: false,
  };
  mount(ui.renderPuzzleScreen(model, handlers), { title: `Challenge – puzzle ${c.index + 1}`, focusTitle: focus === 'title' });
  installNumberKeys(() => ({ select: handlers.onSelect }));

  const clock = document.getElementById('countdown');
  const countdown = createCountdown({
    endsAt: challenge.puzzleDeadline(c),
    announceAt: [10],
    onTick: (s) => { if (clock) clock.textContent = formatClock(s); },
    onAnnounce: (mark) => ui.announce(`${mark} seconds remaining for this question.`),
    onEnd: () => {
      challenge.challengeTimeout(c);
      advance('Time ran out for that question; it is recorded as timed out.');
    },
  }).start();
  const prev = teardown;
  teardown = () => { countdown.stop(); if (prev) prev(); };
}

function showChallengeReport(id) {
  let c = id ? storage.findChallenge(id) : null;
  if (!c) {
    const live = settleChallenge(loadChallenge());
    if (live && !live.finished) return navigate('#/challenge/run', { replace: true });
    const hist = storage.loadChallengeHistory();
    c = id ? storage.findChallenge(id) : hist[hist.length - 1];
  }
  if (!c) return mount(ui.renderError('No challenge report found. Start a challenge to get one.'), { title: 'Challenge report' });
  const puzzles = c.items.map((item) => (item.difficulty == null ? null : safePuzzle(item)));
  mount(ui.renderChallengeReport({ challenge: c, report: challenge.challengeReport(c), puzzles }), { title: 'Challenge report' });
}

// ---------------------------------------------------------------- mock test (free navigation, one clock)

let mockState = null;

function loadMock() {
  if (!mockState) mockState = storage.loadMock();
  return mockState;
}
function persistMock() { if (mockState) storage.saveMock(mockState); }

function settleMock(m) {
  if (m && !m.finished && Date.now() >= m.endsAt) { mock.finishMock(m, 'time', m.endsAt); }
  if (m && m.finished) { finaliseMock(m); }
  return m;
}

function finaliseMock(m) {
  if (!m._logged) {
    // Mark as logged before writing attempts, so a failure part-way can never log the same test twice.
    m._logged = true;
    storage.saveMock(m);
    for (const attempt of mock.mockAttempts(m, m.finishedAt || Date.now())) {
      const item = m.items.find((i) => i.seed === attempt.seed && i.family === attempt.family);
      const puzzle = safePuzzle(item);
      recordAttempt(puzzle, attempt);
    }
  }
  storage.archiveMock(m);
  storage.clearMock();
  mockState = null;
}

/** Historical replay never calls the current generator. */
function safePuzzle(item) {
  return savedPuzzle(item);
}

function showMock(parts) {
  const sub = parts[0];
  if (sub === 'run') return showMockRun();
  if (sub === 'report') return showMockReport(parts[1]);
  const existing = settleMock(loadMock());
  const resumable = existing && !existing.finished ? existing : null;
  const settings = storage.loadSettings();
  storage.saveSettings({ testFormat: 'mock' });
  mount(ui.renderMockSetup({ settings, resumable, history: storage.loadMockHistory() }, {
    onStart: ({ count, minutes, tier }) => {
      storage.saveSettings({ mockCount: count, mockMinutes: minutes, mockTier: tier });
      mockState = mock.createMock({ count, minutes, tier });
      persistMock();
      navigate('#/mock/run');
    },
    onResume: () => navigate('#/mock/run'),
    onDiscard: () => { mockState = null; storage.clearMock(); showMock([]); ui.announce('Mock test discarded.'); },
  }), { title: 'Mock test' });
}

function showMockRun() {
  const m = loadMock();
  if (!m) return navigate('#/mock', { replace: true });
  settleMock(m);
  if (m.finished) return navigate(`#/mock/report/${m.id}`, { replace: true });
  renderMockQuestion(m, { focus: 'title' });
}

function endMock(m, reason) {
  mock.finishMock(m, reason);
  finaliseMock(m);
  navigate(`#/mock/report/${m.id}`, { replace: true });
  ui.announce(reason === 'time' ? 'Time is up. Showing your report.' : 'Test finished. Showing your report.');
}

function renderMockQuestion(m, { focus } = {}) {
  const puzzle = mock.mockPuzzle(m);
  const item = m.items[m.index];
  const goTo = (i) => { mock.mockGoTo(m, i); persistMock(); renderMockQuestion(m, { focus: 'title' }); ui.announce(`Question ${m.index + 1} of ${m.items.length}.`); };
  const handlers = {
    onSelect: (i) => { mock.mockAnswer(m, i); if (m.finished) return endMock(m, 'time'); persistMock(); ui.setSelectedOption(app, i); },
    onSubmit: () => {
      if (m.index < m.items.length - 1) goTo(m.index + 1);
      else { document.getElementById('finish-btn')?.focus(); ui.announce('This is the last question. Press Finish to end the test, or go back to a saved question.'); }
    },
    onNext: () => goTo(m.index + 1),
    onPrev: () => goTo(m.index - 1),
    onJump: (i) => goTo(i),
    onFlag: () => { const on = mock.mockToggleFlag(m); persistMock(); renderMockQuestion(m, { focus: 'flag' }); ui.announce(on ? 'Saved for later.' : 'Removed from saved questions.'); },
    onFinish: () => endMock(m, 'finished'),
    onStop: () => endMock(m, 'finished'),
  };
  const progress = mock.mockProgress(m);
  const model = {
    puzzle,
    mode: 'mock',
    mock: m,
    heading: 'Mock test',
    progress: `Question ${m.index + 1} of ${m.items.length} · ${progress.answered} answered`,
    selected: item.chosenIndex,
    answered: null,
    revealed: false,
    showHints: false,
    showCountdown: true,
    countdownLabel: 'Time remaining',
    canSkip: false,
  };
  mount(ui.renderPuzzleScreen(model, handlers), { title: `Mock test – question ${m.index + 1}`, focusTitle: focus === 'title' });
  if (focus === 'flag') document.getElementById('flag-btn')?.focus();
  const endEarly = document.getElementById('end-early');
  if (endEarly) endEarly.remove(); // the "I am finished" control replaces it
  installNumberKeys(() => ({ select: handlers.onSelect }));
  const clock = document.getElementById('countdown');
  const countdown = createCountdown({
    endsAt: m.endsAt,
    onTick: (s) => { if (clock) clock.textContent = formatClock(s); },
    onAnnounce: (mark) => ui.announce(mark >= 60 ? `${Math.round(mark / 60)} minute remaining.` : `${mark} seconds remaining.`),
    onEnd: () => endMock(m, 'time'),
  }).start();
  const prev = teardown;
  teardown = () => { countdown.stop(); if (prev) prev(); };
}

function showMockReport(id) {
  let m = id ? storage.findMock(id) : null;
  if (!m) {
    const live = settleMock(loadMock());
    if (live && !live.finished) return navigate('#/mock/run', { replace: true });
    const hist = storage.loadMockHistory();
    m = id ? storage.findMock(id) : hist[hist.length - 1];
  }
  if (!m) return mount(ui.renderError('No mock test report found. Start a mock test to get one.'), { title: 'Mock test report' });
  const puzzles = m.items.map((item) => safePuzzle(item));
  mount(ui.renderChallengeReport({ challenge: m, report: challenge.challengeReport(m), puzzles }), { title: 'Mock test report' });
}

// ---------------------------------------------------------------- mistake review

function sortedMistakes() {
  return storage.loadMistakes().slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function showReviewPuzzle(puzzleId) {
  const mistake = storage.findMistake(puzzleId);
  if (!mistake) return mount(ui.renderError('That mistake is no longer in your list (it may have been marked as understood).'), { title: 'Mistake review' });
  if (!savedPuzzle(mistake)) return mount(ui.renderReplayUnavailable(mistake, '#/results/mistakes'), { title: 'Question unavailable' });
  const spec = { family: mistake.family, difficulty: mistake.difficulty, seed: mistake.seed };
  let s = session.startPuzzle({ mode: 'review', spec, original: mistake });
  const render = ({ focus } = {}) => {
    const handlers = {
      onSelect: (i) => { session.selectOption(s, i); ui.setSelectedOption(app, s.selected); },
      onSubmit: () => {
        if (s.selected == null) {
          const msg = app.querySelector('.submit-msg');
          if (msg) msg.textContent = 'Choose one of the options first.';
          document.getElementById('opt-0')?.focus();
          return;
        }
        const attempt = session.submitAnswer(s);
        if (!attempt) return;
        recordAttempt(s.puzzle, attempt, { addMistake: false });
        render({ focus: 'feedback' });
        ui.announce(attempt.correct ? 'Correct this time.' : `Not quite. The correct answer is option ${s.puzzle.correctIndex + 1}.`);
      },
      onReveal: () => { session.revealSolution(s); render({ focus: 'feedback' }); ui.announce(`Solution revealed. The correct answer is option ${s.puzzle.correctIndex + 1}.`); },
      onNext: () => { s = session.startPuzzle({ mode: 'review', spec, original: mistake }); render({ focus: 'title' }); ui.announce('Puzzle reset.'); },
      onUnderstood: () => { storage.removeMistake(puzzleId); navigate('#/results/mistakes'); ui.announce('Marked as understood.'); },
    };
    const model = {
      puzzle: s.puzzle,
      mode: 'review',
      heading: 'Mistake review',
      note: `From ${ui.formatDate(mistake.at)}`,
      selected: s.selected,
      answered: s.answered,
      revealed: s.revealed,
      hintsUsed: 0,
      showHints: false,
      original: mistake,
    };
    mount(ui.renderPuzzleScreen(model, handlers), { title: 'Mistake review', focusTitle: focus !== 'feedback' });
    if (focus === 'feedback') ui.focusEl(document.getElementById('feedback-title'));
    installNumberKeys(() => (s.answered || s.revealed ? null : { select: handlers.onSelect }));
  };
  render({ focus: 'title' });
}

// ---------------------------------------------------------------- progress / settings

function showResults(parts) {
  const tab = parts[0] || 'progress';
  if (tab === 'mistakes') {
    const render = () => mount(ui.renderResults({ tab, body: ui.renderReviewList({ mistakes: sortedMistakes(), embedded: true }, {
      onUnderstood: (puzzleId) => { storage.removeMistake(puzzleId); render(); ui.announce('Marked as understood and removed from the list.'); },
    }) }), { title: 'Results – mistakes' });
    return render();
  }
  if (tab === 'reports') {
    return mount(ui.renderResults({ tab, body: ui.renderReportsList({ challenges: storage.loadChallengeHistory(), mocks: storage.loadMockHistory() }) }), { title: 'Results – reports' });
  }
  const attempts = storage.loadAttempts();
  const groups = byGroup(attempts);
  const ranked = groups.filter((g) => g.attempted >= 3).sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1));
  const weakest = ranked[0] || null;
  const onDrill = (groupId) => {
    storage.saveSettings({ practiceFamily: `group:${groupId}`, practiceDifficulty: 'mixed', practiceClock: '45', practiceHints: false });
    practiceSessions.guided = null; practiceSessions.untimed = null;
    navigate('#/practice');
    ui.announce('Practice set to your weak spot with a 45-second clock.');
  };
  mount(ui.renderResults({ tab: 'progress', body: ui.renderProgress({ overall: summarise(attempts), groups, difficulties: byDifficulty(attempts), weakest, embedded: true }, { onDrill }) }), { title: 'Results – progress' });
}

function showSettings() {
  let confirming = false;
  const render = ({ focusId } = {}) => {
    mount(ui.renderSettings({ settings: storage.loadSettings(), adaptive: storage.loadAdaptive(), storageOk: storage.storageAvailable(), confirming }, {
      onPersonalise: (on) => {
        const settings = storage.loadSettings();
        storage.saveSettings({ personalise: on });
        if (on) {
          const level = settings.practiceDifficulty === 'mixed' ? storage.loadAdaptive().level : Number(settings.practiceDifficulty);
          storage.saveAdaptive({ ...storage.DEFAULT_ADAPTIVE, level });
        }
        practiceSessions.guided = null;
        practiceSessions.untimed = null;
        ui.announce(on ? 'Practice personalisation on.' : 'Practice personalisation off.');
      },
      onResetStart: () => { confirming = true; render({ focusId: 'reset-confirm' }); },
      onResetCancel: () => { confirming = false; render({ focusId: 'reset-btn' }); },
      onResetConfirm: () => {
        storage.clearAll();
        timed = null;
        chal = null;
        mockState = null;
        practiceSessions.guided = null;
        practiceSessions.untimed = null;
        confirming = false;
        render({ focusId: 'reset-btn' });
        ui.announce('All local data has been deleted.');
      },
    }), { title: 'Settings', focusTitle: !focusId });
    if (focusId) ui.focusEl(document.getElementById(focusId));
  };
  render();
}

// ---------------------------------------------------------------- boot

// Only hashes of the form "#/..." are routes. A plain in-page anchor such as the skip link's "#app"
// must keep the current screen and just move focus.
function onHashChange() {
  if (location.hash && !location.hash.startsWith('#/')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) { target.setAttribute('tabindex', '-1'); target.focus(); }
    history.replaceState(null, '', lastRouteHash || '#/');
    return;
  }
  lastRouteHash = location.hash;
  route();
}
window.addEventListener('hashchange', onHashChange);
document.querySelector('.skip-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  const target = document.getElementById('app');
  if (target) { target.setAttribute('tabindex', '-1'); target.focus(); }
});
if (!location.hash || !location.hash.startsWith('#/')) history.replaceState(null, '', '#/');
route();
