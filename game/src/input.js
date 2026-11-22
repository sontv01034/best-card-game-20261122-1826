// Input: mouse clicks and keyboard, turned into rule calls. One file, one
// job: it reads clicks and keys, asks the state module whether the move is
// legal, and tells the app to re-render and play a sound.

import { cardDef } from './config.js';
import { playCard, castTargetedSpell, attack, endTurn, startTurn } from './state.js';
import { aiTakeTurn } from './ai.js';
import { sfx } from './audio.js';

// The app hands input a small bridge: {game, rerender, scheduleAi} so this
// file never touches the DOM root or timers directly.
export function bindInput(root, bridge) {
  root.addEventListener('click', (event) => {
    const node = event.target.closest('[data-action]');
    if (!node) return;
    handleAction(node.dataset.action, node.dataset, bridge);
  });

  document.addEventListener('keydown', (event) => {
    const game = bridge.game;
    if (event.key === 'Escape') {
      game.selectedHand = -1;
      game.selectedAttacker = null;
      game.pendingSpell = null;
      bridge.rerender();
      return;
    }
    if (game.phase !== 'play' || game.turn !== 'player') return;
    if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') {
      if (event.key === 'Enter' && game.selectedHand < 0 && game.selectedAttacker === null) {
        doEndTurn(bridge);
      } else if (event.key === 'e' || event.key === 'E') {
        doEndTurn(bridge);
      }
      return;
    }
    const n = Number.parseInt(event.key, 10);
    if (n >= 1 && n <= game.player.hand.length) {
      selectHandCard(bridge, n - 1);
    }
  });
}

function handleAction(action, data, bridge) {
  const game = bridge.game;
  if (action === 'start') {
    game.phase = 'play';
    startTurn(game, 'player');
    sfx.play();
    bridge.rerender();
    return;
  }
  if (action === 'restart') {
    bridge.restart();
    return;
  }
  if (game.phase !== 'play') return;
  if (action === 'end-turn') {
    if (game.turn === 'player') doEndTurn(bridge);
    return;
  }
  if (game.turn !== 'player') return;

  if (action === 'hand') selectHandCard(bridge, Number.parseInt(data.index, 10));
  else if (action === 'own-creature') selectAttacker(bridge, Number.parseInt(data.creatureId, 10));
  else if (action === 'enemy-creature') pickTarget(bridge, { kind: 'creature', who: 'ai', id: Number.parseInt(data.creatureId, 10) });
  else if (action === 'enemy-hero') pickTarget(bridge, { kind: 'hero', who: 'ai' });
}

function selectHandCard(bridge, index) {
  const game = bridge.game;
  if (game.pendingSpell) { game.pendingSpell = null; }
  game.selectedAttacker = null;
  if (game.selectedHand === index) {
    game.selectedHand = -1;
    bridge.rerender();
    return;
  }
  game.selectedHand = index;
  const result = playCard(game, 'player', index);
  if (result.needsTarget) {
    game.pendingSpell = { handIndex: index };
    game.selectedHand = -1;
    sfx.draw();
    bridge.rerender();
    return;
  }
  if (result.ok) {
    game.selectedHand = -1;
    sfx.play();
    bridge.afterMove();
  } else {
    sfx.error();
    game.lastEvent = { kind: 'error', text: result.reason };
    bridge.rerender();
  }
}

function selectAttacker(bridge, creatureId) {
  const game = bridge.game;
  game.pendingSpell = null;
  game.selectedHand = -1;
  const creature = game.player.board.find((c) => c.id === creatureId);
  if (!creature) return;
  if (!creature.canAttack) {
    sfx.error();
    game.lastEvent = { kind: 'error', text: `${cardDef(creature.cardId).name} rests this turn` };
    bridge.rerender();
    return;
  }
  game.selectedAttacker = game.selectedAttacker === creatureId ? null : creatureId;
  sfx.draw();
  bridge.rerender();
}

function pickTarget(bridge, target) {
  const game = bridge.game;
  if (game.pendingSpell) {
    const { handIndex } = game.pendingSpell;
    game.pendingSpell = null;
    const result = castTargetedSpell(game, 'player', handIndex, target);
    if (result.ok) {
      sfx.attack();
      bridge.afterMove();
    } else {
      sfx.error();
      game.lastEvent = { kind: 'error', text: result.reason };
      bridge.rerender();
    }
    return;
  }
  if (game.selectedAttacker !== null) {
    const attackerId = game.selectedAttacker;
    game.selectedAttacker = null;
    const result = attack(game, 'player', attackerId, target);
    if (result.ok) {
      sfx.attack();
      bridge.afterMove();
    } else {
      sfx.error();
      game.lastEvent = { kind: 'error', text: result.reason };
      bridge.rerender();
    }
  }
}

function doEndTurn(bridge) {
  const game = bridge.game;
  if (endTurn(game)) {
    sfx.draw();
    bridge.rerender();
    bridge.scheduleAi();
  }
}

// Runs the Warden's turn with a readable pause, then hands back control.
export function runAiTurn(bridge) {
  const game = bridge.game;
  if (game.phase !== 'play' || game.turn !== 'ai') return;
  aiTakeTurn(game);
  if (game.phase === 'over') {
    if (game.winner === 'ai') sfx.lose();
    bridge.rerender();
    return;
  }
  startTurn(game, 'player');
  bridge.rerender();
}
