/* ============================================================
   Chain Lab — Level parser. Turns an ASCII grid into terrain + entities.
   ============================================================ */

import { GLYPH } from './constants';
import type { Level, ModuleDef, RawLevel } from './types';

/**
 * Parse an ASCII grid into terrain + entities.
 *
 * Grid characters:
 *   '#'  solid floor / wall
 *   'H'  ladder / maintenance rung
 *   'D'  exit door (hatch)
 *   '@'  the robot's start position
 *   '.' or ' '  empty air
 *   any GLYPH letter  a chain-reaction module (see constants.GLYPH)
 */
export function parseLevel(L: RawLevel): Level {
  const g = L.grid;
  const rows = g.length;
  const cols = g[0].length;
  const solid: boolean[][] = [];
  const ladder: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    solid.push(new Array(cols).fill(false));
    ladder.push(new Array(cols).fill(false));
  }

  const modules: ModuleDef[] = [];
  let robot: { r: number; c: number } | null = null;
  let door: { r: number; c: number } | null = null;
  let id = 1;

  for (let r = 0; r < rows; r++) {
    const line = g[r];
    for (let c = 0; c < cols; c++) {
      const ch = line[c] || '.';
      if (ch === '#') solid[r][c] = true;
      else if (ch === 'H') ladder[r][c] = true;
      else if (ch === 'D') door = { r, c };
      else if (ch === '@') robot = { r, c };
      else if (GLYPH[ch]) modules.push({ id: id++, r, c, type: GLYPH[ch] });
    }
  }

  if (!robot) throw new Error(`Level "${L.name}" is missing a robot start (@).`);
  if (!door) throw new Error(`Level "${L.name}" is missing an exit door (D).`);

  return {
    name: L.name,
    hint: L.hint,
    time: L.time,
    par: L.par,
    rows,
    cols,
    solid,
    ladder,
    modules,
    robot,
    door,
    solution: L.solution,
  };
}
