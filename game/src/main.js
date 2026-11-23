// Boot and the one loop: input is read every frame, the world advances only on player
// actions (Lantern Row is turn-based, not real-time), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { classifyMeld } from './cards.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_DISCARD, PHASE_MELD, PHASE_OVER, PHASE_TAKE, SIDE_PLAYER } from './world.js';
import {
  ACTION_CONFIRM, ACTION_DRAW, ACTION_END_TURN, ACTION_HINT, ACTION_MELD, ACTION_PAUSE,
  ACTION_RESTART, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { computeLayout, createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, seed);
  const world = scene.world;
  const ui = {
    selected: new Set(),
    hover: null,
    intent: world.aiIntent(),
    canMeld: false,
    hint: '',
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let world = createWorld(createRandom(seed));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selected = new Set();
  let hint = '';
  let lastScore = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world = createWorld(createRandom(Math.floor(Math.random() * 4294967296)));
    selected = new Set();
    hint = '';
    screen = SCREEN_PLAY;
    announce('Playing. Take a card from the market or the deck.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.player.score > best) {
      best = world.state.player.score;
      saveBest(best);
    }
    if (world.state.winner === SIDE_PLAYER) {
      audio.win();
      announce(`You win the festival, ${world.state.player.score} to ${world.state.ai.score}.`);
    } else {
      audio.lose();
      announce(`Madame Lumen wins, ${world.state.ai.score} to ${world.state.player.score}.`);
    }
  }

  function clearSelection() {
    selected = new Set();
  }

  function tryMeld() {
    if (world.state.phase !== PHASE_MELD || world.state.turn !== SIDE_PLAYER) return;
    if (selected.size === 0) {
      hint = 'Select 3 or 4 cards first — or press H for a hint.';
      return;
    }
    const cards = world.state.player.hand.filter((c) => selected.has(c.id));
    const result = world.playMeld(cards.map((c) => c.id));
    if (result.ok) {
      audio.meld();
      clearSelection();
      hint = '';
      if (world.state.phase === PHASE_OVER) endGame();
    } else {
      hint = result.message;
    }
  }

  function tryEndTurn() {
    const result = world.endTurn();
    if (result.ok) {
      clearSelection();
      hint = '';
      if (world.state.phase === PHASE_OVER) endGame();
    } else {
      hint = result.message;
    }
  }

  function showHint() {
    const melds = world.availableMelds();
    if (melds.length === 0) {
      hint = 'No meld in hand yet — take a card that matches your suits.';
      return;
    }
    const bestMeld = melds[0];
    selected = new Set(bestMeld.cards.map((c) => c.id));
    hint = `Hint: meld these ${bestMeld.cards.length} for +${bestMeld.points}. Press M to play it.`;
  }

  function handleClick(click) {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (click.kind === 'point') {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (click.kind === 'hand') {
      const card = world.state.player.hand[click.index];
      if (card) toggleSelect(card.id);
      return;
    }
    const layout = computeLayout(world.state);
    const { x, y } = click;
    const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inside(layout.meldButton)) {
      tryMeld();
      return;
    }
    if (inside(layout.endButton)) {
      tryEndTurn();
      return;
    }
    if (world.state.turn !== SIDE_PLAYER) return;
    if (world.state.phase === PHASE_TAKE) {
      for (let i = 0; i < layout.market.length; i += 1) {
        if (inside(layout.market[i])) {
          const result = world.takeMarket(i);
          if (result.ok) {
            audio.take();
            hint = 'Now meld a set, or end your turn.';
          } else hint = result.message;
          return;
        }
      }
      if (inside(layout.deck)) {
        const result = world.takeDeck();
        if (result.ok) {
          audio.take();
          hint = 'Now meld a set, or end your turn.';
        } else hint = result.message;
      }
      return;
    }
    if (world.state.phase === PHASE_MELD) {
      for (const slot of layout.hand) {
        if (inside(slot)) {
          toggleSelect(slot.card.id);
          return;
        }
      }
      return;
    }
    if (world.state.phase === PHASE_DISCARD) {
      for (const slot of layout.hand) {
        if (inside(slot)) {
          const result = world.discard(slot.card.id);
          if (!result.ok) hint = result.message;
          else hint = world.state.player.hand.length > 7 ? 'Discard one more.' : '';
          return;
        }
      }
    }
  }

  function toggleSelect(id) {
    if (world.state.phase === PHASE_DISCARD) {
      const result = world.discard(id);
      if (result.ok) hint = world.state.player.hand.length > 7 ? 'Discard one more.' : '';
      else hint = result.message;
      return;
    }
    if (world.state.phase !== PHASE_MELD) return;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    const cards = world.state.player.hand.filter((c) => selected.has(c.id));
    const meld = cards.length >= 3 ? classifyMeld(cards) : null;
    hint = meld ? `${meld.kind === 'trio' ? 'Trio' : meld.kind === 'run3' ? 'Run of 3' : meld.kind === 'set3' ? 'Set of 3' : meld.kind === 'quad' ? 'Quartet' : 'Run of 4'} — ${meld.points} points. Press M to meld.` : '';
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) startGame();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_MELD) tryMeld();
    if (actions & ACTION_END_TURN) tryEndTurn();
    if (actions & ACTION_HINT) showHint();
    if (actions & ACTION_DRAW && world.state.phase === PHASE_TAKE) {
      const result = world.takeDeck();
      if (result.ok) {
        audio.take();
        hint = 'Now meld a set, or end your turn.';
      } else hint = result.message;
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    for (const click of input.takeClicks()) handleClick(click);
    handleActions();
    if (screen === SCREEN_PAUSED) {
      renderer.draw(world.state, SCREEN_PAUSED, currentUi(), best);
      return;
    }
    // The AI turn runs inside world.endTurn; a fresh score may have ended the game.
    if (world.state.phase === PHASE_OVER && screen === SCREEN_PLAY) endGame();
    if (world.state.player.score !== lastScore) lastScore = world.state.player.score;
    renderer.draw(world.state, screen, currentUi(), best);
  }

  function currentUi() {
    const cards = world.state.player.hand.filter((c) => selected.has(c.id));
    const canMeld = world.state.phase === PHASE_MELD && cards.length >= 3 && classifyMeld(cards) !== null;
    return {
      selected,
      hover: input.hover(),
      intent: world.aiIntent(),
      canMeld,
      hint,
    };
  }

  // Leaving the tab pauses a running game rather than letting the rival play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lantern Row. Press Space or click to start.');
  // Read-only handle for the headless playtest (and the independent verifier):
  // the live state and screen, nothing writable.
  window.__lantern = {
    get state() {
      return world.state;
    },
    get screen() {
      return screen;
    },
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
