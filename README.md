[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/sontv01034/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/sontv01034/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

# Ember Court

A duel of four suits. You are the Ember Heir; the Warden of Cinders holds the court. Thirty life each, ember crystals for mana, a 30-card deck of creatures and spells across four suits — Flame hits hard, Tide draws deep, Thorn endures, Gale strikes fast.

## How to play

- Each turn you gain an ember crystal (up to 10) and draw a card.
- Spend embers to play creatures and spells. Creatures rest the turn they arrive, then strike.
- Click a ready creature, then an enemy creature or the Warden, to attack. Thornwalls (taunt) must be answered before the hero behind them.
- Reduce the Warden to 0 life to take the court. Mouse + keyboard (keys 1–7 select a card, E ends turn, Esc cancels).

## Play it

Static files, no build step, no network: serve `game/` with any static server and open `game/index.html` in desktop Chrome.

```
python3 -m http.server 8080 --directory game
```

## Layout

- `game/index.html` — page shell
- `game/style.css` — the table
- `game/src/config.js` — cards, suits, tuning
- `game/src/deck.js` — deck building, shuffling, drawing
- `game/src/state.js` — rules: turns, embers, combat, taunt, winning
- `game/src/ai.js` — the Warden's decisions
- `game/src/render.js` — state to DOM
- `game/src/input.js` — mouse + keyboard
- `game/src/audio.js` — synthesized WebAudio blips
- `game/src/main.js` — bootstrap (`?shot=table|win|loss` stages a state for screenshots)
- `main.ts` — hand-in program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `screenshots/` — 4 real renders of the game in Chrome

Built for the [best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) bounty on make.fun. MIT licensed.
