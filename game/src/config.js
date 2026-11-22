// Ember Court — the card definitions and the numbers the whole game shares.
// One file, one job: every card, every suit, every tuning constant lives here
// so the rules can be read (and rebalanced) without touching the engine.

export const STARTING_HP = 30;
export const MAX_HP = 30;
export const MAX_EMBERS = 10;
export const MAX_BOARD = 5;
export const MAX_HAND = 8;
export const OPENING_HAND = 3;
export const STARTING_EMBERS = 1;

// The four suits. Colour AND shape tell them apart, never text alone.
export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e2483a', dark: '#7d1f16', glow: '#ff8a5c' },
  tide: { name: 'Tide', glyph: '●', color: '#2f7fd0', dark: '#123f6e', glow: '#7cc0ff' },
  thorn: { name: 'Thorn', glyph: '◆', color: '#3f9e4d', dark: '#174d22', glow: '#8fe08a' },
  gale: { name: 'Gale', glyph: '✦', color: '#d9a521', dark: '#6e5207', glow: '#ffd94d' },
};

// kind: 'creature' stays on the table and attacks; 'spell' resolves at once.
// battlecry: 'draw' | 'heal' | null. taunt: attackers must clear it first.
export const CARD_DEFS = [
  { id: 'ember-imp', name: 'Ember Imp', suit: 'flame', cost: 1, kind: 'creature', attack: 2, health: 1, text: 'A spark with teeth.' },
  { id: 'gale-scout', name: 'Gale Scout', suit: 'gale', cost: 1, kind: 'creature', attack: 2, health: 1, text: 'First over the wall.' },
  { id: 'frostbind', name: 'Frostbind', suit: 'tide', cost: 1, kind: 'spell', text: 'Deal 2 damage, draw a card.', damage: 2, draw: 1, target: 'any' },
  { id: 'cinder-hound', name: 'Cinder Hound', suit: 'flame', cost: 2, kind: 'creature', attack: 3, health: 2, text: 'It hunts the warm.' },
  { id: 'tidecaller', name: 'Tidecaller', suit: 'tide', cost: 2, kind: 'creature', attack: 1, health: 3, battlecry: 'draw', text: 'Draw a card.' },
  { id: 'thornwall', name: 'Thornwall', suit: 'thorn', cost: 2, kind: 'creature', attack: 1, health: 5, taunt: true, text: 'Taunt. The wall bites back.' },
  { id: 'flame-lash', name: 'Flame Lash', suit: 'flame', cost: 2, kind: 'spell', text: 'Deal 3 damage.', damage: 3, target: 'any' },
  { id: 'rootmender', name: 'Rootmender', suit: 'thorn', cost: 3, kind: 'creature', attack: 2, health: 4, battlecry: 'heal', heal: 4, text: 'Restore 4 life.' },
  { id: 'storm-crow', name: 'Storm Crow', suit: 'gale', cost: 3, kind: 'creature', attack: 4, health: 3, text: 'It arrives with the weather.' },
  { id: 'spark-volley', name: 'Spark Volley', suit: 'gale', cost: 3, kind: 'spell', text: 'Deal 2 damage to all enemy creatures.', damage: 2, target: 'all-enemies' },
  { id: 'tide-surge', name: 'Tide Surge', suit: 'tide', cost: 4, kind: 'spell', text: 'Draw 3 cards.', draw: 3, target: 'none' },
  { id: 'thornbloom', name: 'Thornbloom', suit: 'thorn', cost: 4, kind: 'creature', attack: 3, health: 6, battlecry: 'heal', heal: 6, text: 'Restore 6 life.' },
  { id: 'ash-phoenix', name: 'Ash Phoenix', suit: 'flame', cost: 5, kind: 'creature', attack: 5, health: 5, text: 'It has burned before.' },
  { id: 'ember-titan', name: 'Ember Titan', suit: 'flame', cost: 6, kind: 'creature', attack: 7, health: 7, text: 'The court kneels.' },
];

// How many copies of each card a deck holds. Two of everything, plus a third
// Imp and a third Scout so the early turns always have something to play.
export const DECK_COUNTS = { 'ember-imp': 3, 'gale-scout': 3 };
for (const def of CARD_DEFS) {
  if (!(def.id in DECK_COUNTS)) DECK_COUNTS[def.id] = 2;
}

export function cardDef(id) {
  return CARD_DEFS.find((d) => d.id === id);
}
