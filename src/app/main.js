// Entry point: hash router and controllers. Wires session state (session.js), persistence (storage.js)
// and rendering (ui.js) together. Puzzle logic never lives here; the engine is only asked to generate.
import { generatePuzzle } from '../engine/index.js';
import { INTRO_STEPS, PRODUCT_NAME } from './content.js';
import * as storage from './storage.js';
import * as session from './session.js';
import * as ui from './ui.js';
import { createCountdown } from './timer.js';
import * as challenge from './challenge.js';
import { summarise, byGroup, byDifficulty, formatClock } from './stats.js';

const app = document.getElementById('app');
const nav = document.querySelector('.site-nav');

// ---------------------------------------------------------------- routing

let lastRouteHash = '#/';

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return parts;
}

function navigate(hash, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) route();
}

const ROUTES = {
  '': showHome,
  intro: showIntro,
  guided: () => showPractice('guided'),
  practice: () => showPractice('untimed'),
  timed: showTimed,
  review: showReview,
  progress: showProgress,
  settings: showSettings,
  about: showAbout,
  challenge: showChallenge,
};

let teardown = null; // cleanup for the active screen (timers, listeners)

function mount(element, { title, focusTitle = true } = {}) {
  if (teardown) { teardown(); teardown = null; }
  ui.clear(app);
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
    const active = target === top;
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
    storage.upsertMistake(session.makeMistake(puzzle, { chosenIndex: attempt.chosenIndex, at: Date.parse(attempt.at), mode: attempt.mode }));
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

function showIntro() {
  const examples = INTRO_STEPS.map((step) => {
    if (!step.example) return null;
    try { return generatePuzzle(step.example); } catch { return null; }
  });
  mount(ui.renderIntro({ examples }), { title: 'Learn the basics' });
}

function showAbout() {
  mount(ui.renderAbout(), { title: 'About' });
}

// ---------------------------------------------------------------- guided / untimed practice

const practiceSessions = { guided: null, untimed: null };

function showPractice(mode) {
  const settings = storage.loadSettings();
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
  const model = {
    puzzle: s.puzzle,
    mode,
    heading: mode === 'guided' ? 'Guided practice' : 'Untimed practice',
    selected: s.selected,
    answered: s.answered,
    revealed: s.revealed,
    hintsUsed: s.hintsUsed,
    showHints: mode === 'guided',
    bar,
  };
  mount(ui.renderPuzzleScreen(model, handlers), { title: model.heading, focusTitle: focus === 'title' });
  if (focus === 'feedback') ui.focusEl(document.getElementById('feedback-title'));
  if (focus === 'hint') ui.focusEl(document.getElementById('hint-btn') || document.getElementById('reveal-btn'));
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
  const settings = storage.loadSettings();
  mount(ui.renderTimedSetup({ settings, resumable }, {
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
        if (msg) msg.textContent = 'Choose one of the six options first, or skip.';
        document.getElementById('opt-0')?.focus();
        return;
      }
      const attempt = session.timedAnswer(t, selected);
      if (attempt) recordAttempt(puzzle, attempt);
      advance('Answer recorded.');
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
  const puzzle = session.puzzleFor(item);
  const model = {
    puzzle,
    mode: 'summary',
    heading: `Review puzzle ${index + 1} of ${t.items.length}`,
    answered: { chosenIndex: item.chosenIndex, correct: item.correct, ms: item.ms },
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
      advance('Answer recorded.');
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
  const puzzles = c.items.map((item) => (item.difficulty == null ? null : session.puzzleFor(item)));
  mount(ui.renderChallengeReport({ challenge: c, report: challenge.challengeReport(c), puzzles }), { title: 'Challenge report' });
}

// ---------------------------------------------------------------- mistake review

function sortedMistakes() {
  return storage.loadMistakes().slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function showReview(parts) {
  const id = parts[0];
  if (id) return showReviewPuzzle(id);
  const render = () => mount(ui.renderReviewList({ mistakes: sortedMistakes() }, {
    onUnderstood: (puzzleId) => { storage.removeMistake(puzzleId); render(); ui.announce('Marked as understood and removed from the list.'); },
  }), { title: 'Mistake review' });
  render();
}

function showReviewPuzzle(puzzleId) {
  const mistake = storage.findMistake(puzzleId);
  if (!mistake) return mount(ui.renderError('That mistake is no longer in your list (it may have been marked as understood).'), { title: 'Mistake review' });
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
      onUnderstood: () => { storage.removeMistake(puzzleId); navigate('#/review'); ui.announce('Marked as understood.'); },
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

function showProgress() {
  const attempts = storage.loadAttempts();
  mount(ui.renderProgress({ overall: summarise(attempts), groups: byGroup(attempts), difficulties: byDifficulty(attempts) }), { title: 'Progress' });
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
if (!location.hash || !location.hash.startsWith('#/')) history.replaceState(null, '', '#/');
route();
