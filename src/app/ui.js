// DOM rendering for every screen. Pure "model in, element out"; event handlers are passed in by main.js.
// No session or storage logic lives here.
import { renderCell, renderMatrixPreview } from '../render/svg.js';
import { FAMILY_IDS, FAMILIES, GROUPS, DIFFICULTY_LABELS, ITEM_FAMILY_IDS, ITEM_FAMILIES, ITEM_GROUPS, ALL_GROUPS, familyInfo, markupToHtml } from '../engine/index.js';
import {
  PRODUCT_NAME, INDEPENDENCE_NOTICE, INTRO_STEPS, LEARN_TABS, ITEM_GUIDES, PRACTICE_MODES, TIMED_PRESETS,
  STATS_CAVEAT, PERSONALISATION_NOTE, LIMITATIONS, CHALLENGE_NOTE,
} from './content.js';
import { CHALLENGE_FORMATS, assessmentText } from './challenge.js';
import { MOCK_TIERS, MOCK_DEFAULTS } from './mocktest.js';
import { formatPercent, formatMs, formatClock, SMALL_SAMPLE } from './stats.js';
import { describeFilter } from './session.js';

// ---------------------------------------------------------------- tiny DOM helper

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) appendChildren(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Announce a short message through the persistent polite live region. */
export function announce(text) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  // A tick later so repeated identical messages are still announced.
  setTimeout(() => { live.textContent = text; }, 30);
}

export function focusEl(el) {
  if (!el) return;
  if (!el.hasAttribute('tabindex') && !/^(a|button|input|select|textarea)$/i.test(el.tagName)) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: false }); } catch { /* ignore */ }
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function link(href, text, cls = 'btn') {
  return h('a', { class: cls, href }, text);
}

function screenTitle(text) {
  return h('h1', { id: 'screen-title', tabindex: '-1' }, text);
}

// ---------------------------------------------------------------- shared select controls

export function familySelect({ id, value, onChange }) {
  const sel = h('select', { id, class: 'select', onChange: (e) => onChange(e.target.value) });
  sel.appendChild(h('option', { value: 'everything' }, 'Everything (matrices and other question types)'));
  sel.appendChild(h('option', { value: 'all' }, 'All matrix families'));
  for (const [gid, g] of Object.entries(GROUPS)) {
    const og = h('optgroup', { label: `Matrices: ${g.label}` });
    og.appendChild(h('option', { value: `group:${gid}` }, `All of: ${g.label}`));
    for (const fid of FAMILY_IDS) if (FAMILIES[fid].group === gid) og.appendChild(h('option', { value: fid }, FAMILIES[fid].label));
    sel.appendChild(og);
  }
  const og2 = h('optgroup', { label: 'Other question types' });
  og2.appendChild(h('option', { value: 'items' }, 'All other question types'));
  for (const fid of ITEM_FAMILY_IDS) og2.appendChild(h('option', { value: fid }, ITEM_FAMILIES[fid].label));
  sel.appendChild(og2);
  sel.value = value || 'all';
  return sel;
}

export function difficultySelect({ id, value, onChange }) {
  const sel = h('select', { id, class: 'select', onChange: (e) => onChange(e.target.value) });
  sel.appendChild(h('option', { value: 'mixed' }, 'Mixed (1–6)'));
  for (const d of [1, 2, 3, 4, 5, 6]) sel.appendChild(h('option', { value: String(d) }, `${d} – ${DIFFICULTY_LABELS[d]}`));
  sel.value = String(value ?? 'mixed');
  return sel;
}

// ---------------------------------------------------------------- home

export function renderHome({ samplePuzzle }) {
  const cards = [
    { href: '#/intro', title: 'Learn', blurb: 'Short guides with worked examples: reading matrices, then number series, logic, arithmetic, verbal items and word problems.' },
    { href: '#/practice', title: 'Practise', blurb: 'Any question type, any of six levels, at your own pace. Hints on or off; a full explanation after every answer.' },
    { href: '#/test', title: 'Test', blurb: 'Three formats: a mock test on one clock, an adaptive challenge that steps up and down with you, or a quick timed drill.' },
    { href: '#/results', title: 'Results', blurb: 'Progress by rule group and level, your mistakes to retry, and every past test report.' },
  ];
  return h('section', { class: 'screen home' },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-text' },
        screenTitle(PRODUCT_NAME),
        h('p', { class: 'pitch' }, 'Practise abstract matrix puzzles, and the number, logic, arithmetic and verbal questions that sit beside them in aptitude tests, with the rule behind every answer explained.'),
        h('p', { class: 'notice', id: 'independence-notice' }, INDEPENDENCE_NOTICE),
        h('div', { class: 'hero-actions' },
          link('#/practice', 'Start practising', 'btn btn-primary btn-lg'),
          link('#/test', 'Take a test', 'btn btn-lg'),
        ),
      ),
      h('figure', { class: 'sample' },
        h('div', { class: 'sample-preview cell', html: renderMatrixPreview(samplePuzzle, { cellSize: 64, gap: 6 }) }),
        h('figcaption', null, `Sample puzzle: ${samplePuzzle.familyLabel}, ${samplePuzzle.difficultyLabel.toLowerCase()}. Which figure fills the gap?`),
      ),
    ),
    h('nav', { class: 'mode-grid mode-grid-4', 'aria-label': 'Sections' },
      cards.map((c) => h('a', { class: 'card', href: c.href },
        h('span', { class: 'card-title' }, c.title),
        h('span', { class: 'card-blurb' }, c.blurb),
      )),
    ),
  );
}

// ---------------------------------------------------------------- intro

export function learnTabs(current) {
  return h('nav', { class: 'tabs', 'aria-label': 'Learn sections' },
    LEARN_TABS.map((t) => h('a', { href: t.id === 'matrices' ? '#/intro' : `#/intro/${t.id}`, class: `tab${t.id === current ? ' is-current' : ''}`, 'aria-current': t.id === current ? 'page' : null }, t.label)),
  );
}

/** Matrices tab: the numbered method steps, each with a generated example. */
export function renderIntro({ examples }) {
  return h('section', { class: 'screen intro' },
    screenTitle('Learn'),
    learnTabs('matrices'),
    h('p', { class: 'lead' }, 'Each matrix puzzle is a 3×3 grid. One or more rules run across the rows, down the columns or over the whole grid; the bottom-right cell is missing and one of six options completes it. Eight habits cover almost every puzzle.'),
    h('ol', { class: 'intro-steps' },
      INTRO_STEPS.map((step, i) => h('li', { class: 'intro-step' },
        h('div', { class: 'intro-text' },
          h('h2', null, step.title),
          h('div', { class: 'intro-body', html: step.body }),
        ),
        examples[i] ? h('figure', { class: 'intro-example' },
          h('div', { class: 'sample-preview cell', html: renderMatrixPreview(examples[i], { cellSize: 52, gap: 5 }) }),
          h('figcaption', null, `Example: ${examples[i].familyLabel} (${examples[i].difficultyLabel.toLowerCase()})`),
        ) : null,
      )),
    ),
    h('div', { class: 'actions' },
      link('#/practice', 'Start practising', 'btn btn-primary'),
      link('#/intro/series', 'Next: number series', 'btn'),
    ),
  );
}

/** A worked non-matrix example: question, prompt, options with the answer marked, and the explanation. */
function itemExample(item) {
  return h('figure', { class: 'intro-item' },
    h('p', { class: 'intro-item-question' }, `${item.question} `, h('span', { class: 'tag' }, `${item.familyLabel}, ${item.difficultyLabel.toLowerCase()}`)),
    renderPrompt(item),
    h('ol', { class: 'intro-item-options', 'aria-label': 'Options' },
      item.options.map((o, i) => h('li', { class: i === item.correctIndex ? 'is-answer' : null },
        h('span', { class: 'option-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', { html: markupToHtml(o) }),
        i === item.correctIndex ? h('span', { class: 'visually-hidden' }, ' (correct)') : null,
      )),
    ),
    h('figcaption', { class: 'intro-item-why' },
      h('strong', null, `Answer: option ${item.correctIndex + 1}. `),
      item.explanation.summary ? `${item.explanation.summary} ` : '',
      (item.explanation.steps || []).join(' '),
    ),
  );
}

/** One non-matrix guide tab: lead, method steps, traps, worked examples, and a button that sets Practise to it. */
export function renderItemGuide({ tab, guide, examples }, { onPractise }) {
  const next = LEARN_TABS[(LEARN_TABS.findIndex((t) => t.id === tab) + 1) % LEARN_TABS.length];
  return h('section', { class: 'screen intro' },
    screenTitle('Learn'),
    learnTabs(tab),
    h('h2', { class: 'intro-guide-title' }, guide.title),
    h('p', { class: 'lead' }, guide.lead),
    h('ol', { class: 'intro-steps' },
      guide.steps.map((step) => h('li', { class: 'intro-step is-text' },
        h('div', { class: 'intro-text' }, h('h3', null, step.title), h('div', { class: 'intro-body', html: step.body })),
      )),
    ),
    h('p', { class: 'intro-traps' }, h('strong', null, 'Common traps: '), guide.traps),
    h('h3', null, 'Worked examples'),
    h('div', { class: 'intro-item-grid' }, examples.filter(Boolean).map(itemExample)),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onClick: () => onPractise(guide.practise) }, `Practise ${guide.title.toLowerCase()}`),
      link(next.id === 'matrices' ? '#/intro' : `#/intro/${next.id}`, `Next: ${next.label.toLowerCase()}`, 'btn'),
    ),
  );
}

// ---------------------------------------------------------------- practice settings bar

export function renderPracticeBar({ settings, adaptive, onFamily, onDifficulty, onHints, onClock }) {
  const bar = h('form', { class: 'practice-bar', onSubmit: (e) => e.preventDefault() },
    h('div', { class: 'field' },
      h('label', { for: 'family-filter' }, 'Question type'),
      familySelect({ id: 'family-filter', value: settings.practiceFamily, onChange: onFamily }),
    ),
    h('div', { class: 'field' },
      h('label', { for: 'difficulty-filter' }, settings.personalise ? 'Starting level' : 'Level'),
      difficultySelect({ id: 'difficulty-filter', value: settings.practiceDifficulty, onChange: onDifficulty }),
    ),
    h('div', { class: 'field' },
      h('label', { for: 'clock-select' }, 'Clock'),
      (() => {
        const sel = h('select', { id: 'clock-select', class: 'select', onChange: (e) => onClock(e.target.value) },
          h('option', { value: 'off' }, 'Off (take your time)'),
          h('option', { value: '90' }, '90 s per question'),
          h('option', { value: '60' }, '60 s per question'),
          h('option', { value: '45' }, '45 s per question'),
          h('option', { value: '30' }, '30 s per question'),
        );
        sel.value = settings.practiceClock || 'off';
        return sel;
      })(),
    ),
    h('div', { class: 'field field-check' },
      h('span', { class: 'field-label-text', 'aria-hidden': 'true' }, 'Help'),
      h('label', { class: 'check-inline', for: 'hints-toggle' },
        h('input', { type: 'checkbox', id: 'hints-toggle', checked: settings.practiceHints !== false ? '' : null, onChange: (e) => onHints(e.target.checked) }),
        ' Hints',
      ),
    ),
  );
  if (settings.personalise) {
    bar.appendChild(h('p', { class: 'bar-note' },
      h('strong', null, 'Personalisation on. '),
      `Current level ${adaptive.level} (${DIFFICULTY_LABELS[adaptive.level]}); ${adaptive.correctStreak} correct in a row. `,
      h('a', { href: '#/settings' }, 'How this works'),
    ));
  }
  return bar;
}

// ---------------------------------------------------------------- puzzle screen

const OPTION_NUMBERS = ['1', '2', '3', '4', '5', '6'];

function isDone(model) {
  if (model.mode === 'mock') return false;
  return model.mode === 'summary' || model.revealed || (model.answered != null && model.mode !== 'timed');
}

function matrixCell(puzzle, i, done) {
  const inRow3 = i >= 6;
  const inCol3 = i % 3 === 2;
  const cls = ['cell', 'matrix-cell'];
  if (done && (inRow3 || inCol3)) cls.push('is-highlight');
  if (i === 8) cls.push(done ? 'is-filled' : 'is-gap');
  if (i === 8 && !done) {
    return h('div', { class: cls.join(' '), role: 'img', 'aria-label': 'Missing cell: choose the option that completes the pattern' },
      h('span', { class: 'gap-mark', 'aria-hidden': 'true' }, '?'));
  }
  const cell = puzzle.cells[i];
  const label = i === 8 ? `Missing cell, now filled with the correct answer: ${puzzle.description.options[puzzle.correctIndex]}` : puzzle.description.cells[i];
  return h('div', { class: cls.join(' '), html: renderCell(cell, { size: 100, label }) });
}

export function renderMatrix(puzzle, { done = false, idPrefix = 'matrix' } = {}) {
  const descId = `${idPrefix}-desc`;
  const wrap = h('div', { class: 'matrix-wrap' },
    h('p', { class: 'visually-hidden', id: descId }, puzzle.description.matrix),
    h('div', { class: `matrix${done ? ' is-done' : ''}`, role: 'group', 'aria-label': done ? 'Completed puzzle matrix; row 3 and column 3 highlighted' : 'Puzzle matrix', 'aria-describedby': descId },
      Array.from({ length: 9 }, (_, i) => matrixCell(puzzle, i, done)),
    ),
  );
  if (done) wrap.appendChild(h('p', { class: 'matrix-caption' }, 'Completed matrix. Row 3 and column 3 are highlighted: read along them to see how the answer follows.'));
  return wrap;
}

function optionButton(puzzle, i, model, handlers, done) {
  const chosen = model.answered?.chosenIndex;
  const isCorrect = i === puzzle.correctIndex;
  const cls = ['option', 'cell'];
  const selected = !done && model.selected === i;
  if (selected) cls.push('is-selected');
  if (done) {
    if (isCorrect) cls.push('is-correct');
    if (chosen === i && !isCorrect) cls.push('is-wrong');
    if (model.original && model.original.chosenIndex === i && !isCorrect) cls.push('is-original');
  }
  let status = '';
  if (done) {
    if (isCorrect) status = 'Correct answer';
    else if (chosen === i) status = 'Your answer';
    else if (model.original && model.original.chosenIndex === i) status = 'Your earlier answer';
  }
  const labelParts = [`Option ${i + 1}: ${puzzle.description.options[i]}`];
  if (status) labelParts.push(status);
  const tabbable = done ? i === 0 : (model.selected == null ? i === 0 : model.selected === i);
  const btn = h('button', {
    type: 'button',
    class: cls.join(' '),
    id: `opt-${i}`,
    role: 'radio',
    'aria-checked': selected ? 'true' : 'false',
    'aria-disabled': done ? 'true' : null,
    'aria-label': labelParts.join('. '),
    tabindex: tabbable ? '0' : '-1',
    dataset: { index: String(i) },
    onClick: () => { if (!done) handlers.onSelect(i); },
    onKeydown: (e) => optionKeydown(e, i, model, handlers, done),
  },
    h('span', { class: 'option-num', 'aria-hidden': 'true' }, OPTION_NUMBERS[i]),
    puzzle.kind === 'item'
      ? h('span', { class: 'option-text', html: markupToHtml(puzzle.options[i]) })
      : h('span', { class: 'option-fig', html: renderCell(puzzle.options[i], { size: 100 }) }),
    status ? h('span', { class: 'option-status', 'aria-hidden': 'true' }, status) : null,
  );
  if (puzzle.kind === 'item') btn.classList.add('option-item');
  return btn;
}

function optionKeydown(e, i, model, handlers, done) {
  const group = e.currentTarget.closest('.options');
  const n = group.querySelectorAll('.option').length || 6;
  const move = (to) => {
    const idx = ((to % n) + n) % n;
    const target = group.querySelector(`#opt-${idx}`);
    if (!done) handlers.onSelect(idx);
    target?.focus();
  };
  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': e.preventDefault(); move(i + 1); break;
    case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); move(i - 1); break;
    case 'Home': e.preventDefault(); move(0); break;
    case 'End': e.preventDefault(); move(n - 1); break;
    case ' ': e.preventDefault(); if (!done) handlers.onSelect(i); break;
    case 'Enter':
      e.preventDefault();
      if (done) break;
      // Compare against the live DOM state: the model snapshot is stale after in-place selection updates.
      if (e.currentTarget.getAttribute('aria-checked') === 'true') handlers.onSubmit();
      else handlers.onSelect(i);
      break;
    default: break;
  }
}

/** Update the option group in place after a selection change (keeps focus and avoids a re-render). */
export function setSelectedOption(root, index) {
  root.querySelectorAll('.option').forEach((btn) => {
    const i = Number(btn.dataset.index);
    const on = i === index;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.setAttribute('tabindex', on || (index == null && i === 0) ? '0' : '-1');
  });
  const msg = root.querySelector('.submit-msg');
  if (msg) msg.textContent = '';
}

function hintsPanel(model, handlers) {
  const { puzzle } = model;
  const total = puzzle.hints.length;
  const used = model.hintsUsed;
  const panel = h('div', { class: 'hints' });
  if (used > 0) {
    panel.appendChild(h('ol', { class: 'hint-list', 'aria-label': 'Hints shown' },
      puzzle.hints.slice(0, used).map((text, k) => h('li', null, h('strong', null, `Hint ${k + 1} of ${total}. `), text)),
    ));
  }
  if (used < total) {
    panel.appendChild(h('button', { type: 'button', class: 'btn', id: 'hint-btn', onClick: handlers.onHint },
      used === 0 ? `Show a hint (${total} available)` : `Show the next hint (${used} of ${total} shown)`));
  } else {
    panel.appendChild(h('p', { class: 'hint-done' }, `All ${total} hints shown.`));
    panel.appendChild(h('button', { type: 'button', class: 'btn', id: 'reveal-btn', onClick: handlers.onReveal }, 'Reveal solution'));
  }
  return panel;
}

function explanationBlock(puzzle, chosenIndex, original) {
  const ex = puzzle.explanation;
  const items = (arr) => h('ul', null, (arr || []).map((s) => h('li', null, s)));
  const block = puzzle.kind === 'item'
    ? h('div', { class: 'explanation' },
        ex.summary ? h('p', { class: 'explanation-summary' }, ex.summary) : null,
        h('h3', null, 'Why'), items(ex.steps),
      )
    : h('div', { class: 'explanation' },
        ex.summary ? h('p', { class: 'explanation-summary' }, ex.summary) : null,
        h('h3', null, 'Across each row'), items(ex.rows),
        h('h3', null, 'Down each column'), items(ex.columns),
        h('h3', null, 'How the missing cell follows'), items(ex.missing),
        ex.unchanged ? h('p', { class: 'explanation-unchanged' }, ex.unchanged) : null,
      );
  const d = chosenIndex != null ? puzzle.distractors[chosenIndex] : null;
  if (d) block.appendChild(h('p', { class: 'distractor-note' }, h('strong', null, `Why option ${chosenIndex + 1} is tempting: `), `it ${d.text}.`));
  if (original && original.chosenIndex != null && original.chosenIndex !== chosenIndex) {
    const od = puzzle.distractors[original.chosenIndex];
    block.appendChild(h('p', { class: 'distractor-note is-original' },
      h('strong', null, `Earlier you chose option ${original.chosenIndex + 1}${original.at ? ` (${formatDate(original.at)})` : ''}. `),
      od ? `Why it is tempting: it ${od.text}.` : 'That was the correct answer.'));
  }
  return block;
}

function feedbackPanel(model, handlers) {
  const { puzzle, answered, original } = model;
  const correctNo = puzzle.correctIndex + 1;
  let title;
  let cls = 'feedback-title';
  let line;
  if (model.revealed) {
    title = 'Solution revealed';
    line = `The correct answer is option ${correctNo}.`;
  } else if (answered && answered.chosenIndex == null) {
    title = answered.timedOut ? 'Time ran out' : 'Not answered';
    line = answered.timedOut
      ? `You did not answer in time; it counts as a mistake. The correct answer is option ${correctNo}.`
      : `You did not answer this puzzle, so it is not counted. The correct answer is option ${correctNo}.`;
  } else if (answered?.correct) {
    title = 'Correct';
    cls += ' is-correct';
    line = `Option ${correctNo} is correct${answered.ms != null ? ` (answered in ${formatMs(answered.ms)})` : ''}.`;
  } else {
    title = 'Not quite';
    cls += ' is-wrong';
    line = `You chose option ${answered.chosenIndex + 1}; the correct answer is option ${correctNo}${answered.ms != null ? ` (answered in ${formatMs(answered.ms)})` : ''}.`;
  }
  const chosenIndex = answered?.chosenIndex ?? null;
  const panel = h('section', { class: 'feedback', 'aria-labelledby': 'feedback-title' },
    h('h2', { id: 'feedback-title', class: cls, tabindex: '-1' }, title),
    h('p', { class: 'feedback-line' }, line),
    explanationBlock(puzzle, chosenIndex, original),
  );
  const actions = h('div', { class: 'actions' });
  if (model.mode === 'review') {
    actions.appendChild(h('button', { type: 'button', class: 'btn btn-primary', onClick: handlers.onUnderstood }, 'Mark as understood'));
    actions.appendChild(h('button', { type: 'button', class: 'btn', onClick: handlers.onNext }, 'Try again from scratch'));
    actions.appendChild(link('#/results/mistakes', 'Back to mistake list'));
  } else if (model.mode === 'summary') {
    actions.appendChild(link('#/timed/summary', 'Back to session summary', 'btn btn-primary'));
    if (model.prevHref) actions.appendChild(link(model.prevHref, 'Previous puzzle'));
    if (model.nextHref) actions.appendChild(link(model.nextHref, 'Next puzzle'));
  } else {
    actions.appendChild(h('button', { type: 'button', class: 'btn btn-primary', id: 'next-btn', onClick: handlers.onNext }, 'Next puzzle'));
  }
  panel.appendChild(actions);
  return panel;
}

/**
 * The shared puzzle screen. model = { puzzle, mode, heading, meta, progress, selected, answered, revealed,
 * hintsUsed, showHints, original, showCountdown, canSkip, prevHref, nextHref }.
 */
export function renderPuzzleScreen(model, handlers) {
  const { puzzle } = model;
  const done = isDone(model);
  const root = h('section', { class: 'screen puzzle-screen', dataset: { mode: model.mode } });

  const head = h('header', { class: 'puzzle-head' },
    h('div', null,
      screenTitle(model.heading),
      h('p', { class: 'puzzle-meta' },
        h('span', { class: 'tag' }, puzzle.familyLabel),
        h('span', { class: 'tag' }, `Level ${puzzle.difficulty}: ${puzzle.difficultyLabel}`),
        model.progress ? h('span', { class: 'tag tag-progress' }, model.progress) : null,
        model.note ? h('span', { class: 'tag' }, model.note) : null,
      ),
    ),
  );
  if (model.showCountdown) {
    head.appendChild(h('div', { class: 'countdown-wrap' },
      h('p', { class: 'countdown', role: 'timer', id: 'countdown', 'aria-label': model.countdownLabel || 'Time remaining' }, '–:––'),
      model.hideEndEarly ? null : h('button', {
        type: 'button', class: 'btn btn-small', id: 'end-early', 'aria-describedby': 'end-early-help',
        onClick: (ev) => {
          // Two presses are needed so a stray Enter cannot discard a session.
          const b = ev.currentTarget;
          if (b.dataset.armed === '1') { handlers.onStop(); return; }
          b.dataset.armed = '1';
          b.textContent = 'Press again to end';
          b.classList.add('btn-danger');
          const help = document.getElementById('end-early-help');
          if (help) help.textContent = 'Press again to end the session now. Move away to keep going.';
          b.addEventListener('blur', () => {
            b.dataset.armed = '';
            b.textContent = 'End session early';
            b.classList.remove('btn-danger');
            if (help) help.textContent = '';
          }, { once: true });
        },
      }, 'End session early'),
      model.hideEndEarly ? null : h('span', { id: 'end-early-help', class: 'visually-hidden', 'aria-live': 'polite' }),
    ));
  }
  root.appendChild(head);
  if (model.bar) root.appendChild(model.bar);

  const nOpts = puzzle.options.length;
  const isItem = puzzle.kind === 'item';
  const options = h('div', { class: `options${isItem ? ' options-text' : ''}`, role: 'radiogroup', 'aria-label': `Answer options. Use arrow keys or the number keys 1 to ${nOpts} to choose, Enter to submit` },
    Array.from({ length: nOpts }, (_, i) => optionButton(puzzle, i, model, handlers, done)),
  );
  const optionsWrap = h('div', { class: 'options-wrap' },
    h('h2', { class: 'options-title' }, done ? 'Options' : isItem ? puzzle.question : 'Which option completes the pattern?'),
    options,
  );
  if (!done && model.mode === 'mock') {
    const m = model.mock;
    const nav = h('div', { class: 'mock-nav' },
      h('button', { type: 'button', class: 'btn', id: 'prev-btn', disabled: m.index === 0 ? '' : null, onClick: handlers.onPrev }, 'Previous'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'submit-btn', disabled: m.index >= m.items.length - 1 ? '' : null, onClick: handlers.onNext }, 'Next'),
      h('button', { type: 'button', class: `btn btn-small${m.items[m.index].flagged ? ' is-flagged' : ''}`, id: 'flag-btn', 'aria-pressed': m.items[m.index].flagged ? 'true' : 'false', onClick: handlers.onFlag }, m.items[m.index].flagged ? 'Saved for later ✓' : 'Save this question for later'),
      h('button', { type: 'button', class: 'btn btn-small', id: 'finish-btn', onClick: (ev) => {
        const b = ev.currentTarget;
        if (b.dataset.armed === '1') { handlers.onFinish(); return; }
        b.dataset.armed = '1'; b.textContent = 'Press again to finish'; b.classList.add('btn-danger');
        b.addEventListener('blur', () => { b.dataset.armed = ''; b.textContent = 'I am finished'; b.classList.remove('btn-danger'); }, { once: true });
      } }, 'I am finished'),
    );
    const flagged = m.items.map((it, k) => (it.flagged ? k : -1)).filter((k) => k >= 0);
    const unanswered = m.items.map((it, k) => (it.chosenIndex == null ? k : -1)).filter((k) => k >= 0);
    const jump = h('select', { class: 'select mock-jump', 'aria-label': 'Jump to a question', onChange: (e) => { if (e.target.value !== '') handlers.onJump(Number(e.target.value)); } },
      h('option', { value: '' }, `Jump to… (${flagged.length} saved, ${unanswered.length} unanswered)`),
      flagged.length ? h('optgroup', { label: 'Saved for later' }, flagged.map((k) => h('option', { value: String(k) }, `Question ${k + 1}`))) : null,
      unanswered.length ? h('optgroup', { label: 'Unanswered' }, unanswered.map((k) => h('option', { value: String(k) }, `Question ${k + 1}`))) : null,
      h('optgroup', { label: 'All questions' }, m.items.map((it, k) => h('option', { value: String(k) }, `Question ${k + 1}${it.chosenIndex != null ? ' (answered)' : ''}`))),
    );
    optionsWrap.appendChild(nav);
    optionsWrap.appendChild(jump);
    optionsWrap.appendChild(h('p', { class: 'submit-msg', role: 'status' }));
  } else if (!done) {
    const actions = h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn btn-primary', id: 'submit-btn', onClick: handlers.onSubmit }, model.mode === 'timed' || model.mode === 'challenge' ? 'Submit and continue' : 'Check answer'),
      model.canSkip ? h('button', { type: 'button', class: 'btn', onClick: handlers.onSkip }, 'Skip (leave unanswered)') : null,
      model.mode === 'review' ? h('button', { type: 'button', class: 'btn', id: 'reveal-btn', onClick: handlers.onReveal }, 'Reveal solution') : null,
      model.mode === 'untimed' ? h('button', { type: 'button', class: 'btn', onClick: handlers.onNext }, 'Skip to next puzzle') : null,
    );
    optionsWrap.appendChild(actions);
    optionsWrap.appendChild(h('p', { class: 'submit-msg', role: 'status' }));
    if (model.showHints) optionsWrap.appendChild(hintsPanel(model, handlers));
  }

  root.appendChild(h('div', { class: `puzzle-layout${isItem ? ' puzzle-layout-item' : ''}` }, isItem ? renderPrompt(puzzle) : renderMatrix(puzzle, { done }), optionsWrap));
  if (done) root.appendChild(feedbackPanel(model, handlers));
  return root;
}

/** The question text of a non-matrix item (number series, logic, arithmetic, analogy). */
export function renderPrompt(puzzle) {
  const lines = String(puzzle.prompt).split('\n');
  return h('div', { class: 'prompt-wrap' },
    h('div', { class: 'prompt', role: 'group', 'aria-label': puzzle.description.prompt },
      lines.map((l) => h('p', { class: 'prompt-line', html: markupToHtml(l), 'aria-hidden': 'true' })),
    ),
  );
}

// ---------------------------------------------------------------- section switchers

/** Segmented control shown on every test-format screen. */
export function testSwitcher(current) {
  const items = [
    ['mock', '#/mock', 'Mock test', 'Fixed set, one clock, answer in any order'],
    ['challenge', '#/challenge', 'Adaptive challenge', 'One clock per question, level steps up and down'],
    ['timed', '#/timed', 'Timed drill', 'Pick a count and a time limit, review at the end'],
  ];
  return h('nav', { class: 'switcher', 'aria-label': 'Test format' },
    items.map(([id, href, label, blurb]) => h('a', { href, class: `switcher-item${id === current ? ' is-current' : ''}`, 'aria-current': id === current ? 'page' : null },
      h('span', { class: 'switcher-label' }, label),
      h('span', { class: 'switcher-blurb' }, blurb),
    )),
  );
}

export function resultsTabs(current) {
  const items = [['progress', '#/results', 'Progress'], ['mistakes', '#/results/mistakes', 'Mistakes'], ['reports', '#/results/reports', 'Reports']];
  return h('nav', { class: 'tabs', 'aria-label': 'Results sections' },
    items.map(([id, href, label]) => h('a', { href, class: `tab${id === current ? ' is-current' : ''}`, 'aria-current': id === current ? 'page' : null }, label)),
  );
}

export function renderResults({ tab, body }) {
  return h('section', { class: 'screen results' },
    screenTitle('Results'),
    resultsTabs(tab),
    body,
  );
}

export function renderReportsList({ challenges, mocks }) {
  const rows = [
    ...challenges.map((c) => ({ at: c.startedAt, href: `#/challenge/report/${c.id}`, title: `Adaptive challenge · ${(CHALLENGE_FORMATS[c.format] || CHALLENGE_FORMATS.matrix).label}`, score: `${c.items.filter((i) => i.correct).length} / ${c.items.length}` })),
    ...mocks.map((m) => ({ at: m.startedAt, href: `#/mock/report/${m.id}`, title: `Mock test · ${(MOCK_TIERS[m.tier] || MOCK_TIERS.mixed).label} · ${m.items.length} in ${m.minutes} min`, score: `${m.items.filter((i) => i.correct).length} / ${m.items.length}` })),
  ].sort((a, b) => b.at - a.at);
  if (!rows.length) return h('div', null, h('p', { class: 'empty' }, 'No test reports yet. Reports from mock tests and adaptive challenges appear here.'), h('p', null, link('#/test', 'Take a test', 'btn btn-primary')));
  return h('ul', { class: 'mistake-list' }, rows.map((r) => h('li', { class: 'mistake report-row' },
    h('div', { class: 'mistake-text' },
      h('span', { class: 'mistake-title' }, `${r.score} correct`),
      h('span', { class: 'mistake-meta' }, `${r.title} · ${formatDate(new Date(r.at).toISOString())}`),
    ),
    h('div', { class: 'mistake-actions' }, h('a', { class: 'btn btn-small', href: r.href }, 'Open report')),
  )));
}

// ---------------------------------------------------------------- timed setup and summary

export function renderTimedSetup({ settings, resumable, lastFinished = null }, handlers) {
  const state = { count: settings.timedCount, minutes: settings.timedMinutes, family: settings.timedFamily, difficulty: settings.timedDifficulty };
  const countInput = h('input', { type: 'number', id: 'timed-count', class: 'input', min: '5', max: '40', step: '1', value: String(state.count), required: true, inputmode: 'numeric' });
  const minInput = h('input', { type: 'number', id: 'timed-minutes', class: 'input', min: '1', max: '60', step: '1', value: String(state.minutes), required: true, inputmode: 'numeric' });
  const presetList = h('div', { class: 'preset-list', role: 'group', 'aria-label': 'Presets' },
    TIMED_PRESETS.map((p) => h('div', { class: 'preset' },
      h('button', { type: 'button', class: 'btn', onClick: () => { countInput.value = String(p.count); minInput.value = String(p.minutes); announce(`Preset applied: ${p.count} puzzles in ${p.minutes} minutes.`); countInput.focus(); } },
        p.id === 'twelve' ? `${p.label} — practice preset` : p.label),
      p.note ? h('p', { class: 'preset-note' }, p.note) : null,
    )),
  );
  const form = h('form', { class: 'timed-form', onSubmit: (e) => {
    e.preventDefault();
    const count = Math.min(40, Math.max(5, Math.round(Number(countInput.value) || 0)));
    const minutes = Math.min(60, Math.max(1, Math.round(Number(minInput.value) || 0)));
    countInput.value = String(count);
    minInput.value = String(minutes);
    handlers.onStart({ count, minutes, family: state.family, difficulty: state.difficulty });
  } },
    h('fieldset', null,
      h('legend', null, 'Presets'),
      presetList,
    ),
    h('fieldset', null,
      h('legend', null, 'Custom session'),
      h('div', { class: 'field-row' },
        h('div', { class: 'field' }, h('label', { for: 'timed-count' }, 'Puzzles (5–40)'), countInput),
        h('div', { class: 'field' }, h('label', { for: 'timed-minutes' }, 'Minutes (1–60)'), minInput),
        h('div', { class: 'field' }, h('label', { for: 'timed-family' }, 'Family'), familySelect({ id: 'timed-family', value: state.family, onChange: (v) => { state.family = v; } })),
        h('div', { class: 'field' }, h('label', { for: 'timed-difficulty' }, 'Difficulty'), difficultySelect({ id: 'timed-difficulty', value: state.difficulty, onChange: (v) => { state.difficulty = v; } })),
      ),
    ),
    h('div', { class: 'actions' },
      h('button', { type: 'submit', class: 'btn btn-primary' }, 'Start timed session'),
      link('#/', 'Back to home'),
    ),
  );
  const screen = h('section', { class: 'screen timed-setup' },
    screenTitle('Test'),
    testSwitcher('timed'),
    h('h2', null, 'Timed drill'),
    h('p', { class: 'lead' }, 'Answer as many puzzles as you can before the clock runs out. Feedback and explanations are shown in the summary at the end; unanswered puzzles count as unanswered, not as wrong.'),
  );
  if (!resumable && lastFinished) {
    const done = lastFinished.items.filter((i) => i.chosenIndex != null).length;
    screen.appendChild(h('p', { class: 'note' }, `Your last timed session ended${lastFinished.endedBy === 'time' ? ' when the clock ran out' : ''} (${done} of ${lastFinished.items.length} answered). `, h('a', { href: '#/timed/summary' }, 'View its summary')));
  }
  if (resumable) {
    screen.appendChild(h('div', { class: 'banner', role: 'region', 'aria-label': 'Unfinished session' },
      h('p', null, h('strong', null, 'You have an unfinished timed session. '), `${resumable.index} of ${resumable.count} puzzles done.`),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-primary', onClick: handlers.onResume }, 'Resume session'),
        h('button', { type: 'button', class: 'btn', onClick: handlers.onDiscard }, 'Discard it'),
      ),
    ));
  }
  screen.appendChild(form);
  return screen;
}

export function renderTimedSummary({ session, summary }) {
  const endedText = { completed: 'All puzzles answered or skipped.', time: 'Time ran out.', stopped: 'Ended early.' }[summary.endedBy] || '';
  const rows = session.items.map((item, i) => {
    const puzzle = { familyLabel: familyInfo(item.family)?.label || item.family, difficultyLabel: DIFFICULTY_LABELS[item.difficulty] };
    const result = item.chosenIndex == null ? 'Unanswered' : item.correct ? 'Correct' : 'Incorrect';
    const cls = item.chosenIndex == null ? 'is-unanswered' : item.correct ? 'is-correct' : 'is-wrong';
    return h('tr', null,
      h('td', null, String(i + 1)),
      h('td', null, puzzle.familyLabel),
      h('td', null, `${item.difficulty} – ${puzzle.difficultyLabel}`),
      h('td', null, h('span', { class: `result ${cls}` }, result)),
      h('td', null, formatMs(item.ms)),
      h('td', null, h('a', { href: `#/timed/summary/${i}`, class: 'btn btn-small' }, `Review`, h('span', { class: 'visually-hidden' }, ` puzzle ${i + 1}`))),
    );
  });
  return h('section', { class: 'screen timed-summary' },
    screenTitle('Session summary'),
    h('p', { class: 'lead' }, endedText),
    h('div', { class: 'stat-tiles' },
      statTile('Score', `${summary.correct} / ${summary.total}`, `${summary.wrong} incorrect, ${summary.unanswered} unanswered`),
      statTile('Accuracy of answered', formatPercent(summary.answered ? summary.correct / summary.answered : null), `${summary.answered} answered`),
      statTile('Time used', formatMs(summary.usedMs), `of ${session.minutes} min`),
    ),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'table' },
        h('caption', { class: 'visually-hidden' }, 'Per-puzzle results'),
        h('thead', null, h('tr', null, ['#', 'Family', 'Difficulty', 'Result', 'Time', 'Explanation'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, rows),
      ),
    ),
    h('div', { class: 'actions' },
      link('#/timed', 'New timed session', 'btn btn-primary'),
      link('#/results', 'See progress'),
      link('#/', 'Home'),
    ),
  );
}

function statTile(label, value, sub) {
  return h('div', { class: 'stat-tile' },
    h('span', { class: 'stat-label' }, label),
    h('span', { class: 'stat-value' }, value),
    sub ? h('span', { class: 'stat-sub' }, sub) : null,
  );
}

// ---------------------------------------------------------------- mistake review list

export function renderReviewList({ mistakes, embedded = false }, handlers) {
  const screen = h('section', { class: 'screen review-list' },
    embedded ? null : screenTitle('Mistake review'),
    h('p', { class: 'lead' }, 'Puzzles you answered incorrectly, most recent first. Each one is regenerated from its seed, so you can retry it, then read the explanation and see why your earlier choice was tempting.'),
  );
  if (!mistakes.length) {
    screen.appendChild(h('p', { class: 'empty' }, 'No mistakes stored yet. Mistakes from any mode appear here automatically.'));
    screen.appendChild(h('div', { class: 'actions' }, link('#/practice', 'Start practising', 'btn btn-primary'), link('#/', 'Home')));
    return screen;
  }
  screen.appendChild(h('ul', { class: 'mistake-list' },
    mistakes.map((m) => h('li', { class: 'mistake' },
      h('div', { class: 'mistake-text' },
        h('span', { class: 'mistake-title' }, `${familyInfo(m.family)?.label || m.family} · Level ${m.difficulty} (${DIFFICULTY_LABELS[m.difficulty] || ''})`),
        h('span', { class: 'mistake-meta' }, `${formatDate(m.at)} · ${ALL_GROUPS[m.group]?.label || ''}`),
      ),
      h('div', { class: 'mistake-actions' },
        h('a', { class: 'btn btn-primary btn-small', href: `#/review/${encodeURIComponent(m.puzzleId)}` }, 'Retry', h('span', { class: 'visually-hidden' }, ` ${familyInfo(m.family)?.label || m.family} from ${formatDate(m.at)}`)),
        h('button', { type: 'button', class: 'btn btn-small', onClick: () => handlers.onUnderstood(m.puzzleId) }, 'Mark as understood', h('span', { class: 'visually-hidden' }, ` ${familyInfo(m.family)?.label || m.family} from ${formatDate(m.at)}`)),
      ),
    )),
  ));
  return screen;
}

// ---------------------------------------------------------------- progress

function statsTable(caption, rows, { drill = false, onDrill = null } = {}) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table stats-table' },
      h('caption', null, caption),
      h('thead', null, h('tr', null, ['Category', 'Attempted', 'Accuracy', 'Median time', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, rows.map((r) => h('tr', { class: r.smallSample ? 'is-small' : null },
        h('th', { scope: 'row' }, r.label),
        h('td', null, String(r.attempted)),
        h('td', null,
          h('span', { class: 'bar', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: `width:${Math.round((r.accuracy || 0) * 100)}%` })),
          h('span', { class: 'bar-text' }, formatPercent(r.accuracy)),
        ),
        h('td', null, formatMs(r.medianMs)),
        h('td', { class: 'cell-actions' },
          r.smallSample ? h('span', { class: 'small-sample' }, r.attempted ? 'small sample' : 'no data') : null,
          drill ? h('button', { type: 'button', class: 'btn btn-small', onClick: () => onDrill(r.id) }, 'Drill', h('span', { class: 'visually-hidden' }, ` ${r.label}`)) : null,
        ),
      ))),
    ),
  );
}

export function renderProgress({ overall, groups, difficulties, weakest, embedded = false }, handlers = {}) {
  return h('section', { class: 'screen progress' },
    embedded ? null : screenTitle('Progress'),
    h('p', { class: 'lead caveat' }, STATS_CAVEAT, ` Rows with fewer than ${SMALL_SAMPLE} attempts are marked “small sample”.`),
    h('div', { class: 'stat-tiles' },
      statTile('Attempted', String(overall.attempted), overall.smallSample ? 'small sample' : ''),
      statTile('Overall accuracy', formatPercent(overall.accuracy), `${overall.correct} correct`),
      statTile('Median response time', formatMs(overall.medianMs), ''),
    ),
    weakest
      ? h('div', { class: 'banner' },
          h('p', null, h('strong', null, 'Weakest group: '), `${weakest.label} (${formatPercent(weakest.accuracy)} over ${weakest.attempted} attempts). `, 'A drill sets Practise to that group, mixed levels, with a 45-second clock.'),
          h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-primary', onClick: () => handlers.onDrill(weakest.id) }, 'Drill my weak spots')),
        )
      : null,
    statsTable('By rule group', groups, { drill: true, onDrill: handlers.onDrill || (() => {}) }),
    statsTable('By difficulty', difficulties),
    h('div', { class: 'actions' }, link('#/practice', 'Practise more', 'btn btn-primary'), link('#/', 'Home')),
  );
}

// ---------------------------------------------------------------- settings

export function renderSettings({ settings, adaptive, storageOk, confirming }, handlers) {
  const screen = h('section', { class: 'screen settings' },
    screenTitle('Settings'),
    h('section', { class: 'settings-block', 'aria-labelledby': 'personalise-title' },
      h('h2', { id: 'personalise-title' }, 'Practice personalisation'),
      h('div', { class: 'check-row' },
        h('input', { type: 'checkbox', id: 'personalise', checked: settings.personalise ? true : null, onChange: (e) => handlers.onPersonalise(e.target.checked) }),
        h('label', { for: 'personalise' }, 'Personalise guided and untimed practice (default: off)'),
      ),
      h('p', { class: 'note' }, PERSONALISATION_NOTE),
      h('p', { class: 'note-small' }, `“Recent” means your last 30 attempts. Current level: ${adaptive.level} (${DIFFICULTY_LABELS[adaptive.level]}). The “Starting level” control on the practice screen resets the level.`),
    ),
    h('section', { class: 'settings-block', 'aria-labelledby': 'storage-title' },
      h('h2', { id: 'storage-title' }, 'Local data'),
      h('p', { class: 'note' }, storageOk
        ? 'Attempts, mistakes, settings and any unfinished timed session, challenge or mock test are stored in this browser only (localStorage keys starting with “mrt.”). No data leaves your browser.'
        : 'Browser storage is unavailable, so nothing persists between page loads. The app still works for this visit.'),
      confirming
        ? h('div', { class: 'banner banner-danger', role: 'region', 'aria-label': 'Confirm reset' },
          h('p', null, h('strong', null, 'Delete all local data? '), 'This clears your attempt history, mistakes, settings, past reports and any unfinished timed session, challenge or mock test. It cannot be undone.'),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-danger', id: 'reset-confirm', onClick: handlers.onResetConfirm }, 'Yes, delete everything'),
            h('button', { type: 'button', class: 'btn', onClick: handlers.onResetCancel }, 'Cancel'),
          ))
        : h('button', { type: 'button', class: 'btn btn-danger', id: 'reset-btn', onClick: handlers.onResetStart }, 'Reset all local data'),
    ),
    h('div', { class: 'actions' }, link('#/about', 'About and limitations'), link('#/', 'Home')),
  );
  return screen;
}

// ---------------------------------------------------------------- about

export function renderAbout() {
  return h('section', { class: 'screen about' },
    screenTitle('About'),
    h('p', { class: 'notice' }, INDEPENDENCE_NOTICE),
    h('h2', null, 'How it works'),
    h('p', null, 'Every matrix puzzle is generated in your browser from a rule specification and a seed, then checked by two independent solvers so that exactly one option follows the rule. Number series, logic, arithmetic, verbal and word-problem items are generated from templates and a curated word bank and checked for a single correct option. Explanations, hints and the “why this option is tempting” notes come from the same specification, so they cannot disagree with the question.'),
    h('h2', null, 'Privacy'),
    h('p', null, 'No data leaves your browser. There are no accounts, no analytics and no network requests after the page loads. Your attempt history is kept in this browser’s local storage and can be cleared from Settings.'),
    h('h2', null, 'Limitations'),
    h('ul', null, LIMITATIONS.map((l) => h('li', null, l))),
    h('div', { class: 'actions' }, link('#/', 'Home', 'btn btn-primary')),
  );
}

export function renderNotFound() {
  return h('section', { class: 'screen' },
    screenTitle('Page not found'),
    h('p', null, 'That link does not match a screen in this app.'),
    h('div', { class: 'actions' }, link('#/', 'Home', 'btn btn-primary')),
  );
}

export function renderError(message) {
  return h('section', { class: 'screen' },
    screenTitle('Something went wrong'),
    h('p', null, message),
    h('div', { class: 'actions' }, link('#/', 'Home', 'btn btn-primary')),
  );
}

export { describeFilter, PRODUCT_NAME };


// ---------------------------------------------------------------- adaptive 12-in-12 challenge

export function renderChallengeSetup({ resumable, history }, handlers) {
  const past = history.slice().reverse();
  return h('section', { class: 'screen challenge-setup' },
    screenTitle('Test'),
    testSwitcher('challenge'),
    h('h2', null, 'Adaptive challenge'),
    h('p', { class: 'lead' }, 'A fixed number of questions, each on its own clock. The difficulty follows your answers, and at the end you get an assessment, a memorandum of every answer, and a full explanation of each question.'),
    h('div', { class: 'notice' }, h('p', null, CHALLENGE_NOTE)),
    h('fieldset', null,
      h('legend', null, 'How the difficulty moves'),
      h('p', { class: 'note' }, CHALLENGE_FORMATS.matrix.rule.split(' Every puzzle')[0]),
      h('ul', { class: 'note' },
        h('li', null, 'A question that reaches 0:00 is recorded as timed out and the next one starts automatically.'),
        h('li', null, 'Your answers are added to your progress statistics and mistakes to the review list.'),
      ),
    ),
    resumable
      ? h('div', { class: 'banner' },
          h('p', null, h('strong', null, 'A challenge is in progress. '), `You are on puzzle ${resumable.index + 1} of ${resumable.items.length}.`),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-primary', onClick: handlers.onResume }, 'Resume challenge'),
            h('button', { type: 'button', class: 'btn btn-danger', onClick: handlers.onDiscard }, 'Discard it'),
          ))
      : h('div', { class: 'preset-list' },
          ...Object.values(CHALLENGE_FORMATS).map((f) => h('div', { class: 'preset' },
            h('button', { type: 'button', class: 'btn btn-primary', onClick: () => handlers.onStart(f.id) }, `Start: ${f.label}`),
            h('p', { class: 'preset-note' }, `${f.blurb} ${f.rule.split('. ').slice(-1)[0]}`),
          )),
        ),
    past.length
      ? h('section', null,
          h('h2', null, 'Previous challenges'),
          h('ul', { class: 'mistake-list' }, past.map((c) => {
            const correct = c.items.filter((i) => i.correct).length;
            return h('li', { class: 'mistake challenge-row' },
              h('div', { class: 'mistake-text' },
                h('span', { class: 'mistake-title' }, `${correct} / ${c.items.length} correct · ${(CHALLENGE_FORMATS[c.format] || CHALLENGE_FORMATS.matrix).label}`),
                h('span', { class: 'mistake-meta' }, `${formatDate(new Date(c.startedAt).toISOString())} · highest level ${Math.max(...c.items.filter((i) => i.difficulty != null).map((i) => i.difficulty))}`),
              ),
              h('div', { class: 'mistake-actions' }, h('a', { class: 'btn btn-small', href: `#/challenge/report/${c.id}` }, 'Open report')),
            );
          })))
      : null,
  );
}

function levelTrajectory(levels) {
  return h('ol', { class: 'trajectory', style: `--cols:${Math.max(levels.length, 1)}`, 'aria-label': 'Difficulty level of each question' },
    levels.map((l, i) => h('li', { class: 'trajectory-step', style: `--lvl:${l}` },
      h('span', { class: 'trajectory-bar', 'aria-hidden': 'true' }),
      h('span', { class: 'trajectory-label' }, h('span', { class: 'visually-hidden' }, `Puzzle ${i + 1}: level `), String(l)),
    )),
  );
}

/** Compact answer key for one puzzle: completed matrix, the six options marked, and the explanation. */
function answerKey(puzzle, item, index) {
  if (!puzzle) {
    return h('details', { class: 'answer-key' },
      h('summary', null,
        h('span', { class: 'answer-key-num' }, String(index + 1).padStart(2, '0')),
        h('span', { class: 'answer-key-title' }, `${ALL_GROUPS[item.group]?.label || item.group} · not reached`),
        h('span', { class: 'result is-unanswered' }, 'Not reached'),
      ),
      h('div', { class: 'answer-key-body' }, h('p', { class: 'note-small' }, 'This puzzle was never presented, so there is nothing to explain. Its level would have depended on your previous answer.')),
    );
  }
  const yours = item.chosenIndex;
  const isItem = puzzle.kind === 'item';
  const options = h('div', { class: `options options-compact${isItem ? ' options-text' : ''}` },
    puzzle.options.map((cell, i) => {
      const cls = ['option', 'cell', 'is-static'];
      if (isItem) cls.push('option-item');
      if (i === puzzle.correctIndex) cls.push('is-correct');
      if (yours === i && !item.correct) cls.push('is-wrong');
      const status = i === puzzle.correctIndex ? 'Correct answer' : yours === i ? 'Your answer' : '';
      return h('div', { class: cls.join(' '), role: 'img', 'aria-label': `Option ${i + 1}: ${puzzle.description.options[i]}${status ? `. ${status}` : ''}` },
        h('span', { class: 'option-num', 'aria-hidden': 'true' }, String(i + 1)),
        isItem ? h('span', { class: 'option-text', html: markupToHtml(cell) }) : h('div', { class: 'option-fig', html: renderCell(cell) }),
        status ? h('span', { class: 'option-status', 'aria-hidden': 'true' }, status) : null,
      );
    }),
  );
  const result = item.timedOut ? 'Timed out' : item.chosenIndex == null ? 'Not reached' : item.correct ? 'Correct' : 'Incorrect';
  const resultCls = item.correct ? 'is-correct' : item.chosenIndex == null ? 'is-unanswered' : 'is-wrong';
  const details = h('details', { class: 'answer-key', open: item.chosenIndex == null || !item.correct ? '' : null },
    h('summary', null,
      h('span', { class: 'answer-key-num' }, String(index + 1).padStart(2, '0')),
      h('span', { class: 'answer-key-title' }, `${puzzle.familyLabel} · level ${puzzle.difficulty}`),
      h('span', { class: `result ${resultCls}` }, result),
    ),
    h('div', { class: 'answer-key-body' },
      h('div', { class: `puzzle-layout${isItem ? ' puzzle-layout-item' : ''}` },
        isItem ? renderPrompt(puzzle) : renderMatrix(puzzle, { done: true, idPrefix: `key-${index}` }),
        h('div', { class: 'options-wrap' }, h('h3', { class: 'options-title' }, 'Options'), options),
      ),
      explanationBlock(puzzle, item.correct ? null : item.chosenIndex, null),
    ),
  );
  // `open` must be absent, not "null", for closed items.
  if (!(item.chosenIndex == null || !item.correct)) details.removeAttribute('open');
  return details;
}

export function renderChallengeReport({ challenge, report, puzzles }) {
  const isMock = report.format === 'mock';
  const fmt = isMock
    ? { label: `Mock test · ${(MOCK_TIERS[challenge.tier] || MOCK_TIERS.mixed).label} · ${challenge.items.length} questions in ${challenge.minutes} min`, rule: 'Not adaptive: every question\'s level was fixed when the test was created, so the path below simply shows the levels in order.' }
    : (CHALLENGE_FORMATS[report.format] || CHALLENGE_FORMATS.matrix);
  const endedText = { completed: `All ${report.total} questions were presented.`, time: 'The time ran out.', stopped: 'Ended early.', finished: 'You finished before the clock ran out.' }[report.endedBy] || '';
  const memoRows = challenge.items.map((item, i) => {
    const p = puzzles[i];
    const result = item.timedOut ? 'Timed out' : item.chosenIndex == null ? (isMock ? 'Unanswered' : 'Not reached') : item.correct ? 'Correct' : 'Incorrect';
    const cls = item.correct ? 'is-correct' : item.chosenIndex == null ? 'is-unanswered' : 'is-wrong';
    return h('tr', { class: item.correct ? '' : 'is-miss' },
      h('td', null, String(i + 1)),
      h('td', null, `${ALL_GROUPS[item.group]?.label || item.group}`, h('br'), h('span', { class: 'mistake-meta' }, familyInfo(item.family)?.label || item.family)),
      h('td', null, item.difficulty == null ? '–' : `${item.difficulty} – ${DIFFICULTY_LABELS[item.difficulty]}`),
      h('td', null, item.chosenIndex == null ? '–' : String(item.chosenIndex + 1)),
      h('td', null, p ? String(p.correctIndex + 1) : '–'),
      h('td', null, h('span', { class: `result ${cls}` }, result)),
      h('td', null, item.chosenIndex == null ? (item.timedOut ? 'timed out' : '–') : formatMs(item.ms)),
      h('td', null, p ? h('a', { href: `#key-${i}` }, 'See', h('span', { class: 'visually-hidden' }, ` explanation for puzzle ${i + 1}`)) : '–'),
    );
  });
  const groupRows = report.groups.map((g) => h('tr', null,
    h('th', { scope: 'row' }, g.label),
    h('td', null, String(g.attempted)),
    h('td', null, `${g.correct} / ${g.attempted}`),
  ));
  return h('section', { class: 'screen challenge-report' },
    screenTitle(isMock ? 'Mock test report' : 'Challenge report'),
    h('p', { class: 'lead' }, `${fmt.label}. ${endedText} ${formatDate(new Date(challenge.startedAt).toISOString())}.`),
    h('div', { class: 'stat-tiles' },
      statTile('Score', `${report.correct} / ${report.total}`, isMock ? `${report.wrong} incorrect · ${report.total - report.answered} unanswered` : `${report.wrong} incorrect · ${report.timedOut} timed out · ${report.notReached} not reached`),
      statTile('Highest level', report.highest == null ? '–' : `${report.highest}`, report.highest == null ? '' : DIFFICULTY_LABELS[report.highest]),
      statTile('Average time', report.avgMs == null ? '–' : `${Math.round(report.avgMs / 1000)} s`, report.secondsPer ? `per answered question (${report.secondsPer} s available)` : 'per answered question'),
      statTile('Time used', formatMs(report.usedMs), `of ${Math.round(report.limitMs / 60000)} min`),
    ),
    h('h2', null, 'Assessment'),
    h('div', { class: 'assessment' }, assessmentText(report).map((t) => h('p', null, t))),
    h('h3', null, 'Difficulty path'),
    levelTrajectory(report.levels),
    h('p', { class: 'note-small' }, fmt.rule),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'table stats-table' },
        h('caption', null, 'By rule group'),
        h('thead', null, h('tr', null, ['Group', 'Presented', 'Correct'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, groupRows),
      ),
    ),
    h('p', { class: 'note-small caveat' }, isMock ? CHALLENGE_NOTE.replace('This challenge', 'This mock test').replace('The up-and-down difficulty rule is stated in full below; it', 'It') : CHALLENGE_NOTE),
    h('h2', null, 'Memorandum'),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'table memo' },
        h('caption', { class: 'visually-hidden' }, 'Answer key for every puzzle'),
        h('thead', null, h('tr', null, ['#', 'Rule group', 'Level', 'Your answer', 'Correct answer', 'Result', 'Time', 'Explanation'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, memoRows),
      ),
    ),
    h('h2', null, 'Explanations'),
    h('p', { class: 'note-small' }, 'Incorrect, timed-out and unreached questions are expanded; open any other to read its explanation.'),
    h('div', { class: 'answer-keys' }, challenge.items.map((item, i) => {
      const wrap = answerKey(puzzles[i], item, i);
      wrap.id = `key-${i}`;
      return wrap;
    })),
    h('div', { class: 'actions' },
      link(isMock ? '#/mock' : '#/challenge', isMock ? 'New mock test' : 'New challenge', 'btn btn-primary'),
      link('#/results/mistakes', 'Mistake review'),
      link('#/results', 'See progress'),
      link('#/', 'Home'),
    ),
  );
}


// ---------------------------------------------------------------- mock test setup

export function renderMockSetup({ settings, resumable, history }, handlers) {
  const state = { count: settings.mockCount || MOCK_DEFAULTS.count, minutes: settings.mockMinutes || MOCK_DEFAULTS.minutes, tier: settings.mockTier || MOCK_DEFAULTS.tier };
  const past = history.slice().reverse();
  const form = h('form', { class: 'timed-form', onSubmit: (e) => { e.preventDefault(); handlers.onStart({ ...state }); } },
    h('fieldset', null,
      h('legend', null, 'Set up the test'),
      h('div', { class: 'field-row' },
        h('div', { class: 'field' }, h('label', { for: 'mock-count' }, 'Questions (6–40)'), h('input', { id: 'mock-count', class: 'input', type: 'number', min: '6', max: '40', value: String(state.count), onInput: (e) => { state.count = Number(e.target.value); } })),
        h('div', { class: 'field' }, h('label', { for: 'mock-minutes' }, 'Minutes (1–60)'), h('input', { id: 'mock-minutes', class: 'input', type: 'number', min: '1', max: '60', value: String(state.minutes), onInput: (e) => { state.minutes = Number(e.target.value); } })),
        h('div', { class: 'field' }, h('label', { for: 'mock-tier' }, 'Level tier'), (() => { const sel = h('select', { id: 'mock-tier', class: 'select', onChange: (e) => { state.tier = e.target.value; } }, Object.values(MOCK_TIERS).map((t) => h('option', { value: t.id }, t.label))); sel.value = state.tier; return sel; })()),
      ),
      h('p', { class: 'note-small' }, 'Half of the questions are matrices; the rest are spread over number series, logical deduction, fractions and arithmetic, and verbal reasoning. Levels are drawn from the chosen tier and fixed in advance.'),
    ),
    h('div', { class: 'actions' },
      h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, 'Start the mock test'),
      link('#/', 'Back to home'),
    ),
  );
  return h('section', { class: 'screen mock-setup' },
    screenTitle('Test'),
    testSwitcher('mock'),
    h('h2', null, 'Mock test'),
    h('p', { class: 'lead' }, 'Answer in any order on one overall clock: move back and forth, save questions for later, change your mind, then press "I am finished". The report shows every answer with its explanation.'),
    h('div', { class: 'notice' }, h('p', null, CHALLENGE_NOTE.replace('This challenge', 'This mock test').replace('The up-and-down difficulty rule is stated in full below; it', 'It'))),
    resumable
      ? h('div', { class: 'banner' },
          h('p', null, h('strong', null, 'A mock test is in progress. '), `${resumable.items.filter((i) => i.chosenIndex != null).length} of ${resumable.items.length} answered.`),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-primary', onClick: handlers.onResume }, 'Resume test'),
            h('button', { type: 'button', class: 'btn btn-danger', onClick: handlers.onDiscard }, 'Discard it'),
          ))
      : form,
    past.length
      ? h('section', null,
          h('h2', null, 'Previous mock tests'),
          h('ul', { class: 'mistake-list' }, past.map((m) => {
            const correct = m.items.filter((i) => i.correct).length;
            return h('li', { class: 'mistake challenge-row' },
              h('div', { class: 'mistake-text' },
                h('span', { class: 'mistake-title' }, `${correct} / ${m.items.length} correct · ${(MOCK_TIERS[m.tier] || MOCK_TIERS.mixed).label}`),
                h('span', { class: 'mistake-meta' }, `${formatDate(new Date(m.startedAt).toISOString())} · ${m.items.length} questions in ${m.minutes} min`),
              ),
              h('div', { class: 'mistake-actions' }, h('a', { class: 'btn btn-small', href: `#/mock/report/${m.id}` }, 'Open report')),
            );
          })))
      : null,
  );
}
