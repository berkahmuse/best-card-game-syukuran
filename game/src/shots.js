// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules
// forward from a fresh world, steered by the same autopilot the AI uses, so the frame is
// what a short game really looks like and the same seed always gives the same frame.
// Win and loss scenes search forward from the given seed for a game the named side wins.
import { createRandom } from './random.js';
import { createWorld, SIDE_AI, SIDE_PLAYER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Player turns shown in the play scene. */
const PLAY_TURNS = 6;
/** Most player turns a staged game may run before it is abandoned. */
const MAX_TURNS = 80;
/** Most seeds tried when hunting a win or a loss scene. */
const MAX_SEEDS = 300;

/** Play `turns` full rounds (player + rival) from a fresh world with `seed`. */
function playGame(seed, turns) {
  const world = createWorld(createRandom(seed));
  for (let i = 0; i < turns; i += 1) {
    if (world.state.phase === 'over') break;
    world.autoplayTurn(SIDE_PLAYER);
  }
  return world;
}

/** Find a game, starting at `seed`, that the named side wins. */
function huntResult(seed, side) {
  for (let offset = 0; offset < MAX_SEEDS; offset += 1) {
    const world = playGame(seed + offset, MAX_TURNS);
    if (world.state.winner === side) return { world, seed: seed + offset };
  }
  return null;
}

/**
 * Stage the named scene and return the world to draw, the screen, and the best score
 * to show. The win/loss hunt is deterministic: the same seed always finds the same game.
 */
export function stageShot(name, seed) {
  if (name === 'play') {
    const world = playGame(seed, PLAY_TURNS);
    return { world, screen: SCREEN_PLAY, best: 0, seed };
  }
  if (name === 'win' || name === 'loss') {
    const side = name === 'win' ? SIDE_PLAYER : SIDE_AI;
    const found = huntResult(seed, side);
    if (found) return { world: found.world, screen: SCREEN_OVER, best: 0, seed: found.seed };
    // Fallback: the play scene, so a shot still renders if the hunt ever fails.
    const world = playGame(seed, PLAY_TURNS);
    return { world, screen: SCREEN_PLAY, best: 0, seed };
  }
  const world = createWorld(createRandom(seed));
  return { world, screen: SCREEN_TITLE, best: 0, seed };
}
