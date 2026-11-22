// Rendering: game state -> DOM. One file, one job: this file never changes
// the rules, it only shows them. The whole table is rebuilt on every change,
// so the DOM is always a pure picture of the state.

import { SUITS, cardDef, MAX_HP } from './config.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function hpBar(hp) {
  const wrap = el('div', 'hpbar');
  const fill = el('div', 'hpfill');
  fill.style.width = `${Math.max(0, Math.min(100, (hp / MAX_HP) * 100))}%`;
  if (hp <= 10) fill.classList.add('low');
  wrap.appendChild(fill);
  wrap.appendChild(el('span', 'hptext', `${Math.max(0, hp)} / ${MAX_HP}`));
  return wrap;
}

function emberRow(side) {
  const row = el('div', 'embers');
  for (let i = 0; i < side.maxEmbers; i++) {
    const gem = el('span', 'ember' + (i < side.embers ? ' full' : ''));
    gem.textContent = '⬢';
    row.appendChild(gem);
  }
  row.appendChild(el('span', 'ember-count', `${side.embers}/${side.maxEmbers}`));
  return row;
}

function cardFace(def, opts = {}) {
  const card = el('div', `card suit-${def.suit}`);
  if (opts.selected) card.classList.add('selected');
  if (opts.playable) card.classList.add('playable');
  if (opts.dim) card.classList.add('dim');
  if (opts.dealt) card.classList.add('dealt');
  card.appendChild(el('div', 'cost', String(def.cost)));
  card.appendChild(el('div', 'card-name', def.name));
  const art = el('div', 'card-art', SUITS[def.suit].glyph);
  card.appendChild(art);
  card.appendChild(el('div', 'card-text', def.text));
  if (def.kind === 'creature') {
    const stats = el('div', 'card-stats');
    stats.appendChild(el('span', 'atk', String(def.attack)));
    if (def.taunt) stats.appendChild(el('span', 'taunt-tag', 'TAUNT'));
    stats.appendChild(el('span', 'hp', String(def.health)));
    card.appendChild(stats);
  } else {
    card.appendChild(el('div', 'card-type', 'SPELL'));
  }
  return card;
}

function creatureFace(game, who, creature, opts = {}) {
  const def = cardDef(creature.cardId);
  const card = el('div', `card creature suit-${def.suit}`);
  if (opts.selected) card.classList.add('selected');
  if (opts.targetable) card.classList.add('targetable');
  if (opts.ready) card.classList.add('ready');
  if (!creature.canAttack) card.classList.add('resting');
  card.dataset.creatureId = creature.id;
  card.appendChild(el('div', 'card-name', def.name));
  card.appendChild(el('div', 'card-art', SUITS[def.suit].glyph));
  const stats = el('div', 'card-stats');
  stats.appendChild(el('span', 'atk', String(creature.attack)));
  if (creature.taunt) stats.appendChild(el('span', 'taunt-tag', 'TAUNT'));
  stats.appendChild(el('span', 'hp', `${creature.health}/${creature.maxHealth}`));
  card.appendChild(stats);
  return card;
}

function heroPanel(game, who, opts = {}) {
  const side = who === 'player' ? game.player : game.ai;
  const panel = el('div', `hero ${who}`);
  if (opts.targetable) panel.classList.add('targetable');
  panel.appendChild(el('div', 'hero-name', who === 'player' ? 'You — the Ember Heir' : 'Warden of Cinders'));
  panel.appendChild(hpBar(side.hp));
  panel.appendChild(emberRow(side));
  return panel;
}

export function render(game, root) {
  root.innerHTML = '';
  const app = el('div', 'app');

  if (game.phase === 'title') {
    app.appendChild(titleScreen(game));
    root.appendChild(app);
    return;
  }

  // Opponent row: hero panel, face-down hand, board.
  const foe = el('div', 'side foe');
  const foeTop = el('div', 'side-top');
  const foeHero = heroPanel(game, 'ai', { targetable: !!game.pendingSpell || game.selectedAttacker !== null });
  foeHero.dataset.action = 'enemy-hero';
  foeTop.appendChild(foeHero);
  const foeHand = el('div', 'mini-hand');
  for (let i = 0; i < game.ai.hand.length; i++) foeHand.appendChild(el('div', 'card-back'));
  foeHand.appendChild(el('span', 'hand-count', `${game.ai.hand.length} cards`));
  foeTop.appendChild(foeHand);
  foe.appendChild(foeTop);
  const foeBoard = el('div', 'board');
  for (const creature of game.ai.board) {
    const node = creatureFace(game, 'ai', creature, {
      targetable: targeting(game, 'ai', creature.id),
    });
    node.dataset.action = 'enemy-creature';
    foeBoard.appendChild(node);
  }
  if (!game.ai.board.length) foeBoard.appendChild(el('div', 'board-empty', 'The Warden’s side stands empty.'));
  foe.appendChild(foeBoard);
  app.appendChild(foe);

  // Middle: log, banner, end turn.
  const mid = el('div', 'mid');
  const logBox = el('div', 'log');
  for (const line of game.log) logBox.appendChild(el('div', 'log-line', line));
  mid.appendChild(logBox);
  if (game.lastEvent) mid.appendChild(el('div', 'banner', game.lastEvent.text));
  const endBtn = el('button', 'end-turn', game.turn === 'player' ? 'End Turn  ⏎' : 'Warden thinking…');
  endBtn.dataset.action = 'end-turn';
  endBtn.disabled = game.turn !== 'player' || game.phase !== 'play';
  mid.appendChild(endBtn);
  app.appendChild(mid);

  // Player row: board, then hero + hand.
  const me = el('div', 'side me');
  const myBoard = el('div', 'board');
  for (const creature of game.player.board) {
    const node = creatureFace(game, 'player', creature, {
      selected: game.selectedAttacker === creature.id,
      ready: game.turn === 'player' && creature.canAttack,
      targetable: false,
    });
    node.dataset.action = 'own-creature';
    myBoard.appendChild(node);
  }
  if (!game.player.board.length) myBoard.appendChild(el('div', 'board-empty', 'Your side stands empty — play a creature.'));
  me.appendChild(myBoard);
  const myTop = el('div', 'side-top');
  myTop.appendChild(heroPanel(game, 'player'));
  const hand = el('div', 'hand');
  game.player.hand.forEach((cardId, i) => {
    const def = cardDef(cardId);
    const node = cardFace(def, {
      selected: game.selectedHand === i,
      playable: game.turn === 'player' && def.cost <= game.player.embers,
      dim: game.turn !== 'player' || def.cost > game.player.embers,
      dealt: true,
    });
    node.dataset.action = 'hand';
    node.dataset.index = String(i);
    hand.appendChild(node);
  });
  myTop.appendChild(hand);
  me.appendChild(myTop);
  app.appendChild(me);

  const hint = el('div', 'hint', hintText(game));
  app.appendChild(hint);

  if (game.phase === 'over') app.appendChild(endScreen(game));
  root.appendChild(app);
}

function targeting(game, who, creatureId) {
  if (game.phase !== 'play' || game.turn !== 'player') return false;
  if (game.pendingSpell) return true;
  if (game.selectedAttacker !== null) {
    // Taunt gates the choice; the state module enforces it, the glow hints it.
    const foe = game.ai;
    const taunts = foe.board.filter((c) => c.taunt);
    if (taunts.length) return taunts.some((c) => c.id === creatureId);
    return true;
  }
  return false;
}

function hintText(game) {
  if (game.phase === 'over') return '';
  if (game.pendingSpell) return 'Pick a target for your spell — click an enemy creature or the Warden. Esc cancels.';
  if (game.selectedAttacker !== null) return 'Pick a target — click an enemy creature or the Warden. Esc cancels.';
  if (game.selectedHand >= 0) return 'Card selected — click again to cancel, or click the table to play it.';
  if (game.turn !== 'player') return 'The Warden is thinking…';
  return 'Click a card to play it · click a ready creature, then a target, to attack · keys 1–7 select, E ends turn.';
}

function titleScreen(game) {
  const screen = el('div', 'overlay title');
  screen.appendChild(el('div', 'title-glyph', '▲ ● ◆ ✦'));
  screen.appendChild(el('h1', 'game-title', 'EMBER COURT'));
  screen.appendChild(el('p', 'tagline', 'A duel of four suits. Thirty life. One throne.'));
  const rules = el('div', 'rules');
  rules.appendChild(el('p', '', 'You are the Ember Heir. The Warden of Cinders holds the court.'));
  rules.appendChild(el('p', '', 'Each turn you gain an ember crystal and draw a card. Spend embers to play creatures and spells — creatures rest the turn they arrive, then strike. Thornwalls must be answered before the hero behind them. Reduce the Warden to 0 life to take the court.'));
  rules.appendChild(el('p', '', 'Flame hits hard · Tide draws deep · Thorn endures · Gale strikes fast.'));
  screen.appendChild(rules);
  const btn = el('button', 'big-btn', 'Take Your Seat');
  btn.dataset.action = 'start';
  screen.appendChild(btn);
  screen.appendChild(el('p', 'foot', 'Mouse + keyboard · offline · original game'));
  return screen;
}

function endScreen(game) {
  const won = game.winner === 'player';
  const screen = el('div', 'overlay end');
  screen.appendChild(el('div', 'title-glyph', won ? '✦ ✦ ✦' : '▲ ▲ ▲'));
  screen.appendChild(el('h1', 'game-title', won ? 'THE COURT IS YOURS' : 'THE WARDEN PREVAILS'));
  screen.appendChild(el('p', 'tagline', won
    ? `Victory in ${game.turnNumber} turns — the embers bow to their heir.`
    : `Defeat in ${game.turnNumber} turns — the cinders keep their warden. Deal again.`));
  const btn = el('button', 'big-btn', 'Play Again');
  btn.dataset.action = 'restart';
  screen.appendChild(btn);
  return screen;
}
