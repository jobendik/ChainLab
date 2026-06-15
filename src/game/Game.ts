/* ============================================================
   Chain Lab — Game orchestrator: state, layout, input actions,
   chain playback, and the main loop. Pure rendering lives in render.ts.
   ============================================================ */

import { LEVELS } from '../engine/levels';
import { parseLevel } from '../engine/parser';
import { simulate } from '../engine/simulate';
import type {
  ActivateEvent,
  BlastEvent,
  Level,
  PhaseEvent,
  SimEvent,
  SimResult,
} from '../engine/types';
import { AudioEngine } from './audio';
import { Particles } from './particles';
import { Renderer } from './render';
import { Hud } from './hud';
import { MODULE_STYLES, PAL } from './theme';
import type { DoorState, GameMode, Mote, PlacedModule, Robot } from './types';
import { clamp } from './util';

function cellKey(r: number, c: number): number {
  return r * 1000 + c;
}

export class Game {
  // ---- canvas / layout ----
  readonly cv: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = 0;
  H = 0;
  CELL = 48;
  OX = 0;
  OY = 0;
  readonly isTouch =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // ---- subsystems ----
  readonly audio = new AudioEngine();
  readonly particles = new Particles();
  readonly hud = new Hud();
  private readonly renderer: Renderer;

  // ---- state ----
  levelIndex = 0;
  level: Level | null = null;
  solid: boolean[][] = [];
  modules = new Map<number, PlacedModule>();
  door: DoorState | null = null;
  robot!: Robot;
  mode: GameMode = 'title';
  timeLeft = 0;
  hint = false;
  toast = '';
  toastT = 0;
  shake = 0;
  flash = 0;
  ambient: Mote[] = [];
  t = 0;
  private lastT = 0;

  // ---- chain playback ----
  chain: SimResult | null = null;
  chainStart = 0;
  chainModules: PlacedModule[] | null = null;
  activateEv: Record<number, ActivateEvent> = {};
  termEv: Record<number, BlastEvent | PhaseEvent> = {};
  private fired: Record<number, 1> = {};
  private deltasApplied = 0;
  private finishAt = 0;
  private clackN = 0;
  private placedId = 10000;

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer(this);
    this.initAmbient();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.hud.showTitle();
  }

  // ---------- coordinate helpers ----------
  footX(c: number): number {
    return this.OX + (c + 0.5) * this.CELL;
  }
  floorY(r: number): number {
    return this.OY + (r + 1) * this.CELL;
  }
  moduleList(): PlacedModule[] {
    return Array.from(this.modules.values());
  }

  // ---------- layout ----------
  private resize(): void {
    const r = this.cv.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.cv.width = Math.round(this.W * this.DPR);
    this.cv.height = Math.round(this.H * this.DPR);
    this.layout();
  }

  private layout(): void {
    if (!this.level) return;
    const L = this.level;
    const topPad = 86;
    const botPad = this.isTouch ? 150 : 56;
    const availW = this.W - 36;
    const availH = this.H - topPad - botPad;
    this.CELL = Math.max(20, Math.min(availW / L.cols, availH / L.rows));
    this.OX = (this.W - L.cols * this.CELL) / 2;
    this.OY = topPad + (availH - L.rows * this.CELL) / 2;
    this.syncRobot();
  }

  private syncRobot(): void {
    const a = this.robot;
    if (!a) return;
    if (a.moving) {
      a.sx = this.footX(a.c);
      a.sy = this.floorY(a.r);
      a.ex = this.footX(a._nc);
      a.ey = this.floorY(a._nr);
      const k = Math.min(1, a.mt / a.md);
      a.fx = a.sx + (a.ex - a.sx) * k;
      a.fy = a.sy + (a.ey - a.sy) * k;
    } else {
      a.fx = this.footX(a.c);
      a.fy = this.floorY(a.r);
    }
  }

  private initAmbient(): void {
    this.ambient = [];
    for (let i = 0; i < 46; i++) {
      this.ambient.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.6 + Math.random() * 1.8,
        a: 0.06 + Math.random() * 0.14,
        v: 6 + Math.random() * 16,
        s: 0.5 + Math.random(),
        p: Math.random() * 7,
      });
    }
  }

  // ---------- terrain queries ----------
  isSolid(r: number, c: number): boolean {
    return (
      r >= 0 &&
      c >= 0 &&
      r < this.level!.rows &&
      c < this.level!.cols &&
      this.solid[r][c]
    );
  }
  private isLadder(r: number, c: number): boolean {
    return (
      r >= 0 &&
      c >= 0 &&
      r < this.level!.rows &&
      c < this.level!.cols &&
      this.level!.ladder[r][c]
    );
  }
  private support(r: number, c: number): boolean {
    return this.isLadder(r, c) || this.isSolid(r + 1, c);
  }
  private standingAt(r: number, c: number): PlacedModule | null {
    if (this.mode !== 'play') return null; // chain/open: nothing blocks the robot
    return this.modules.get(cellKey(r, c)) || null;
  }
  private walkable(r: number, c: number): boolean {
    if (r < 0 || c < 0 || r >= this.level!.rows || c >= this.level!.cols) return false;
    if (this.isSolid(r, c)) return false;
    if (this.standingAt(r, c)) return false;
    return true;
  }
  private fallLanding(r: number, c: number, maxFall: number): number | null {
    for (let lr = r + 1; lr <= r + maxFall && lr < this.level!.rows; lr++) {
      if (this.isSolid(lr, c)) return null;
      if (this.walkable(lr, c) && this.support(lr, c)) return lr;
    }
    return null;
  }
  private canWalkInto(r: number, c: number): boolean {
    if (!this.walkable(r, c)) return false;
    if (this.support(r, c)) return true;
    return this.fallLanding(r, c, 4) != null;
  }

  // ---------- level lifecycle ----------
  loadLevel(i: number): void {
    this.levelIndex = i;
    this.level = parseLevel(LEVELS[i]);
    this.timeLeft = this.level.time;
    this.layout();
    this.resetBoard();
    this.mode = 'intro';
    this.hud.showIntro(this.level.name, i, LEVELS.length, this.level.hint);
  }

  resetBoard(): void {
    const L = this.level!;
    this.solid = L.solid.map((row) => row.slice());
    this.modules = new Map();
    L.modules.forEach((m) =>
      this.modules.set(cellKey(m.r, m.c), { id: m.id, r: m.r, c: m.c, type: m.type })
    );
    this.robot = {
      r: L.robot.r,
      c: L.robot.c,
      fx: this.footX(L.robot.c),
      fy: this.floorY(L.robot.r),
      facing: 1,
      carrying: null,
      moving: false,
      mt: 0,
      md: 0,
      sx: 0,
      sy: 0,
      ex: 0,
      ey: 0,
      _nr: 0,
      _nc: 0,
      kind: '',
      phase: 0,
      bob: 0,
      dead: false,
    };
    this.door = { r: L.door.r, c: L.door.c, open: 0, targetOpen: 0 };
    this.chain = null;
    this.shake = 0;
    this.flash = 0;
    this.particles.clear();
  }

  // ---------- public lifecycle (wired by input.ts / hud) ----------
  startGame(): void {
    this.audio.init();
    this.hud.hideTitle();
    this.loadLevel(0);
  }
  beginLevel(): void {
    this.hud.hideIntro();
    this.mode = 'play';
  }
  nextLevel(): void {
    this.hud.hideClear();
    const next = this.levelIndex + 1;
    this.loadLevel(next >= LEVELS.length ? 0 : next);
  }
  reset(): void {
    if (this.mode === 'intro' || this.mode === 'title' || this.mode === 'clear') return;
    this.timeLeft = this.level!.time;
    this.resetBoard();
    this.mode = 'play';
  }
  toggleHint(): void {
    this.hint = !this.hint;
  }
  toggleMute(): void {
    this.audio.muted = !this.audio.muted;
    this.hud.setMuteLabel(this.audio.muted);
  }

  // ---------- input actions ----------
  actHoriz(dir: number): void {
    const a = this.robot;
    if (a.moving) return;
    if (a.facing !== dir) {
      a.facing = dir;
      return;
    }
    const nr = a.r;
    const nc = a.c + dir;
    if (this.canWalkInto(nr, nc)) this.startMove(nr, nc, 'walk');
    else this.audio.deny();
  }
  actUp(): void {
    const a = this.robot;
    if (a.moving) return;
    if (this.isLadder(a.r, a.c) || this.isLadder(a.r - 1, a.c)) {
      const nr = a.r - 1;
      if (this.walkable(nr, a.c) && (this.isLadder(nr, a.c) || this.support(nr, a.c))) {
        this.startMove(nr, a.c, 'climb');
      }
    }
  }
  actDown(): void {
    const a = this.robot;
    if (a.moving) return;
    if (this.isLadder(a.r, a.c) || this.isLadder(a.r + 1, a.c)) {
      const nr = a.r + 1;
      if (this.walkable(nr, a.c)) this.startMove(nr, a.c, 'climb');
    }
  }
  private startMove(nr: number, nc: number, kind: 'walk' | 'climb' | 'fall'): void {
    const a = this.robot;
    a.moving = true;
    a.kind = kind;
    a.mt = 0;
    a.md = kind === 'climb' ? 0.19 : 0.15;
    a.sx = a.fx;
    a.sy = a.fy;
    a.ex = this.footX(nc);
    a.ey = this.floorY(nr);
    a._nr = nr;
    a._nc = nc;
    if (kind === 'walk') this.audio.step();
  }
  private frontCell(): { r: number; c: number } {
    return { r: this.robot.r, c: this.robot.c + this.robot.facing };
  }
  actGrabDrop(): void {
    const a = this.robot;
    if (a.moving) return;
    const f = this.frontCell();
    if (a.carrying) {
      if (
        this.walkable(f.r, f.c) &&
        this.support(f.r, f.c) &&
        !this.modules.get(cellKey(f.r, f.c))
      ) {
        this.modules.set(cellKey(f.r, f.c), {
          id: this.placedId++,
          r: f.r,
          c: f.c,
          type: a.carrying,
        });
        a.carrying = null;
        this.audio.drop();
        this.particles.puff(this.footX(f.c), this.floorY(f.r), 6, this.CELL, '#9fc4ff');
      } else this.audio.deny();
    } else {
      const m = this.standingAt(f.r, f.c);
      if (m) {
        this.modules.delete(cellKey(f.r, f.c));
        a.carrying = m.type;
        this.audio.grab();
      } else this.audio.deny();
    }
  }
  actPush(): void {
    const a = this.robot;
    if (a.moving) return;
    const f = this.frontCell();
    const m = this.standingAt(f.r, f.c);
    if (!m) {
      this.audio.deny();
      return;
    }
    if (m.type === 'Firewall' || m.type === 'Blast') {
      this.audio.deny();
      this.toast =
        m.type === 'Firewall'
          ? 'Firewall Block can’t be pushed — it blocks the pulse.'
          : 'Blast Cell can’t be pushed — only the pulse triggers it.';
      this.toastT = 1.8;
      return;
    }
    this.startChain([f.r, f.c], a.facing);
  }

  // ---------- chain playback ----------
  private startChain(cell: [number, number], dir: number): void {
    const arr: PlacedModule[] = this.moduleList().map((m) => ({
      id: m.id,
      r: m.r,
      c: m.c,
      type: m.type,
    }));
    const res = simulate(arr, this.solid, this.level!.rows, this.level!.cols, cell, dir);
    this.chain = res;
    this.chainModules = arr;
    this.activateEv = {};
    this.termEv = {};
    res.events.forEach((ev) => {
      if (ev.action === 'activate') this.activateEv[ev.id] = ev;
      else if (ev.action === 'blast' || ev.action === 'phase') this.termEv[ev.id] = ev;
    });
    this.fired = {};
    this.deltasApplied = 0;
    this.chainStart = this.t;
    this.mode = 'chain';
    this.finishAt = this.chainStart + res.totalTime / 1000 + 0.55;
    this.audio.pulse();
    this.particles.ring(this.footX(cell[1]), this.floorY(cell[0]) - this.CELL * 0.4, this.CELL, PAL.accent);
  }

  private updateChain(): void {
    const res = this.chain!;
    const el = (this.t - this.chainStart) * 1000;
    while (
      this.deltasApplied < res.terrainDeltas.length &&
      res.terrainDeltas[this.deltasApplied].t <= el
    ) {
      const dl = res.terrainDeltas[this.deltasApplied];
      if (dl.type === 'removeFloor') this.solid[dl.r][dl.c] = false;
      else if (dl.type === 'addFloor') this.solid[dl.r][dl.c] = true;
      this.deltasApplied++;
    }
    for (let i = 0; i < res.events.length; i++) {
      const ev = res.events[i];
      if (this.fired[i]) continue;
      if (el >= ev.t) {
        this.fired[i] = 1;
        this.fireEvent(ev);
      }
    }
    if (this.t >= this.finishAt) this.finishChain();
  }

  private moduleById(id: number): PlacedModule | null {
    const list = this.chainModules;
    if (!list) return null;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  private fireEvent(ev: SimEvent): void {
    const m = this.moduleById(ev.id);
    if (!m) return;
    const x = this.footX(m.c);
    const y = this.floorY(m.r);
    const top = y - this.CELL * 0.5;
    const style = MODULE_STYLES[m.type];

    switch (ev.action) {
      case 'activate': {
        this.audio.activate(this.clackN++ % 9);
        if (ev.type === 'Timer') this.audio.tick();
        // pulse streak to the next cell
        this.particles.bolt(x, top, this.footX(m.c + ev.dir), top, style.glow || style.c1);
        this.particles.ring(x, top, this.CELL, style.c2, 0.7);
        break;
      }
      case 'blast': {
        this.audio.blast();
        this.particles.explosion(x, y - this.CELL * 0.4, this.CELL);
        this.shake = Math.min(1, this.shake + 0.9);
        this.flash = 0.5;
        break;
      }
      case 'phase': {
        this.audio.phase();
        this.particles.phaseFx(x, y - this.CELL * 0.5, this.CELL);
        break;
      }
      case 'bridge': {
        this.audio.bridge();
        this.particles.puff(this.footX(ev.c), this.floorY(ev.r), 10, this.CELL, '#8ff0e2');
        break;
      }
      case 'split': {
        this.audio.split();
        this.particles.bolt(x, top, this.footX(m.c - ev.dir), top, style.c1);
        this.particles.puff(x, top, 10, this.CELL, '#8bf0a6');
        this.shake = Math.min(1, this.shake + 0.25);
        break;
      }
      case 'block': {
        this.audio.activate(0);
        this.particles.puff(x, top, 6, this.CELL, '#ff90a6');
        break;
      }
    }
  }

  private finishChain(): void {
    const res = this.chain!;
    if (res.win) {
      this.mode = 'open';
      this.door!.targetOpen = 1;
      this.audio.open();
      this.toast = 'Pulse routed — the exit is online. Walk the robot to it.';
      this.toastT = 3;
      this.particles.confetti(this.footX(this.door!.c), this.floorY(this.door!.r) - this.CELL, this.CELL);
      this.flash = 0.35;
    } else {
      this.mode = 'fail';
      this.audio.lose();
      const why = res.standingLeft.length
        ? 'Some modules never activated.'
        : !res.hasCore
          ? 'The Final Core never activated.'
          : 'The Final Core didn’t activate last.';
      this.toast = 'Chain broke. ' + why;
      this.toastT = 2.4;
      this.finishAt = this.t + 1.25;
    }
  }

  // ---------- per-frame update ----------
  private update(dt: number): void {
    this.t += dt;

    for (let i = 0; i < this.ambient.length; i++) {
      const m = this.ambient[i];
      m.y -= m.v * dt;
      m.x += Math.sin(this.t * m.s + m.p) * 6 * dt;
      if (m.y < -10) {
        m.y = this.H + 10;
        m.x = Math.random() * this.W;
      }
    }

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toast = '';
    }

    if (this.door) {
      const to = this.door.targetOpen || 0;
      this.door.open += (to - this.door.open) * Math.min(1, dt * 5);
    }

    const a = this.robot;
    if (a && a.moving) {
      a.mt += dt;
      const k = Math.min(1, a.mt / a.md);
      const e = a.kind === 'walk' ? k * k * (3 - 2 * k) : k;
      a.fx = a.sx + (a.ex - a.sx) * e;
      a.fy = a.sy + (a.ey - a.sy) * e;
      a.phase += dt * 16;
      if (k >= 1) {
        a.moving = false;
        a.r = a._nr;
        a.c = a._nc;
        a.fx = a.ex;
        a.fy = a.ey;
        this.afterMove();
      }
    } else if (a) {
      a.bob = Math.sin(this.t * 2.4) * (this.CELL * 0.012);
    }

    if (this.mode === 'chain') this.updateChain();
    else if (this.mode === 'fail') {
      if (this.t >= this.finishAt) {
        this.resetBoard();
        this.mode = 'play';
      }
    } else if (this.mode === 'play') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.mode = 'timeout';
        this.audio.lose();
        this.toast = 'Power drained!';
        this.toastT = 1.6;
        this.finishAt = this.t + 1.3;
      }
    } else if (this.mode === 'timeout' || this.mode === 'dead') {
      if (this.t >= this.finishAt) {
        this.timeLeft = this.level!.time;
        this.resetBoard();
        this.mode = 'play';
      }
    }

    this.particles.update(dt);
  }

  private afterMove(): void {
    const a = this.robot;
    if (!this.isLadder(a.r, a.c) && !this.support(a.r, a.c)) {
      const land = this.fallLanding(a.r, a.c, 6);
      if (land == null) {
        this.die();
        return;
      }
      if (land - a.r > 4) {
        this.startMove(land, a.c, 'fall');
        a.dead = true;
        return;
      }
      this.startMove(land, a.c, 'fall');
      this.particles.puff(a.fx, this.floorY(land), 6, this.CELL, '#9fc4ff');
      return;
    }
    if (a.dead) {
      this.die();
      return;
    }
    if (this.mode === 'open' && a.r === this.door!.r && a.c === this.door!.c) this.levelClear();
  }

  private die(): void {
    this.mode = 'dead';
    this.audio.lose();
    this.toast = 'Robot offline — it took a fall! Rebooting…';
    this.toastT = 1.6;
    this.finishAt = this.t + 1.4;
  }

  private levelClear(): void {
    this.mode = 'clear';
    this.audio.win();
    const last = this.levelIndex >= LEVELS.length - 1;
    this.hud.showClear(last);
    this.particles.confetti(this.W / 2, this.H * 0.4, this.CELL);
  }

  // ---------- main loop ----------
  frame = (ts: number): void => {
    const t = ts / 1000;
    if (!this.lastT) this.lastT = t;
    const dt = Math.min(0.05, t - this.lastT);
    this.lastT = t;
    if (this.mode !== 'title') {
      this.update(dt);
      this.renderer.render();
    }
    if (this.level) {
      this.hud.setBadge(this.level.name, this.levelIndex);
      this.hud.drawGauge(clamp(this.timeLeft, 0, this.level.time), this.level.time);
    }
    this.hud.setToast(this.toast);
    requestAnimationFrame(this.frame);
  };

  start(): void {
    requestAnimationFrame(this.frame);
  }
}
