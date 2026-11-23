# Lantern Row — Festival of Nine Lights

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/berkahmuse/best-card-game-syukuran/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/berkahmuse/best-card-game-syukuran/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

An original market-draft card game for the [make.fun best card game bounty](https://make.fun/c/best-card-game-20261122-1826). You sit across a night-market table from Madame Lumen: take lantern cards from the shared market, meld sets and runs, and race to 40 points — then survive the finale.

## How to play

- You and Madame Lumen each start with **5 cards**. Three cards lie face-up in the **market**.
- Each turn: **take** one card — a face-up market card (it is replaced from the deck) or a blind draw — then **meld** at most one set from your hand, then end your turn.
- **Melds:** Trio (3 of one suit) 6 · Run of 3 (3 consecutive, one suit) 10 · Set of 3 (3 of one value, different suits) 8 · Quartet (4 of one suit) 12 · Run of 4: 18. A **Festival wild** stands in for any card and adds **+3**.
- Hand limit **7**: if you hold more after taking, discard down to 7.
- **Race to 40:** reaching 40 starts the **finale** — your rival gets one last turn to catch up, then the higher score wins. If the deck runs out first, both sides get three more turns and the higher score wins. Tied on points, most melds wins.
- **Read your rival:** Madame Lumen's panel tells you which suit she is collecting, and she takes market cards that complete her melds — take them first to deny her.

## The five suits

| Suit | Colour | Shape |
| --- | --- | --- |
| Moon | gold | crescent |
| Star | violet | five-point star |
| Wave | teal | waves |
| Leaf | green | leaf |
| Coin | red | ring |

Suits are told apart by colour **and** shape, never by text alone. Festival wilds are gold lanterns.

## Controls

Mouse or keyboard: click a market card or the deck to take it; click hand cards to select them, then **M** (or the MELD button) to meld; **E** ends the turn; **1–7** select hand cards; **D** draws from the deck; **H** hints at your best meld; **P** pauses; **R** deals a new game; **Space** starts.

## Run it

Static files only — no build step, no network:

```sh
node serve.ts --port 18083   # then open http://localhost:18083
```

Screenshots are staged from the real game (`?shot=title|play|win|loss&seed=7`); see `scripts/take-shots.py` and `scripts/playtest.py`.

## Structure

- `game/src/config.js` — tuning numbers, suits, palette
- `game/src/cards.js` — the deck and the meld rules
- `game/src/world.js` — turns, scoring, the finale, Madame Lumen's AI
- `game/src/render.js` — the canvas table, cards and screens
- `game/src/shots.js` — staged screenshot scenes from real games
- `game/src/input.js` — mouse and keyboard
- `game/src/audio.js` — synthesized WebAudio chimes (no assets)
- `game/src/main.js` — boot and the game loop
- `game/src/random.js` — seeded RNG

License: MIT.
