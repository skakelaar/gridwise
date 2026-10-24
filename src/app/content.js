// Teaching and product copy for the app. Export shape is fixed by docs/CONTRACTS.md.
// Plain English, British spelling. Body strings use only <p>, <ul>, <li> and <strong>.

export const PRODUCT_NAME = 'Matrix Reasoning Trainer';

export const INDEPENDENCE_NOTICE =
  'Matrix Reasoning Trainer is independent practice material. Every puzzle is original and procedurally generated. '
  + 'It is not affiliated with, endorsed by or derived from Assessio or the Matrigma test, it does not reproduce '
  + 'Matrigma items, and results here do not predict any official score.';

export const INTRO_STEPS = [
  {
    title: 'Read it as rows and columns',
    body: '<p>A matrix puzzle is a 3×3 grid with the bottom-right cell missing. Read it like a table: three rows '
      + 'across and three columns down. The figures are not a picture; they are a pattern.</p>'
      + '<ul><li>Start with row 1. Ask what happens from the first cell to the second, then from the second to the third.</li>'
      + '<li>Check that row 2 does the same thing. If it does, you have found a row rule.</li>'
      + '<li>Now do the same down column 1 and column 2. Some puzzles have a column rule instead of, or as well as, a row rule.</li></ul>'
      + '<p>In the example, each flag turns 45° clockwise from one cell to the next along every row. Each row starts '
      + 'from its own angle, so the columns carry no rule of their own.</p>',
    example: { family: 'rotation', difficulty: 1, seed: 'intro6' },
  },
  {
    title: 'Ask what changes and what stays the same',
    body: '<p>Every figure has a handful of properties: shape, fill, size, number, rotation, reflection and position. '
      + 'Most of them stay fixed in any one puzzle. Name the ones that change and ignore the rest.</p>'
      + '<ul><li>Pick one property, such as size, and track it on its own across a row.</li>'
      + '<li>If it never changes, cross it off and move to the next property.</li>'
      + '<li>The missing cell keeps every unchanged property exactly as it is everywhere else.</li></ul>'
      + '<p>In the example only the size changes: each row goes small, medium, large. Shape, fill and number stay the same, '
      + 'so any option that alters them is wrong before you even check the size.</p>',
    example: { family: 'size', difficulty: 1, seed: 'q1' },
  },
  {
    title: 'Separate the rules when more than one is at work',
    body: '<p>Harder puzzles change two or three properties at once. The rules are independent: each property follows '
      + 'its own pattern, and the patterns can run in different directions.</p>'
      + '<ul><li>Handle one property at a time. Work out its rule and the value it needs in the missing cell.</li>'
      + '<li>Then do the next property. Do not try to see everything at once.</li>'
      + '<li>Some rules run in both directions at once, for example when each row <strong>and</strong> each column '
      + 'contains each value exactly once.</li></ul>'
      + '<p>In the example the fill alternates down the columns (hollow, striped, hollow) while the number of triangles '
      + 'grows by one along the rows. Settle the fill first, then the count, and only one option fits both.</p>',
    example: { family: 'combination', difficulty: 1, seed: 'intro13' },
  },
  {
    title: 'Treat line and dot cells as collections',
    body: '<p>Some cells are made of separate elements, such as lines in a frame or dots in a grid. Here the third cell '
      + 'of each row (or column) is built from the first two by one operation.</p>'
      + '<ul><li><strong>Addition or union:</strong> the third cell shows everything from the first two.</li>'
      + '<li><strong>Subtraction:</strong> the third cell is the first cell with the second cell\'s elements removed.</li>'
      + '<li><strong>Intersection:</strong> only the elements in both cells survive.</li>'
      + '<li><strong>Exclusive-or:</strong> only the elements in exactly one cell survive; shared ones vanish.</li></ul>'
      + '<p>Test each operation on row 1 until one works, then confirm it on row 2. In the example the third cell '
      + 'merges the first two: the top line appears in both and is kept once, not dropped.</p>',
    example: { family: 'union', difficulty: 1, seed: 'intro0' },
  },
  {
    title: 'Confirm with row 3 and column 3',
    body: '<p>Once you think you know the rule, predict the missing cell before you look at the options. Then check your '
      + 'prediction twice.</p>'
      + '<ul><li>Apply the rule along row 3: do the first two cells lead to your prediction?</li>'
      + '<li>Apply it down column 3 as well. A real rule never contradicts itself.</li>'
      + '<li>If the two checks disagree, you have the wrong rule or the wrong direction. Go back to row 1.</li></ul>'
      + '<p>In the example each row and each column contains one, two and three diamonds exactly once. Row 3 already has '
      + 'three and two; column 3 already has three and two. Both leave only one answer.</p>',
    example: { family: 'number', difficulty: 1, seed: 'intro6' },
  },
  {
    title: 'Eliminate options and avoid the neighbour trap',
    body: '<p>The six options are built to catch common mistakes, so use them to check your reasoning rather than to '
      + 'guess from.</p>'
      + '<ul><li>Strike out any option that changes a property that stays fixed everywhere else.</li>'
      + '<li>Strike out any option that breaks a rule you have confirmed, even if it looks similar to the answer.</li>'
      + '<li>Beware the <strong>copy-the-neighbour</strong> trap: an option identical to the cell on the left of the gap, '
      + 'the cell above it or the centre cell is almost always wrong, because the rule asks for one more step, not a repeat.</li>'
      + '<li>If two options survive, you have missed a rule. Compare the two and find which property separates them.</li></ul>'
      + '<p>In the example one option simply repeats the cell to the left of the gap. It breaks both rules: the fill '
      + 'should return to solid, and the square should move one more step down.</p>',
    example: { family: 'combination', difficulty: 1, seed: 'intro17' },
  },
];

export const PRACTICE_MODES = {
  guided: { title: 'Guided practice', blurb: 'Ask for hints one at a time, then read the full explanation of every puzzle.' },
  untimed: { title: 'Untimed practice', blurb: 'Work at your own pace with no clock; explanations appear after each answer.' },
  timed: { title: 'Timed session', blurb: 'Set a puzzle count and a time limit, then review everything at the end.' },
  review: { title: 'Mistake review', blurb: 'Revisit the puzzles you got wrong and see which misconception each option was testing.' },
  challenge: { title: '12-in-12 challenge', blurb: 'Twelve puzzles, sixty seconds each, difficulty stepping up and down with your answers, then a full report.' },
};

export const CHALLENGE_NOTE = 'This challenge is a practice format. The up-and-down difficulty rule is stated in full below; it does not reproduce the adaptive algorithm, item bank, timing, scoring or norms of Matrigma or any other published test, and the report is not an official or comparable score.';

export const TIMED_PRESETS = [
  {
    id: 'warmup',
    label: '5-minute warm-up (6 puzzles)',
    minutes: 5,
    count: 6,
    note: 'A short practice preset for getting into the rhythm; it does not reproduce any official test timing, length or scoring.',
  },
  {
    id: 'twelve',
    label: '12-minute practice (15 puzzles)',
    minutes: 12,
    count: 15,
    note: 'This is a practice preset only. It does not reproduce the timing, length or scoring of any official test, and the result is not comparable with an official score.',
  },
  {
    id: 'mixed',
    label: '20-minute mixed set (24 puzzles)',
    minutes: 20,
    count: 24,
    note: 'A longer practice preset drawing on every rule group at mixed difficulty; it does not reproduce any official test timing, length or scoring.',
  },
];

export const STATS_CAVEAT =
  'These figures come from a small sample and swing a lot. Treat any percentage based on fewer than 20 attempts as a rough '
  + 'indication only, and compare rule groups only once each has a reasonable number of attempts behind it.';

export const PERSONALISATION_NOTE =
  'Practice personalisation is off by default. When it is on, it follows one simple rule that you can check for yourself: '
  + 'the next rule group is chosen at random with probability proportional to one plus your recent mistakes in that group, '
  + 'so groups you have struggled with come up more often; the difficulty goes up one level after three consecutive correct '
  + 'answers at the current level and goes down one level after two consecutive mistakes. Nothing else influences the choice.';

export const LIMITATIONS = [
  'The 12-in-12 challenge uses a simple, stated up-and-down difficulty rule; it is not the adaptive procedure of any published test and its report is not an official or comparable score.',
  'Level 4 (Expert) stacks four independent rules and adds inner shapes and count arithmetic; it is harder by construction, not by any measured norm.',
  'Each puzzle is checked to have exactly one answer within the supported rule grammar (progressions, alternations, one-of-each layouts and set operations), not against every pattern a person might imagine.',
  'Difficulty levels are structural: they count the rules in play, whether rules run in both directions, the step size and the size of the element palette. They are not psychometrically calibrated.',
  'The app never produces an IQ, a percentile or any score meant to be equivalent to an official test.',
  'Timing presets are practice conventions chosen for this app. They do not reproduce the timing, length or scoring of any official test.',
  'Your progress is stored only in this browser. Clearing site data, switching browsers or using private browsing will lose it, and nothing is sent anywhere.',
  'Statistics from a small number of attempts are unreliable; see the caveat shown next to them.',
  'A human reviewer sampled generated puzzles for clarity and fairness but did not inspect every seed, so an occasional awkward puzzle is possible.',
];
