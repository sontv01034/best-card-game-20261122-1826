// Deck building, shuffling and drawing. One file, one job: nothing here knows
// whose turn it is or what the table looks like.

import { CARD_DEFS, DECK_COUNTS } from './config.js';

export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    const copies = DECK_COUNTS[def.id] ?? 2;
    for (let i = 0; i < copies; i++) deck.push(def.id);
  }
  return deck;
}

export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Draws up to n cards into hand. Returns the drawn ids; a deck that runs out
// simply stops drawing (no fatigue damage — the duel is decided by the board).
export function drawCards(deck, hand, n, maxHand) {
  const drawn = [];
  while (drawn.length < n && deck.length > 0 && hand.length < maxHand) {
    const id = deck.pop();
    hand.push(id);
    drawn.push(id);
  }
  return drawn;
}
