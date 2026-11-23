// Headless self-check: play N full games with the real rules and report the outcome.
import { createRandom } from '../game/src/random.js';
import { createWorld, SIDE_PLAYER, SIDE_AI } from '../game/src/world.js';

const N = 200;
let playerWins = 0, aiWins = 0, draws = 0, targetWins = 0, deckOuts = 0;
let totalRounds = 0, maxRounds = 0, minRounds = 99;
let crashes = 0;
for (let seed = 1; seed <= N; seed += 1) {
  try {
    const world = createWorld(createRandom(seed));
    let guard = 0;
    while (world.state.phase !== 'over' && guard < 200) {
      world.autoplayTurn(SIDE_PLAYER);
      guard += 1;
    }
    if (world.state.phase !== 'over') { crashes += 1; console.log('UNFINISHED seed', seed); continue; }
    if (world.state.winner === SIDE_PLAYER) playerWins += 1;
    else if (world.state.winner === SIDE_AI) aiWins += 1;
    else draws += 1;
    if (world.state.reason.includes('finale')) targetWins += 1; else deckOuts += 1;
    totalRounds += world.state.round;
    maxRounds = Math.max(maxRounds, world.state.round);
    minRounds = Math.min(minRounds, world.state.round);
  } catch (e) { crashes += 1; console.log('CRASH seed', seed, e.message); }
}
console.log(`games=${N} player=${playerWins} ai=${aiWins} draw=${draws} finale=${targetWins} deckOut=${deckOuts}`);
console.log(`rounds avg=${(totalRounds / N).toFixed(1)} min=${minRounds} max=${maxRounds} unfinished/crashes=${crashes}`);
