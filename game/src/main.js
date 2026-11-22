// Bootstrap: wires state, rendering and input together, and nothing else.
// The ?shot= parameter stages a real game state for screenshots — title,
// a mid-game table, a win and a loss — each rendered by the same code the
// player sees. It is a testing hook, not a separate scene.

import { createGame, startTurn, log } from './state.js';
import { render } from './render.js';
import { bindInput, runAiTurn } from './input.js';
import { sfx } from './audio.js';

const root = document.getElementById('root');
let game = createGame();

const bridge = {
  get game() { return game; },
  rerender() { render(game, root); },
  afterMove() {
    if (game.phase === 'over') {
      if (game.winner === 'player') sfx.win();
      else sfx.lose();
    }
    render(game, root);
  },
  scheduleAi() {
    setTimeout(() => runAiTurn(bridge), 900);
  },
  restart() {
    game = createGame();
    game.phase = 'play';
    startTurn(game, 'player');
    render(game, root);
  },
};

bindInput(root, bridge);

// Stage a scripted mid-game table: creatures on both sides, a taunt
// standing, hands full, life totals dented — the game as it looks at
// its most interesting, built only from the state's own pieces.
function stageTable() {
  game.phase = 'play';
  game.turnNumber = 6;
  const put = (who, cardId, attack, health, canAttack) => {
    const side = who === 'player' ? game.player : game.ai;
    side.board.push({
      id: 100 + side.board.length + (who === 'ai' ? 50 : 0),
      cardId, attack, health, maxHealth: health, taunt: cardId === 'thornwall', canAttack,
    });
  };
  game.player.hp = 18;
  game.player.maxEmbers = 6;
  game.player.embers = 4;
  game.player.hand = ['ember-imp', 'flame-lash', 'tidecaller', 'thornbloom', 'storm-crow', 'spark-volley'];
  put('player', 'cinder-hound', 3, 2, true);
  put('player', 'thornwall', 1, 5, false);
  put('player', 'storm-crow', 4, 3, true);
  game.ai.hp = 24;
  game.ai.maxEmbers = 6;
  game.ai.embers = 2;
  game.ai.hand = ['ember-imp', 'cinder-hound', 'ash-phoenix', 'flame-lash', 'tide-surge'];
  put('ai', 'ash-phoenix', 5, 5, false);
  put('ai', 'tidecaller', 1, 3, false);
  put('ai', 'ember-titan', 7, 4, false);
  game.turn = 'player';
  game.log = [
    'Turn 6: your move.',
    'The Warden plays Ash Phoenix (5/5).',
    'Storm Crow strikes the Warden for 4.',
    'You play Thornwall (1/5).',
  ];
  game.selectedHand = 1;
}

const shot = new URLSearchParams(window.location.search).get('shot');
if (shot === 'table' || shot === 'win' || shot === 'loss') {
  stageTable();
  if (shot === 'win') {
    game.ai.hp = 0;
    game.phase = 'over';
    game.winner = 'player';
    game.log.unshift('The Warden falls. The court is yours.');
  }
  if (shot === 'loss') {
    game.player.hp = 0;
    game.phase = 'over';
    game.winner = 'ai';
    game.log.unshift('The Warden takes the court.');
  }
}

render(game, root);
