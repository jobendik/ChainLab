/* ============================================================
   Chain Lab — Engine constants & glyph mapping.
   ============================================================ */

import type { ModuleType } from './types';

/** Time (ms) for one module to activate and pass the pulse on. */
export const PULSE_MS = 300;

/** Extra time (ms) a Timer module holds the pulse before passing it on. */
export const TIMER_MS = 820;

/**
 * ASCII glyph -> module type. Kept compact so chambers stay easy to author
 * directly in `levels.ts`. The letters are intentionally stable so existing
 * chamber layouts keep working after the re-theme.
 */
export const GLYPH: Record<string, ModuleType> = {
  o: 'Relay',
  T: 'Core',
  s: 'Firewall',
  d: 'Timer',
  p: 'Splitter',
  v: 'Phase',
  b: 'Bridge',
  x: 'Blast',
};

/** Module types that physically "activate" (tip/discharge) when pulsed. */
export const ACTIVATORS: Record<ModuleType, boolean> = {
  Relay: true,
  Core: true,
  Timer: true,
  Splitter: true,
  Phase: true,
  Bridge: true,
  Firewall: false,
  Blast: false,
};

/** Stable key for a (row, col) cell. */
export function key(r: number, c: number): number {
  return r * 1000 + c;
}
