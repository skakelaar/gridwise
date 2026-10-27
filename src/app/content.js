// Teaching and product copy for the app. Export shape is fixed by docs/CONTRACTS.md.
// Plain English, British spelling. Body strings use only <p>, <ul>, <li> and <strong>.

export const PRODUCT_NAME = 'Gridwise';

export const INDEPENDENCE_NOTICE =
  'Gridwise is independent practice material. Every puzzle is original and procedurally generated. '
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
  {
    title: 'When rows and columns fail, read the whole matrix',
    body: '<p>Some puzzles have no row rule and no column rule at all. Then ask: is there a <strong>path</strong> through the nine cells (a snake, a spiral) along which something counts up or down? Is there a <strong>tally</strong> over the whole matrix (three of each kind)? Is there a <strong>fixed set</strong> that every cell contains, with the rest being noise? Is the bottom row the top row <strong>mirrored</strong>?</p><ul><li>Count first, then look for the order that makes the counts steady.</li><li>Ignore positions inside a cell unless they clearly matter.</li><li>Only decide “no rule” after trying rows, columns, paths and tallies.</li></ul>',
    example: { family: 'path', difficulty: 2, seed: 'intro4' },
  },
  {
    title: 'Two layers in one cell',
    body: '<p>Some cells carry a main figure <strong>and</strong> small marks around it. The two layers follow different rules, often in different directions: the figure may turn along the rows while the marks combine down the columns like a line-and-dot cell.</p>'
      + '<ul><li>Cover the marks with a finger and solve the figure on its own: shape, fill, rotation, reflection.</li>'
      + '<li>Then ignore the figure and treat the marks as a collection: which operation builds the third cell of each column (or row) from the first two?</li>'
      + '<li>Only an option that satisfies both layers can be right. Most distractors get one layer right and the other wrong.</li></ul>'
      + '<p>In the example the key turns 90° clockwise along each row and its fill alternates, while down each column the marks of the top two cells are added together to give the bottom cell.</p>',
    example: { family: 'composite', difficulty: 2, seed: 'learn815' },
  },
];

// Guides to the non-matrix question types. Each has a worked example generated from the engine, so the text
// and the example can never disagree. Tab ids double as route segments (#/intro/<id>).
export const LEARN_TABS = [
  { id: 'matrices', label: 'Matrices' },
  { id: 'series', label: 'Number series' },
  { id: 'logic', label: 'Logic' },
  { id: 'numeric', label: 'Arithmetic' },
  { id: 'verbal', label: 'Verbal' },
  { id: 'applied', label: 'Word problems' },
];

export const ITEM_GUIDES = {
  series: {
    title: 'Number series',
    lead: 'A row of numbers follows a rule; you supply the next or missing term. The options are built from common slips, so find the rule before you look at them.',
    steps: [
      { title: 'Write the differences first', body: '<p>Under each gap, note how much the series changes. A constant difference (+3, +3, +3) or a constant ratio (×2, ×2) settles easy items at once.</p>' },
      { title: 'If the differences wander, look one layer deeper', body: '<p>Take the differences of the differences (they may themselves rise by a fixed amount), or check whether the operations <strong>alternate</strong> (+5, ×2, +5, ×2).</p>' },
      { title: 'Try two interleaved series', body: '<p>Read every second term as its own series. Two simple strands often masquerade as one hard one; three strands appear at the top levels.</p>' },
      { title: 'Know the special sequences', body: '<p>Squares (1, 4, 9, 16), cubes, primes (2, 3, 5, 7, 11), Fibonacci-style sums of the previous two terms, and sums of digits turn up from the advanced level on.</p>' },
    ],
    traps: 'Stopping at a rule that fits only the first three terms; continuing the wrong strand of an interleaved series; arithmetic slips of one step. Check your rule against every gap before you answer.',
    examples: [{ family: 'series', difficulty: 2, seed: 'learn-series' }, { family: 'series', difficulty: 4, seed: 'learn-series4' }],
    practise: 'series',
  },
  logic: {
    title: 'Logical deduction',
    lead: 'Two or three statements are given and you pick the conclusion that must follow, or say that none does. Only what the statements force counts; what is merely likely does not.',
    steps: [
      { title: 'Draw the statements', body: '<p>“All A are B” puts circle A inside circle B. “No A are B” keeps the circles apart. “Some A are B” overlaps them. A named person is a dot you place according to what you are told.</p>' },
      { title: 'Follow the chain', body: '<p>“All A are B, all B are C” gives “all A are C”. “No B are C” with “all A are B” gives “no A are C”. “Some” never grows into “all”, and “all A are B” does not reverse into “all B are A”.</p>' },
      { title: 'Take “none of these” seriously', body: '<p>It is correct whenever every offered conclusion goes beyond the statements, which happens often at higher levels. It is wrong when one conclusion is forced.</p>' },
      { title: 'Line-ups and orderings', body: '<p>For “Ana is taller than Ben; Ben is taller than Cy” style items, draw the line. Only relations between people who are linked through the chain are settled; two people never compared stay undecided.</p>' },
    ],
    traps: 'Reading “some” as “all”; reversing a universal statement; using what you know about the real world instead of the statements; and preferring a plausible conclusion to a forced one.',
    examples: [{ family: 'logic', difficulty: 2, seed: 'learn-logic' }, { family: 'logic', difficulty: 4, seed: 'learn-logic4' }],
    practise: 'logic',
  },
  numeric: {
    title: 'Fractions, percentages and ratios',
    lead: 'Short calculations with fractions, decimals, percentages, ratios and small equations. Speed comes from converting to one form and from estimating before you calculate.',
    steps: [
      { title: 'Convert to one form', body: '<p>Fractions with different denominators: bring them to a common denominator, or turn both into decimals. Mixed numbers: convert to improper fractions before multiplying or dividing.</p>' },
      { title: 'Percent means “per hundred”', body: '<p>20% of 45 is 45 × 20 ⁄ 100 = 9. A rise of 20% multiplies by 1.2; a fall of 20% multiplies by 0.8. Two changes in a row multiply: up 20% then down 20% is ×1.2 × 0.8 = ×0.96, not back to the start.</p>' },
      { title: 'Ratios are scale factors', body: '<p>In 6 : 8 = ? : 32, the second number has been multiplied by 4, so the first is too: 24. To share in a ratio, add the parts and divide the total by that sum.</p>' },
      { title: 'Estimate, then eliminate', body: '<p>Before calculating exactly, decide whether the answer is bigger or smaller than the numbers you started with, and strike out options on the wrong side.</p>' },
    ],
    traps: 'Adding numerators and denominators straight across; applying a percentage to the wrong base; multiplying instead of dividing when a fraction is less than one; and dropping a sign when solving an equation.',
    examples: [{ family: 'numeric', difficulty: 2, seed: 'learn-numeric' }, { family: 'numeric', difficulty: 4, seed: 'learn-numeric4' }],
    practise: 'numeric',
  },
  verbal: {
    title: 'Analogies, vocabulary and odd-one-out',
    lead: 'Word items test whether you can name a relationship and hold it steady. Say the relationship in a full sentence before you look at the options.',
    steps: [
      { title: 'Analogies: state the link, then keep the order', body: '<p>“Cheap is to expensive as innocent is to …”: the second word is the <strong>opposite</strong> of the first, so the answer is the opposite of innocent. Common links: opposite, synonym, part of, made of, tool and user, cause and effect, degree (warm, hot), category and member. The order inside the pair matters: a part-to-whole link read backwards picks the wrong option.</p>' },
      { title: 'Synonyms and antonyms: beware the near miss', body: '<p>When the question asks for the opposite, one option is usually a close synonym placed there to catch a hasty reading. Re-read the question word, then test each option in a sentence.</p>' },
      { title: 'Odd one out: find the category first', body: '<p>Name what most of the words have in common (all tools, all emotions, all units of time) and the one that does not fit falls out. If two categories seem possible, the intended one is the one that leaves exactly one word outside.</p>' },
      { title: 'Sentence completion', body: '<p>Read the whole sentence for its tone and logic (a “but” signals contrast, an “and” signals continuation), then pick the word that fits both the meaning and the grammar.</p>' },
    ],
    traps: 'Choosing a word that is related to the question word but by the wrong relationship; confusing synonym with antonym; and letting an unfamiliar option look right because it sounds sophisticated.',
    examples: [{ family: 'analogy', difficulty: 2, seed: 'learn-analogy' }, { family: 'vocab', difficulty: 3, seed: 'learn-vocab' }],
    practise: 'group:verbal',
  },
  applied: {
    title: 'Word problems',
    lead: 'Short scenarios about journeys, salaries, clocks, averages, ages and work rates. The maths is modest; the skill is turning the sentences into one line of arithmetic without losing a quantity.',
    steps: [
      { title: 'Name what is asked, then the quantities', body: '<p>Write the question in your own words (“how far from the start?”), then list each number with its unit. Most mistakes come from answering a different question than the one asked.</p>' },
      { title: 'Journeys: track the net position', body: '<p>Opposite moves cancel. Add east–west moves separately from north–south moves; for a straight-line distance at the end, use the two totals as the sides of a right angle (3 and 4 give 5).</p>' },
      { title: 'Percent changes work on the current amount', body: '<p>A salary raised by 10% and then cut by 10% ends below where it started. To undo a known increase, divide by the factor (a price that rose 25% to 150 started at 150 ⁄ 1.25 = 120), do not subtract the same percentage.</p>' },
      { title: 'Clocks, averages and rates', body: '<p>The minute hand moves 6° per minute and the hour hand 0.5° per minute, so the angle at 3:30 is 75°, not 90°. Average × count = total, which lets you recover a missing value. Work rates add: a job done in 6 hours by one person and 3 by another is done in 2 hours together.</p>' },
    ],
    traps: 'Mixing units; subtracting a percentage that was added; reading “older than” as “twice as old”; and forgetting that the hour hand keeps moving between the hours.',
    examples: [{ family: 'word', difficulty: 2, seed: 'learn-word' }, { family: 'word', difficulty: 4, seed: 'learn-word4' }],
    practise: 'word',
  },
};

export const PRACTICE_MODES = {
  guided: { title: 'Guided practice', blurb: 'Ask for hints one at a time, then read the full explanation of every puzzle.' },
  untimed: { title: 'Untimed practice', blurb: 'Work at your own pace with no clock; explanations appear after each answer.' },
  timed: { title: 'Timed session', blurb: 'Set a puzzle count and a time limit, then review everything at the end.' },
  review: { title: 'Mistake review', blurb: 'Revisit the puzzles you got wrong and see which misconception each option was testing.' },
  mock: { title: 'Mock test', blurb: 'A fixed set of questions on one clock. Move back and forth, flag questions for later, change answers, then finish and read the full report.' },
  challenge: { title: 'Challenge', blurb: '12 matrices in 12 minutes, or 16 mixed questions (matrices, number series, logic, arithmetic, analogies) in 8 minutes, with difficulty stepping up and down, then a full report.' },
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
  'Scores here are not comparable with other trainers or tests: question banks, time limits and distractor styles differ. If another trainer feels harder, use a higher level, the practice clock, or the Master mock tier.',
  'Number series, logical deduction, arithmetic and analogy questions are original and generated from a small set of templates and a curated English word bank; they are practice in those formats, not a reconstruction of any published test\'s items.',
  'The 12-in-12 challenge uses a simple, stated up-and-down difficulty rule; it is not the adaptive procedure of any published test and its report is not an official or comparable score.',
  'Levels 4 to 6 (Expert, Master, Grandmaster) stack more simultaneous rules, add inner shapes, count arithmetic, complement and two-way set operations, attributes tied to other attributes, two-level number series, three-premise logic and an advanced vocabulary band; they are harder by construction, not by any measured norm. Non-matrix questions share their hardest forms between levels 5 and 6.',
  'Each puzzle is checked to have exactly one answer within the supported rule grammar (progressions, alternations, one-of-each layouts and set operations), not against every pattern a person might imagine.',
  'Difficulty levels are structural: they count the rules in play, whether rules run in both directions, the step size and the size of the element palette. They are not psychometrically calibrated.',
  'The app never produces an IQ, a percentile or any score meant to be equivalent to an official test.',
  'Timing presets are practice conventions chosen for this app. They do not reproduce the timing, length or scoring of any official test.',
  'Your progress is stored only in this browser. Clearing site data, switching browsers or using private browsing will lose it, and nothing is sent anywhere.',
  'Statistics from a small number of attempts are unreliable; see the caveat shown next to them.',
  'A human reviewer sampled generated puzzles for clarity and fairness but did not inspect every seed, so an occasional awkward puzzle is possible.',
];
