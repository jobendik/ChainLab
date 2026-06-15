/* ============================================================
   Chain Lab — Game-layer types (runtime / view state).
   ============================================================ */

import type { ModuleType } from '../engine/types';

export type GameMode =
  | 'title'
  | 'intro'
  | 'play'
  | 'chain'
  | 'open'
  | 'fail'
  | 'timeout'
  | 'dead'
  | 'clear';

/** A module currently placed on the board during play. */
export interface PlacedModule {
  id: number;
  r: number;
  c: number;
  type: ModuleType;
}

/** The maintenance robot the player controls. */
export interface Robot {
  r: number;
  c: number;
  fx: number; // pixel foot x
  fy: number; // pixel foot y
  facing: number; // -1 or 1
  carrying: ModuleType | null;
  moving: boolean;
  mt: number; // move elapsed
  md: number; // move duration
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  _nr: number; // pending target row
  _nc: number; // pending target col
  kind: '' | 'walk' | 'climb' | 'fall';
  phase: number; // walk-cycle phase
  bob: number; // idle bob
  dead: boolean;
}

/** The exit hatch. */
export interface DoorState {
  r: number;
  c: number;
  open: number;
  targetOpen: number;
}

/** A drifting background dust/spark mote. */
export interface Mote {
  x: number;
  y: number;
  r: number;
  a: number;
  v: number;
  s: number;
  p: number;
}
