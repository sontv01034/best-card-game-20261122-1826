// The game state and the rules that change it. One file, one job: every rule
// lives here — turns, embers, playing cards, combat, taunt, winning, losing.
// Rendering and input never mutate state directly; they call these functions.

import {
  STARTING_HP, MAX_HP, MAX_EMBERS, MAX_BOARD, MAX_HAND,
  OPENING_HAND, cardDef,
} from './config.js';
import { buildDeck, shuffle, drawCards } from './deck.js';

let nextCreatureId = 1;

function makeSide() {
  return {
    hp: STARTING_HP,
    maxEmbers: 0, // startTurn raises this to 1 on a side's first turn
    embers: 0,
    deck: shuffle(buildDeck()),
    hand: [],
    board: [],
  };
}

export function createGame() {
  const game = {
    phase: 'title', // 'title' | 'play' | 'over'
    turn: 'player',
    turnNumber: 0, // startTurn raises this to 1 on the player's first turn
    winner: null, // 'player' | 'ai' | null
    log: ['The court assembles. Draw your opening hand.'],
    player: makeSide(),
    ai: makeSide(),
    selectedHand: -1, // index into the player's hand, -1 = none
    selectedAttacker: null, // creature id, null = none
    pendingSpell: null, // {handIndex} while a targeted spell waits for a target
    lastEvent: null, // {kind, text} for the floating banner
  };
  drawCards(game.player.deck, game.player.hand, OPENING_HAND, MAX_HAND);
  drawCards(game.ai.deck, game.ai.hand, OPENING_HAND, MAX_HAND);
  return game;
}

function sideOf(game, who) {
  return who === 'player' ? game.player : game.ai;
}

function otherOf(game, who) {
  return who === 'player' ? game.ai : game.player;
}

export function log(game, text) {
  game.log.unshift(text);
  if (game.log.length > 6) game.log.length = 6;
}

function summon(game, who, cardId) {
  const def = cardDef(cardId);
  const creature = {
    id: nextCreatureId++,
    cardId,
    attack: def.attack,
    health: def.health,
    maxHealth: def.health,
    taunt: !!def.taunt,
    canAttack: false, // summoning dusk: a creature rests the turn it is played
  };
  sideOf(game, who).board.push(creature);
  return creature;
}

function applyBattlecry(game, who, def) {
  const side = sideOf(game, who);
  if (def.battlecry === 'draw') {
    const drawn = drawCards(side.deck, side.hand, 1, MAX_HAND);
    if (drawn.length) log(game, `${who === 'player' ? 'You draw' : 'Warden draws'} a card.`);
  }
  if (def.battlecry === 'heal' && def.heal) {
    side.hp = Math.min(MAX_HP, side.hp + def.heal);
    log(game, `${who === 'player' ? 'You restore' : 'Warden restores'} ${def.heal} life.`);
  }
}

function checkEnd(game) {
  if (game.player.hp <= 0 && game.ai.hp <= 0) {
    game.winner = 'player'; // the attacker wins a mutual fall
  } else if (game.ai.hp <= 0) {
    game.winner = 'player';
  } else if (game.player.hp <= 0) {
    game.winner = 'ai';
  }
  if (game.winner) {
    game.phase = 'over';
    game.selectedHand = -1;
    game.selectedAttacker = null;
    log(game, game.winner === 'player' ? 'The Warden falls. The court is yours.' : 'The Warden takes the court.');
  }
  return game.winner !== null;
}

// Start a side's turn: one more ember crystal, a full refill, a card drawn,
// and every creature on that side ready to attack.
export function startTurn(game, who) {
  const side = sideOf(game, who);
  side.maxEmbers = Math.min(MAX_EMBERS, side.maxEmbers + 1);
  side.embers = side.maxEmbers;
  drawCards(side.deck, side.hand, 1, MAX_HAND);
  for (const creature of side.board) creature.canAttack = true;
  game.turn = who;
  if (who === 'player') game.turnNumber++;
  log(game, who === 'player' ? `Turn ${game.turnNumber}: your move.` : 'The Warden takes the table.');
}

export function endTurn(game) {
  if (game.phase !== 'play' || game.turn !== 'player') return false;
  game.selectedHand = -1;
  game.selectedAttacker = null;
  startTurn(game, 'ai');
  return true;
}

// Play the hand card at index. Spells that need a target return
// {needsTarget: true} and wait for a target pick; everything else resolves.
export function playCard(game, who, handIndex) {
  const side = sideOf(game, who);
  const cardId = side.hand[handIndex];
  if (cardId === undefined) return { ok: false, reason: 'no card there' };
  const def = cardDef(cardId);
  if (side.embers < def.cost) return { ok: false, reason: 'not enough embers' };
  if (def.kind === 'creature' && side.board.length >= MAX_BOARD) {
    return { ok: false, reason: 'your side of the table is full' };
  }
  if (def.kind === 'spell' && def.target === 'any') {
    return { ok: true, needsTarget: true, cardId, handIndex };
  }
  side.embers -= def.cost;
  side.hand.splice(handIndex, 1);
  return resolveCard(game, who, cardId, null);
}

function resolveCard(game, who, cardId, target) {
  const def = cardDef(cardId);
  const side = sideOf(game, who);
  const foe = otherOf(game, who);
  const whoName = who === 'player' ? 'You play' : 'Warden plays';
  if (def.kind === 'creature') {
    summon(game, who, cardId);
    log(game, `${whoName} ${def.name} (${def.attack}/${def.health}).`);
    applyBattlecry(game, who, def);
  } else if (def.target === 'all-enemies') {
    for (const creature of [...foe.board]) damageCreature(game, foe, creature, def.damage);
    log(game, `${whoName} ${def.name}: ${def.damage} damage to every enemy creature.`);
  } else if (def.target === 'none') {
    if (def.draw) {
      drawCards(side.deck, side.hand, def.draw, MAX_HAND);
      log(game, `${whoName} ${def.name} and draw${def.draw > 1 ? ` ${def.draw} cards` : ' a card'}.`);
    }
  } else if (target) {
    // target: {kind: 'hero', who} or {kind: 'creature', who, id}
    if (target.kind === 'hero') {
      const victim = sideOf(game, target.who);
      victim.hp -= def.damage;
      log(game, `${whoName} ${def.name} for ${def.damage} to ${target.who === 'player' ? 'you' : 'the Warden'}.`);
    } else {
      const victimSide = sideOf(game, target.who);
      const creature = victimSide.board.find((c) => c.id === target.id);
      if (creature) {
        damageCreature(game, victimSide, creature, def.damage);
        log(game, `${whoName} ${def.name} for ${def.damage} on ${cardDef(creature.cardId).name}.`);
      }
    }
    if (def.draw) drawCards(side.deck, side.hand, def.draw, MAX_HAND);
  }
  game.lastEvent = { kind: 'play', text: def.name };
  checkEnd(game);
  return { ok: true, resolved: true, cardId };
}

// Finish a targeted spell after the player picked a target.
export function castTargetedSpell(game, who, handIndex, target) {
  const side = sideOf(game, who);
  const cardId = side.hand[handIndex];
  if (cardId === undefined) return { ok: false, reason: 'no card there' };
  const def = cardDef(cardId);
  if (side.embers < def.cost) return { ok: false, reason: 'not enough embers' };
  side.embers -= def.cost;
  side.hand.splice(handIndex, 1);
  return resolveCard(game, who, cardId, target);
}

function damageCreature(game, side, creature, amount) {
  creature.health -= amount;
  if (creature.health <= 0) {
    side.board = side.board.filter((c) => c.id !== creature.id);
    log(game, `${cardDef(creature.cardId).name} is destroyed.`);
  }
}

// Attack with a creature. target: {kind:'hero'} or {kind:'creature', id}.
// Taunt: while the foe has any taunt creature, only taunt creatures (or the
// hero behind none of them — no: taunt must be attacked first) may be hit.
export function attack(game, who, attackerId, target) {
  const side = sideOf(game, who);
  const foe = otherOf(game, who);
  const attacker = side.board.find((c) => c.id === attackerId);
  if (!attacker) return { ok: false, reason: 'no such creature' };
  if (!attacker.canAttack) return { ok: false, reason: 'it rests this turn' };
  const taunts = foe.board.filter((c) => c.taunt);
  if (target.kind === 'creature') {
    const victim = foe.board.find((c) => c.id === target.id);
    if (!victim) return { ok: false, reason: 'no such target' };
    if (taunts.length && !victim.taunt) {
      return { ok: false, reason: 'a Thornwall stands in the way' };
    }
    attacker.canAttack = false;
    damageCreature(game, foe, victim, attacker.attack);
    damageCreature(game, side, attacker, victim.attack);
    log(game, `${cardDef(attacker.cardId).name} strikes ${cardDef(victim.cardId).name}.`);
  } else {
    if (taunts.length) return { ok: false, reason: 'a Thornwall stands in the way' };
    attacker.canAttack = false;
    foe.hp -= attacker.attack;
    log(game, `${cardDef(attacker.cardId).name} hits ${who === 'player' ? 'the Warden' : 'you'} for ${attacker.attack}.`);
  }
  game.lastEvent = { kind: 'attack', text: cardDef(attacker.cardId).name };
  checkEnd(game);
  return { ok: true };
}

export function legalTargets(game, who) {
  const foe = otherOf(game, who);
  const taunts = foe.board.filter((c) => c.taunt);
  const creatures = (taunts.length ? taunts : foe.board).map((c) => ({ kind: 'creature', id: c.id }));
  return { creatures, hero: taunts.length === 0 };
}
