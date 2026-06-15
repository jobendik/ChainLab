/* ============================================================
   Chain Lab — Engine type definitions (pure, no DOM).
   ============================================================ */

/** Every kind of chain-reaction module that can appear in a chamber. */
export type ModuleType =
  | 'Relay' // passes the pulse forward
  | 'Core' // the Final Core — must activate last
  | 'Firewall' // blocks the pulse, never activates, cannot be pushed
  | 'Timer' // waits before passing the pulse on
  | 'Splitter' // sends the pulse both directions
  | 'Phase' // passes the pulse, then phases out (disappears)
  | 'Bridge' // extends a temporary floor across a one-tile gap
  | 'Blast'; // destroys the floor tile below when the pulse hits it

/** A single grid cell coordinate. */
export interface Cell {
  r: number;
  c: number;
}

/** A module placed on the grid. */
export interface ModuleDef extends Cell {
  id: number;
  type: ModuleType;
}

/** The push that starts a chain: which cell to hit and in which direction. */
export interface PushSpec {
  cell: [number, number];
  dir: number;
}

/** A "carry this module from A to B" hint move. */
export interface MoveSpec {
  from: [number, number];
  to: [number, number];
}

/** The intended solution for a chamber (used by the hint overlay). */
export interface Solution {
  moves: MoveSpec[];
  push: PushSpec;
}

/** A level as authored in `levels.ts` (ASCII grid + metadata). */
export interface RawLevel {
  name: string;
  time: number;
  par: number;
  hint: string;
  grid: string[];
  solution: Solution;
}

/** A parsed, ready-to-play level. */
export interface Level {
  name: string;
  hint: string;
  time: number;
  par: number;
  rows: number;
  cols: number;
  solid: boolean[][];
  ladder: boolean[][];
  modules: ModuleDef[];
  robot: Cell;
  door: Cell;
  solution: Solution;
}

/* ---- Simulation events (one-shot visual/audio cues) ---- */

export interface ActivateEvent {
  t: number;
  id: number;
  action: 'activate';
  dir: number;
  type: ModuleType;
  /** Present only for Timer modules — when the charge-up wobble begins. */
  wobbleStart?: number;
}
export interface BlastEvent {
  t: number;
  id: number;
  action: 'blast';
}
export interface PhaseEvent {
  t: number;
  id: number;
  action: 'phase';
  dir: number;
}
export interface BridgeEvent {
  t: number;
  id: number;
  action: 'bridge';
  r: number;
  c: number;
  dir: number;
}
export interface SplitEvent {
  t: number;
  id: number;
  action: 'split';
  dir: number;
}
export interface BlockEvent {
  t: number;
  id: number;
  action: 'block';
  dir: number;
}

export type SimEvent =
  | ActivateEvent
  | BlastEvent
  | PhaseEvent
  | BridgeEvent
  | SplitEvent
  | BlockEvent;

/** A timed change to the terrain (floor appearing/disappearing). */
export interface TerrainDelta {
  t: number;
  type: 'addFloor' | 'removeFloor';
  r: number;
  c: number;
}

/** One entry in the activation order, used to decide the win condition. */
export interface OrderEntry {
  id: number;
  t: number;
  /** True for modules that "activate" (the Core counts); false for Blast cells. */
  faller: boolean;
  /** True only for the Final Core. */
  core: boolean;
}

/** The full deterministic result of a simulated chain reaction. */
export interface SimResult {
  events: SimEvent[];
  terrainDeltas: TerrainDelta[];
  order: OrderEntry[];
  win: boolean;
  hasCore: boolean;
  coreLast: boolean;
  standingLeft: number[];
  totalTime: number;
}
