/* ============================================================
   Chain Lab — Deterministic chain-reaction simulation.

   Given the modules on the board and a starting push, this computes the exact
   order and timing in which the energy pulse activates each module, plus the
   terrain that appears (Bridge) or disappears (Blast / Phase) along the way.

   The result is fully deterministic so the visual playback always matches the
   win/lose decision.
   ============================================================ */

import { PULSE_MS, TIMER_MS, key } from './constants';
import type {
  ModuleDef,
  SimEvent,
  SimResult,
  TerrainDelta,
  OrderEntry,
} from './types';

interface SimModule {
  id: number;
  r: number;
  c: number;
  type: ModuleDef['type'];
  activated: boolean;
  gone: boolean;
}

interface Hit {
  t: number;
  r: number;
  c: number;
  dir: number;
  push: boolean;
}

export function simulate(
  modulesIn: ModuleDef[],
  solidIn: boolean[][],
  rows: number,
  cols: number,
  startCell: [number, number],
  startDir: number
): SimResult {
  const solid = solidIn.map((row) => row.slice());
  const byCell = new Map<number, SimModule>();
  const mods: SimModule[] = modulesIn.map((m) => ({
    id: m.id,
    r: m.r,
    c: m.c,
    type: m.type,
    activated: false,
    gone: false,
  }));
  mods.forEach((m) => byCell.set(key(m.r, m.c), m));

  const events: SimEvent[] = [];
  const terrainDeltas: TerrainDelta[] = [];
  const order: OrderEntry[] = [];
  const pq: Hit[] = [];

  function moduleAt(r: number, c: number): SimModule | null {
    const m = byCell.get(key(r, c));
    return m && !m.gone ? m : null;
  }

  function isHole(r: number, c: number): boolean {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return false;
    if (moduleAt(r, c)) return false;
    if (solid[r][c]) return false;
    const below = r + 1 < rows ? solid[r + 1][c] : false;
    return !below;
  }

  function pushHit(t: number, r: number, c: number, dir: number, push: boolean): void {
    pq.push({ t, r, c, dir, push });
  }

  pushHit(0, startCell[0], startCell[1], startDir, true);

  function forward(r: number, c: number, dir: number, tDone: number): void {
    pushHit(tDone, r, c + dir, dir, false);
  }

  function downstream(m: SimModule, dir: number, tDone: number): void {
    const r = m.r;
    const c = m.c;

    if (m.type === 'Splitter') {
      events.push({ t: tDone, id: m.id, action: 'split', dir });
      pushHit(tDone, r, c + dir, dir, false);
      pushHit(tDone, r, c - dir, -dir, false);
      return;
    }
    if (m.type === 'Phase') {
      events.push({ t: tDone, id: m.id, action: 'phase', dir });
      m.gone = true;
      forward(r, c, dir, tDone);
      return;
    }
    if (m.type === 'Bridge') {
      const fr = r;
      const fc = c + dir;
      if (isHole(fr, fc)) {
        events.push({ t: tDone, id: m.id, action: 'bridge', r: fr, c: fc, dir });
        terrainDeltas.push({ t: tDone, type: 'addFloor', r: fr + 1, c: fc });
        if (fr + 1 < rows) solid[fr + 1][fc] = true;
        pushHit(tDone, r, c + 2 * dir, dir, false);
        return;
      }
      forward(r, c, dir, tDone);
      return;
    }
    // Relay, Core, Timer
    forward(r, c, dir, tDone);
  }

  function resolveHit(hit: Hit): void {
    const m = moduleAt(hit.r, hit.c);
    if (!m || m.activated) return;

    if (m.type === 'Firewall') {
      // Never activates; cannot be pushed. The pulse stops dead here.
      if (!hit.push) events.push({ t: hit.t, id: m.id, action: 'block', dir: hit.dir });
      return;
    }
    if (m.type === 'Blast') {
      if (hit.push) return; // cannot be pushed by the robot
      m.activated = true;
      m.gone = true;
      events.push({ t: hit.t, id: m.id, action: 'blast' });
      terrainDeltas.push({ t: hit.t, type: 'removeFloor', r: m.r + 1, c: m.c });
      if (m.r + 1 < rows) solid[m.r + 1][m.c] = false;
      order.push({ id: m.id, t: hit.t, faller: false, core: false });
      return;
    }

    // Activating types: Relay, Core, Timer, Splitter, Phase, Bridge
    m.activated = true;
    const tStart = hit.t + (m.type === 'Timer' ? TIMER_MS : 0);
    const ev: SimEvent = {
      t: tStart,
      id: m.id,
      action: 'activate',
      dir: hit.dir,
      type: m.type,
    };
    if (m.type === 'Timer') ev.wobbleStart = hit.t;
    events.push(ev);

    const tDone = tStart + PULSE_MS;
    order.push({ id: m.id, t: tDone, faller: true, core: m.type === 'Core' });
    downstream(m, hit.dir, tDone);
  }

  let guard = 0;
  while (pq.length) {
    if (++guard > 200000) break;
    let mi = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i].t < pq[mi].t) mi = i;
    resolveHit(pq.splice(mi, 1)[0]);
  }

  const standing = mods.filter((m) => !m.activated && !m.gone && m.type !== 'Firewall');
  const fallers = order.filter((o) => o.faller);
  const core = order.find((o) => o.core);
  let coreLast = false;
  if (core) {
    coreLast = !fallers.some((o) => !o.core && o.t > core.t + 1e-6);
  }
  const win = standing.length === 0 && !!core && coreLast;
  const totalTime = order.reduce((m, o) => Math.max(m, o.t), 0) + PULSE_MS;

  events.sort((a, b) => a.t - b.t);
  terrainDeltas.sort((a, b) => a.t - b.t);

  return {
    events,
    terrainDeltas,
    order,
    win,
    hasCore: !!core,
    coreLast,
    standingLeft: standing.map((m) => m.id),
    totalTime,
  };
}
