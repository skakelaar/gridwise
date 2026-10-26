// Curated, original English word bank for analogies and vocabulary items.
// Levels grade vocabulary: 1 everyday, 2 common, 3 educated, 4 advanced.
// Relations keep their vocabulary semantically distinct so cross-relation distractors do not fit.

export const RELATIONS = [
  { id: 'opposite', text: 'the second word is the opposite of the first', pairs: [
    [1, 'full', 'empty'], [1, 'rested', 'tired'], [1, 'wide', 'narrow'], [1, 'ancient', 'modern'], [2, 'generous', 'stingy'], [2, 'brave', 'cowardly'],
    [2, 'scarce', 'plentiful'], [2, 'humid', 'arid'], [3, 'transparent', 'opaque'], [3, 'verbose', 'terse'], [3, 'benevolent', 'malevolent'], [3, 'rigid', 'pliable'],
    [4, 'ephemeral', 'enduring'], [4, 'parsimonious', 'lavish'], [4, 'candid', 'evasive'], [4, 'lucid', 'obscure'],
  ] },
  { id: 'tool', text: 'the second word is the tool used to do the first', pairs: [
    [1, 'cutting', 'scissors'], [1, 'writing', 'pen'], [1, 'sweeping', 'broom'], [1, 'digging', 'spade'], [2, 'sawing', 'saw'], [2, 'stirring', 'whisk'],
    [2, 'measuring', 'ruler'], [2, 'hammering', 'mallet'], [3, 'weighing', 'scales'], [3, 'magnifying', 'lens'], [3, 'fastening', 'rivet'], [4, 'calibrating', 'gauge'],
  ] },
  { id: 'producer', text: 'the first makes or delivers the second', pairs: [
    [1, 'baker', 'bread'], [1, 'musician', 'concert'], [1, 'author', 'novel'], [2, 'beekeeper', 'honey'], [2, 'sculptor', 'statue'], [2, 'farmer', 'harvest'],
    [2, 'tailor', 'suit'], [3, 'architect', 'blueprint'], [3, 'playwright', 'script'], [3, 'cartographer', 'map'], [4, 'lexicographer', 'dictionary'], [4, 'cooper', 'barrel'],
  ] },
  { id: 'part', text: 'the first is part of the second', pairs: [
    [1, 'child', 'family'], [1, 'violinist', 'orchestra'], [1, 'petal', 'flower'], [1, 'soldier', 'army'], [2, 'chapter', 'book'], [2, 'wheel', 'bicycle'],
    [2, 'island', 'archipelago'], [2, 'sailor', 'crew'], [3, 'stanza', 'poem'], [3, 'juror', 'jury'], [3, 'tributary', 'river'], [4, 'phalanx', 'legion'],
  ] },
  { id: 'home', text: 'the second is where the first lives or is kept', pairs: [
    [1, 'bee', 'hive'], [1, 'horse', 'stable'], [1, 'bird', 'nest'], [2, 'monk', 'monastery'], [2, 'bear', 'den'], [2, 'ship', 'harbour'], [2, 'wine', 'cellar'],
    [3, 'eagle', 'eyrie'], [3, 'badger', 'sett'], [3, 'aircraft', 'hangar'], [4, 'hermit', 'hermitage'], [4, 'otter', 'holt'],
  ] },
  { id: 'category', text: 'the first is a kind of the second', pairs: [
    [1, 'oak', 'tree'], [1, 'salmon', 'fish'], [1, 'sparrow', 'bird'], [2, 'copper', 'metal'], [2, 'waltz', 'dance'], [2, 'sapphire', 'gem'],
    [3, 'sonnet', 'poem'], [3, 'basalt', 'rock'], [3, 'cello', 'instrument'], [4, 'haiku', 'poem'], [4, 'mazurka', 'dance'], [4, 'lemur', 'primate'],
  ] },
  { id: 'degree', text: 'the second is a stronger degree of the first', pairs: [
    [1, 'warm', 'scorching'], [1, 'cool', 'freezing'], [2, 'annoyed', 'furious'], [2, 'damp', 'soaked'], [2, 'glad', 'ecstatic'], [2, 'breeze', 'gale'],
    [3, 'drizzle', 'downpour'], [3, 'whisper', 'shout'], [3, 'dislike', 'loathe'], [4, 'tremor', 'earthquake'], [4, 'concern', 'dread'], [4, 'admire', 'revere'],
  ] },
  { id: 'cause', text: 'the first causes the second', pairs: [
    [1, 'spark', 'fire'], [1, 'rain', 'flood'], [2, 'virus', 'illness'], [2, 'drought', 'famine'], [2, 'practice', 'skill'], [3, 'insult', 'offence'],
    [3, 'friction', 'heat'], [3, 'neglect', 'decay'], [4, 'inflation', 'devaluation'], [4, 'erosion', 'canyon'], [4, 'stimulus', 'response'],
  ] },
  { id: 'function', text: 'the second is what the first is used for', pairs: [
    [2, 'compass', 'navigation'], [2, 'telescope', 'observation'], [3, 'anchor', 'mooring'], [3, 'ledger', 'bookkeeping'], [3, 'scalpel', 'surgery'],
    [3, 'kiln', 'firing'], [4, 'loom', 'weaving'], [4, 'sieve', 'sifting'], [4, 'abacus', 'calculation'], [4, 'sextant', 'navigation'],
  ] },
  { id: 'collective', text: 'the second is the collective name for many of the first', pairs: [
    [2, 'wolf', 'pack'], [2, 'fish', 'shoal'], [2, 'lion', 'pride'], [2, 'cow', 'herd'], [3, 'geese', 'gaggle'], [3, 'bee', 'swarm'], [3, 'ship', 'fleet'],
    [4, 'crow', 'murder'], [4, 'owl', 'parliament'], [4, 'lark', 'exaltation'],
  ] },
  { id: 'expert', text: 'the second is the specialist who studies or treats the first', pairs: [
    [2, 'stars', 'astronomer'], [2, 'teeth', 'dentist'], [2, 'eyes', 'optician'], [3, 'insects', 'entomologist'], [3, 'rocks', 'geologist'],
    [3, 'languages', 'linguist'], [3, 'weather', 'meteorologist'], [4, 'fossils', 'palaeontologist'], [4, 'birds', 'ornithologist'], [4, 'skin', 'dermatologist'],
  ] },
  { id: 'young', text: 'the second is the young of the first', pairs: [
    [1, 'dog', 'puppy'], [1, 'cat', 'kitten'], [1, 'cow', 'calf'], [2, 'sheep', 'lamb'], [2, 'horse', 'foal'], [2, 'frog', 'tadpole'],
    [3, 'swan', 'cygnet'], [3, 'deer', 'fawn'], [3, 'goose', 'gosling'], [4, 'hare', 'leveret'], [4, 'eagle', 'eaglet'], [4, 'kangaroo', 'joey'],
  ] },
  { id: 'workplace', text: 'the second is where the first works', pairs: [
    [1, 'teacher', 'classroom'], [1, 'chef', 'kitchen'], [1, 'judge', 'courtroom'], [2, 'actor', 'stage'], [2, 'pilot', 'cockpit'], [2, 'surgeon', 'theatre'],
    [3, 'blacksmith', 'forge'], [3, 'curator', 'gallery'], [3, 'broker', 'exchange'], [4, 'vintner', 'vineyard'], [4, 'apothecary', 'dispensary'],
  ] },
  { id: 'material', text: 'the second is made from the first', pairs: [
    [1, 'wool', 'sweater'], [1, 'flour', 'bread'], [1, 'wood', 'table'], [2, 'grape', 'wine'], [2, 'clay', 'pottery'], [2, 'milk', 'cheese'],
    [3, 'cotton', 'denim'], [3, 'sand', 'glass'], [3, 'rubber', 'tyre'], [4, 'flax', 'linen'], [4, 'pulp', 'paper'], [4, 'latex', 'glove'],
  ] },
  { id: 'player', text: 'the second plays or operates the first', pairs: [
    [1, 'piano', 'pianist'], [1, 'drum', 'drummer'], [2, 'guitar', 'guitarist'], [2, 'flute', 'flautist'], [2, 'car', 'driver'],
    [3, 'organ', 'organist'], [3, 'harp', 'harpist'], [3, 'crane', 'operator'], [4, 'cello', 'cellist'], [4, 'oboe', 'oboist'],
  ] },
  { id: 'sequence', text: 'the second comes after the first', pairs: [
    [1, 'morning', 'evening'], [1, 'spring', 'autumn'], [1, 'seed', 'plant'], [2, 'caterpillar', 'butterfly'], [2, 'dusk', 'night'], [2, 'rehearsal', 'performance'],
    [3, 'apprentice', 'master'], [3, 'draft', 'manuscript'], [3, 'larva', 'pupa'], [4, 'prologue', 'epilogue'], [4, 'novice', 'veteran'],
  ] },
  { id: 'agent', text: 'the second is the person who does the first', pairs: [
    [1, 'teach', 'teacher'], [1, 'sing', 'singer'], [1, 'bake', 'baker'], [2, 'invent', 'inventor'], [2, 'narrate', 'narrator'], [2, 'sculpt', 'sculptor'],
    [3, 'conspire', 'conspirator'], [3, 'advocate', 'advocate'], [3, 'benefact', 'benefactor'], [4, 'arbitrate', 'arbitrator'], [4, 'adjudicate', 'adjudicator'],
  ].filter((p) => p[1] !== p[2] && p[1] !== 'benefact') },
  { id: 'symptom', text: 'the second is a sign of the first', pairs: [
    [1, 'cold', 'sneeze'], [1, 'fear', 'trembling'], [2, 'fever', 'sweating'], [2, 'boredom', 'yawn'], [2, 'joy', 'laughter'],
    [3, 'fatigue', 'lethargy'], [3, 'allergy', 'rash'], [3, 'embarrassment', 'blush'], [4, 'anxiety', 'palpitation'], [4, 'guilt', 'remorse'],
  ] },
  { id: 'unit', text: 'the second is a unit for measuring the first', pairs: [
    [1, 'length', 'metre'], [1, 'time', 'minute'], [1, 'weight', 'kilogram'], [2, 'temperature', 'degree'], [2, 'area', 'hectare'], [2, 'volume', 'litre'],
    [3, 'pressure', 'pascal'], [3, 'energy', 'joule'], [3, 'frequency', 'hertz'], [4, 'luminosity', 'candela'], [4, 'charge', 'coulomb'],
  ] },
];

// Vocabulary entries: { w, level, pos, cluster, syn: [...], ant: [...] }. Clusters group near-meanings so
// distractors are drawn from different clusters only.
export const VOCAB = [
  { w: 'happy', level: 1, pos: 'adj', cluster: 'joy', syn: ['cheerful', 'glad'], ant: ['sad', 'miserable'] },
  { w: 'big', level: 1, pos: 'adj', cluster: 'size', syn: ['large', 'huge'], ant: ['small', 'tiny'] },
  { w: 'fast', level: 1, pos: 'adj', cluster: 'speed', syn: ['quick', 'rapid'], ant: ['slow', 'sluggish'] },
  { w: 'brave', level: 1, pos: 'adj', cluster: 'courage', syn: ['courageous', 'bold'], ant: ['cowardly', 'timid'] },
  { w: 'begin', level: 1, pos: 'verb', cluster: 'start', syn: ['start', 'commence'], ant: ['finish', 'end'] },
  { w: 'quiet', level: 1, pos: 'adj', cluster: 'speech', syn: ['silent', 'hushed'], ant: ['noisy', 'loud'] },
  { w: 'rich', level: 1, pos: 'adj', cluster: 'wealth', syn: ['wealthy', 'affluent'], ant: ['poor', 'destitute'] },
  { w: 'easy', level: 1, pos: 'adj', cluster: 'difficulty', syn: ['simple', 'effortless'], ant: ['difficult', 'arduous'] },
  { w: 'ancient', level: 2, pos: 'adj', cluster: 'age', syn: ['old', 'antique'], ant: ['modern', 'recent'] },
  { w: 'generous', level: 2, pos: 'adj', cluster: 'spending', syn: ['liberal', 'charitable'], ant: ['stingy', 'mean'] },
  { w: 'honest', level: 2, pos: 'adj', cluster: 'truth', syn: ['truthful', 'sincere'], ant: ['deceitful', 'dishonest'] },
  { w: 'stubborn', level: 2, pos: 'adj', cluster: 'persistence', syn: ['obstinate', 'headstrong'], ant: ['compliant', 'yielding'] },
  { w: 'cautious', level: 2, pos: 'adj', cluster: 'care', syn: ['careful', 'wary'], ant: ['reckless', 'rash'] },
  { w: 'vague', level: 2, pos: 'adj', cluster: 'clarity', syn: ['unclear', 'hazy'], ant: ['precise', 'definite'] },
  { w: 'abundant', level: 2, pos: 'adj', cluster: 'amount', syn: ['plentiful', 'ample'], ant: ['scarce', 'sparse'] },
  { w: 'reluctant', level: 2, pos: 'adj', cluster: 'willing', syn: ['unwilling', 'hesitant'], ant: ['eager', 'keen'] },
  { w: 'expand', level: 2, pos: 'verb', cluster: 'grow', syn: ['enlarge', 'extend'], ant: ['shrink', 'contract'] },
  { w: 'conceal', level: 2, pos: 'verb', cluster: 'hide', syn: ['hide', 'disguise'], ant: ['reveal', 'expose'] },
  { w: 'permanent', level: 2, pos: 'adj', cluster: 'duration', syn: ['lasting', 'enduring'], ant: ['temporary', 'fleeting'] },
  { w: 'hostile', level: 2, pos: 'adj', cluster: 'friendliness', syn: ['unfriendly', 'antagonistic'], ant: ['friendly', 'cordial'] },
  { w: 'frugal', level: 3, pos: 'adj', cluster: 'spending', syn: ['thrifty', 'economical'], ant: ['extravagant', 'wasteful'] },
  { w: 'candid', level: 3, pos: 'adj', cluster: 'truth', syn: ['frank', 'forthright'], ant: ['evasive', 'guarded'] },
  { w: 'lethargic', level: 3, pos: 'adj', cluster: 'energy', syn: ['sluggish', 'listless'], ant: ['energetic', 'lively'] },
  { w: 'meticulous', level: 3, pos: 'adj', cluster: 'care', syn: ['thorough', 'painstaking'], ant: ['careless', 'sloppy'] },
  { w: 'benevolent', level: 3, pos: 'adj', cluster: 'friendliness', syn: ['kindly', 'charitable'], ant: ['malevolent', 'spiteful'] },
  { w: 'obsolete', level: 3, pos: 'adj', cluster: 'age', syn: ['outdated', 'antiquated'], ant: ['current', 'cutting-edge'] },
  { w: 'tranquil', level: 3, pos: 'adj', cluster: 'calm', syn: ['peaceful', 'serene'], ant: ['turbulent', 'agitated'] },
  { w: 'diligent', level: 3, pos: 'adj', cluster: 'care', syn: ['industrious', 'assiduous'], ant: ['lazy', 'idle'] },
  { w: 'ambiguous', level: 3, pos: 'adj', cluster: 'clarity', syn: ['equivocal', 'unclear'], ant: ['unambiguous', 'explicit'] },
  { w: 'authentic', level: 3, pos: 'adj', cluster: 'genuine', syn: ['genuine', 'bona fide'], ant: ['fake', 'counterfeit'] },
  { w: 'prudent', level: 3, pos: 'adj', cluster: 'care', syn: ['judicious', 'sensible'], ant: ['imprudent', 'reckless'] },
  { w: 'mitigate', level: 3, pos: 'verb', cluster: 'improve', syn: ['alleviate', 'improve'], ant: ['aggravate', 'worsen'] },
  { w: 'coherent', level: 3, pos: 'adj', cluster: 'clarity', syn: ['consistent', 'logical'], ant: ['incoherent', 'muddled'] },
  { w: 'novice', level: 3, pos: 'noun', cluster: 'experience', syn: ['beginner', 'apprentice'], ant: ['expert', 'veteran'] },
  { w: 'ephemeral', level: 4, pos: 'adj', cluster: 'duration', syn: ['fleeting', 'transient'], ant: ['permanent', 'perpetual'] },
  { w: 'laconic', level: 4, pos: 'adj', cluster: 'speech', syn: ['terse', 'concise'], ant: ['verbose', 'loquacious'] },
  { w: 'gregarious', level: 4, pos: 'adj', cluster: 'sociability', syn: ['sociable', 'outgoing'], ant: ['reclusive', 'solitary'] },
  { w: 'parsimonious', level: 4, pos: 'adj', cluster: 'spending', syn: ['miserly', 'penny-pinching'], ant: ['generous', 'munificent'] },
  { w: 'ubiquitous', level: 4, pos: 'adj', cluster: 'amount', syn: ['omnipresent', 'pervasive'], ant: ['rare', 'scarce'] },
  { w: 'obdurate', level: 4, pos: 'adj', cluster: 'persistence', syn: ['obstinate', 'unyielding'], ant: ['amenable', 'pliant'] },
  { w: 'sagacious', level: 4, pos: 'adj', cluster: 'care', syn: ['wise', 'shrewd'], ant: ['foolish', 'obtuse'] },
  { w: 'ameliorate', level: 4, pos: 'verb', cluster: 'improve', syn: ['improve', 'better'], ant: ['worsen', 'exacerbate'] },
  { w: 'capitulate', level: 4, pos: 'verb', cluster: 'yield', syn: ['surrender', 'yield'], ant: ['resist', 'withstand'] },
  { w: 'perfunctory', level: 4, pos: 'adj', cluster: 'care', syn: ['cursory', 'half-hearted'], ant: ['thorough', 'diligent'] },
  { w: 'taciturn', level: 4, pos: 'adj', cluster: 'speech', syn: ['reticent', 'uncommunicative'], ant: ['talkative', 'garrulous'] },
  { w: 'insipid', level: 4, pos: 'adj', cluster: 'flavour', syn: ['bland', 'flavourless'], ant: ['piquant', 'zesty'] },
  { w: 'venerate', level: 4, pos: 'verb', cluster: 'respect', syn: ['revere', 'esteem'], ant: ['despise', 'scorn'] },
  { w: 'opulent', level: 4, pos: 'adj', cluster: 'wealth', syn: ['lavish', 'sumptuous'], ant: ['austere', 'spartan'] },
  { w: 'tenacious', level: 4, pos: 'adj', cluster: 'persistence', syn: ['persistent', 'dogged'], ant: ['irresolute', 'yielding'] },
  { w: 'prolific', level: 4, pos: 'adj', cluster: 'output', syn: ['productive', 'fruitful'], ant: ['barren', 'unproductive'] },
];

// Odd-one-out: four members of one set and one intruder from a confusable set.
export const ODD_SETS = [
  { level: 1, name: 'fruits', words: ['apple', 'pear', 'plum', 'cherry', 'mango', 'peach'], intruders: { name: 'vegetables', words: ['carrot', 'onion', 'leek', 'turnip'] } },
  { level: 1, name: 'mammals', words: ['dog', 'cow', 'horse', 'whale', 'bat', 'goat'], intruders: { name: 'birds', words: ['sparrow', 'eagle', 'robin', 'heron'] } },
  { level: 1, name: 'colours', words: ['red', 'blue', 'green', 'violet', 'amber', 'crimson'], intruders: { name: 'shapes', words: ['square', 'oval', 'cube', 'triangle'] } },
  { level: 2, name: 'metals', words: ['copper', 'iron', 'zinc', 'tin', 'nickel', 'silver'], intruders: { name: 'gems', words: ['ruby', 'opal', 'topaz', 'jade'] } },
  { level: 2, name: 'string instruments', words: ['violin', 'cello', 'harp', 'guitar', 'banjo', 'lute'], intruders: { name: 'wind instruments', words: ['flute', 'oboe', 'trumpet', 'clarinet'] } },
  { level: 2, name: 'planets', words: ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Neptune', 'Mercury'], intruders: { name: 'stars and moons', words: ['Sirius', 'Titan', 'Europa', 'Vega'] } },
  { level: 2, name: 'units of time', words: ['second', 'minute', 'hour', 'week', 'decade', 'fortnight'], intruders: { name: 'units of length', words: ['metre', 'mile', 'inch', 'furlong'] } },
  { level: 3, name: 'reptiles', words: ['lizard', 'crocodile', 'tortoise', 'iguana', 'gecko', 'cobra'], intruders: { name: 'amphibians', words: ['frog', 'newt', 'toad', 'salamander'] } },
  { level: 3, name: 'poetic forms', words: ['sonnet', 'haiku', 'limerick', 'ballad', 'ode', 'elegy'], intruders: { name: 'prose forms', words: ['novel', 'essay', 'memoir', 'fable'] } },
  { level: 3, name: 'igneous rocks', words: ['granite', 'basalt', 'pumice', 'obsidian', 'gabbro'], intruders: { name: 'sedimentary rocks', words: ['sandstone', 'limestone', 'shale', 'chalk'] } },
  { level: 3, name: 'currencies', words: ['krona', 'rupee', 'peso', 'yen', 'zloty', 'rand'], intruders: { name: 'languages', words: ['Swahili', 'Tagalog', 'Basque', 'Urdu'] } },
  { level: 4, name: 'logical fallacies', words: ['straw man', 'ad hominem', 'red herring', 'slippery slope', 'false dilemma'], intruders: { name: 'figures of speech', words: ['metaphor', 'hyperbole', 'simile', 'irony'] } },
  { level: 4, name: 'bones', words: ['femur', 'tibia', 'ulna', 'clavicle', 'scapula', 'patella'], intruders: { name: 'muscles', words: ['biceps', 'deltoid', 'triceps', 'gluteus'] } },
  { level: 4, name: 'philosophical schools', words: ['stoicism', 'empiricism', 'existentialism', 'utilitarianism', 'rationalism'], intruders: { name: 'art movements', words: ['cubism', 'surrealism', 'baroque', 'impressionism'] } },
  { level: 4, name: 'cloud types', words: ['cumulus', 'stratus', 'cirrus', 'nimbus', 'altostratus'], intruders: { name: 'wind names', words: ['mistral', 'sirocco', 'chinook', 'monsoon'] } },
];
