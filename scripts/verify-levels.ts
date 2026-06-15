/* Standalone check: every chamber's intended solution must win.
   Run with:  npx -y tsx scripts/verify-levels.ts
   This mirrors what the game does — apply the solution's carry moves, then
   push — and asserts the deterministic simulation reports a win. */

import { LEVELS } from '../src/engine/levels';
import { parseLevel } from '../src/engine/parser';
import { simulate } from '../src/engine/simulate';
import type { ModuleDef } from '../src/engine/types';

let failures = 0;

for (let i = 0; i < LEVELS.length; i++) {
  const L = parseLevel(LEVELS[i]);
  const mods: ModuleDef[] = L.modules.map((m) => ({ ...m }));
  const sol = L.solution;

  // Apply carry moves (pick up at `from`, drop at `to`).
  for (const mv of sol.moves) {
    const m = mods.find((x) => x.r === mv.from[0] && x.c === mv.from[1]);
    if (!m) {
      console.error(`  ! ${L.name}: no module at move.from ${mv.from}`);
      failures++;
      continue;
    }
    m.r = mv.to[0];
    m.c = mv.to[1];
  }

  const res = simulate(mods, L.solid, L.rows, L.cols, sol.push.cell, sol.push.dir);
  const tag = res.win ? 'WIN ' : 'FAIL';
  console.log(
    `${tag}  Chamber ${i + 1} "${L.name}"  ` +
      `core=${res.hasCore} coreLast=${res.coreLast} standingLeft=${res.standingLeft.length}`
  );
  if (!res.win) failures++;
}

if (failures) {
  console.error(`\n${failures} chamber(s) not solvable — see above.`);
  process.exit(1);
} else {
  console.log(`\nAll ${LEVELS.length} chambers solvable. ✓`);
}
