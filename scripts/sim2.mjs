import { createRandom } from '../game/src/random.js';
import { createWorld, SIDE_PLAYER } from '../game/src/world.js';
const N = 200;
const scores = [];
for (let seed = 1; seed <= N; seed += 1) {
  const world = createWorld(createRandom(seed));
  let guard = 0;
  while (world.state.phase !== 'over' && guard < 200) { world.autoplayTurn(SIDE_PLAYER); guard += 1; }
  scores.push([world.state.player.score, world.state.ai.score, world.state.player.meldCount + world.state.ai.meldCount]);
}
const avg = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1);
console.log('avg player score', avg(scores.map(s => s[0])), 'avg ai score', avg(scores.map(s => s[1])), 'avg total melds', avg(scores.map(s => s[2])));
const sorted = scores.map(s => Math.max(s[0], s[1])).sort((a, b) => a - b);
console.log('winner score p10', sorted[20], 'p50', sorted[100], 'p90', sorted[180], 'max', sorted[199]);
console.log('games where winner >= 30:', sorted.filter(s => s >= 30).length, '>= 35:', sorted.filter(s => s >= 35).length);
