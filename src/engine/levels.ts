/* ============================================================
   Chain Lab — Chamber data.

   Every chamber is a simple ASCII grid (16 columns wide, row 0 at the top)
   plus a little metadata, so new chambers are quick to author and edit.

   Legend:
     #  floor / wall        H  ladder / rung      D  exit hatch
     @  robot start         .  empty air
     o Relay   T Core   s Firewall   d Timer
     p Splitter   v Phase   b Bridge   x Blast
   ============================================================ */

import type { RawLevel } from './types';

export const LEVELS: RawLevel[] = [
  {
    name: 'First Pulse',
    time: 60,
    par: 1,
    hint: 'Send the pulse into the first module. The chain activates one module at a time — the golden Final Core must light up LAST.',
    grid: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..@oooT...D.....',
      '..###########...',
      '................',
      '................',
    ],
    solution: { moves: [], push: { cell: [6, 3], dir: 1 } },
  },
  {
    name: 'Spare Module',
    time: 75,
    par: 2,
    hint: 'Tap toward a module to turn; tap again to walk. Pick up the spare Relay on your left and drop it into the gap, then send the pulse.',
    grid: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..o@.ooT..D.....',
      '..#########.....',
      '................',
      '................',
    ],
    solution: { moves: [{ from: [6, 2], to: [6, 4] }], push: { cell: [6, 4], dir: 1 } },
  },
  {
    name: 'Span',
    time: 75,
    par: 1,
    hint: 'The violet Bridge Module extends a temporary floor across a one-tile gap, routing the pulse onward — and giving you a way across.',
    grid: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..@b.oT..D......',
      '..##.#####......',
      '................',
      '................',
    ],
    solution: { moves: [], push: { cell: [6, 3], dir: 1 } },
  },
  {
    name: 'Split Second',
    time: 75,
    par: 1,
    hint: 'The green Splitter Node fires the pulse both ways: one half drives on, the other flips backward. Keep that back half harmless.',
    grid: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..@opooT..D.....',
      '..#########.....',
      '................',
      '................',
    ],
    solution: { moves: [], push: { cell: [6, 3], dir: 1 } },
  },
  {
    name: 'Blast Down',
    time: 80,
    par: 1,
    hint: 'The orange Blast Cell blows out the floor when the pulse hits it. Route into it to end the chain — and open a way down to the exit.',
    grid: [
      '................',
      '................',
      '................',
      '..@ooTx.........',
      '..#######.......',
      '................',
      '........D.......',
      '.....#####......',
      '................',
      '................',
    ],
    solution: { moves: [], push: { cell: [3, 3], dir: 1 } },
  },
  {
    name: 'Full Circuit',
    time: 95,
    par: 1,
    hint: 'Everything at once: a Timer that holds the pulse, a Bridge over the gap, a Phase module that vanishes, a Splitter, and the Core waiting at the very end.',
    grid: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..@odob.opvT..D.',
      '..#####.#######.',
      '................',
      '................',
    ],
    solution: { moves: [], push: { cell: [6, 3], dir: 1 } },
  },
];
