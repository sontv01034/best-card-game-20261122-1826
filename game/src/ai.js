// The Warden's brain. One file, one job: given a game state on the AI's turn,
// decide what to play and what to attack. Deliberately readable: the player
// can learn its habits and play around them.
//
// Habits: play the most expensive creature it can afford first (a full table
// beats a full hand), save direct damage for the face unless a big threat
// must die, draw when the hand is thin, and always clear a taunt before
// going for the face.

import { cardDef } from './config.js';
import { playCard, castTargetedSpell, attack, legalTargets } from './state.js';

function scorePlay(game, handIndex) {
  const def = cardDef(game.ai.hand[handIndex]);
  if (def.kind === 'creature') return 100 + def.cost * 10 + def.attack * 5 + def.health;
  if (def.target === 'all-enemies') return game.player.board.length >= 2 ? 90 : 10;
  if (def.target === 'none') return game.ai.hand.length <= 2 ? 95 : 20; // draw when thin
  return 50; // targeted damage: decided at cast time
}

export function aiTakeTurn(game) {
  // Play cards, most valuable first, until nothing affordable remains.
  let guard = 0;
  while (guard++ < 20) {
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < game.ai.hand.length; i++) {
      const def = cardDef(game.ai.hand[i]);
      if (def.cost > game.ai.embers) continue;
      if (def.kind === 'creature' && game.ai.board.length >= 5) continue;
      const score = scorePlay(game, i);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    const def = cardDef(game.ai.hand[best]);
    if (def.kind === 'spell' && def.target === 'any') {
      // Face for the kill, else the player's biggest creature.
      const target = pickSpellTarget(game, def);
      const result = castTargetedSpell(game, 'ai', best, target);
      if (!result.ok) break;
    } else {
      const result = playCard(game, 'ai', best);
      if (!result.ok) break;
    }
    if (game.phase === 'over') return;
  }

  // Attack with every ready creature: taunt first, then the face, unless the
  // player's board holds something worth trading into.
  for (const creature of [...game.ai.board]) {
    if (game.phase === 'over') return;
    if (!creature.canAttack) continue;
    const targets = legalTargets(game, 'ai');
    const taunt = targets.creatures[0];
    if (taunt) {
      attack(game, 'ai', creature.id, { kind: 'creature', id: taunt.id });
      continue;
    }
    const prey = weakestTrade(game, creature);
    if (prey) {
      attack(game, 'ai', creature.id, { kind: 'creature', id: prey.id });
    } else {
      attack(game, 'ai', creature.id, { kind: 'hero' });
    }
  }
}

function pickSpellTarget(game, def) {
  const foe = game.player;
  if (foe.hp <= def.damage) return { kind: 'hero', who: 'player' };
  let biggest = null;
  for (const creature of foe.board) {
    if (!biggest || creature.attack > biggest.attack) biggest = creature;
  }
  // Spend the burn on a real threat, not on a 1/1.
  if (biggest && biggest.attack >= 3) return { kind: 'creature', who: 'player', id: biggest.id };
  return { kind: 'hero', who: 'player' };
}

// A trade is worth it when the enemy creature dies to this attack and the
// attacker survives, or when the enemy is a taunt the AI must clear anyway.
function weakestTrade(game, attacker) {
  let prey = null;
  for (const creature of game.player.board) {
    if (creature.health <= attacker.attack && creature.attack < attacker.health) {
      if (!prey || creature.attack < prey.attack) prey = creature;
    }
  }
  return prey;
}
