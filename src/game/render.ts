/* ============================================================
   Chain Lab — Renderer. All canvas drawing lives here.
   Reads view state from the Game instance; owns no game logic.
   ============================================================ */

import { PULSE_MS } from '../engine/constants';
import type { ModuleType } from '../engine/types';
import type { Game } from './Game';
import type { PlacedModule } from './types';
import { MODULE_STYLES, PAL, drawIcon, type ModuleStyle } from './theme';
import { hexA, roundRectPath, radialFill } from './util';

type ModuleVisual =
  | { st: 'up' }
  | { st: 'gone' }
  | { st: 'wobble'; k: number; dir: number }
  | { st: 'activate'; a: number; dir: number; type: ModuleType; flash: number }
  | { st: 'spent'; dir: number };

export class Renderer {
  private g: Game;
  private ctx: CanvasRenderingContext2D;

  constructor(game: Game) {
    this.g = game;
    this.ctx = game.ctx;
  }

  render(): void {
    const g = this.g;
    const ctx = this.ctx;
    ctx.setTransform(g.DPR, 0, 0, g.DPR, 0, 0);
    this.drawBackground();
    if (!g.level) return;
    ctx.save();
    if (g.shake > 0) {
      const m = g.shake * g.CELL * 0.25;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    this.drawPlatforms();
    this.drawRails();
    this.drawDoor();
    this.drawHintGhosts();
    this.drawAllModules();
    this.drawRobot();
    g.particles.draw(ctx, g.CELL);
    ctx.restore();
    this.drawLighting();
  }

  // ---------- background ----------
  private drawBackground(): void {
    const ctx = this.ctx;
    const g = this.g;
    const grad = ctx.createLinearGradient(0, 0, 0, g.H);
    grad.addColorStop(0, PAL.bgTop);
    grad.addColorStop(1, PAL.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, g.W, g.H);

    // faint blueprint grid — reads as a machine interior
    ctx.strokeStyle = PAL.grid;
    ctx.lineWidth = 1;
    const step = 38;
    ctx.beginPath();
    for (let x = (g.OX % step); x < g.W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, g.H);
    }
    for (let y = (g.OY % step); y < g.H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(g.W, y);
    }
    ctx.stroke();

    // cool overhead glow
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(g.W * 0.5, -g.H * 0.1, 0, g.W * 0.5, -g.H * 0.1, g.H * 0.9);
    rg.addColorStop(0, 'rgba(70,140,255,0.14)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, g.W, g.H);
    ctx.globalCompositeOperation = 'source-over';

    // drifting motes
    for (let i = 0; i < g.ambient.length; i++) {
      const m = g.ambient[i];
      ctx.globalAlpha = m.a;
      ctx.fillStyle = '#9fc4ff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- platforms ----------
  private drawPlatforms(): void {
    const g = this.g;
    const L = g.level!;
    const dx = g.CELL * 0.22;
    const dy = g.CELL * 0.18;
    for (let r = 0; r < L.rows; r++) {
      let c = 0;
      while (c < L.cols) {
        if (g.solid[r][c] && !g.isSolid(r - 1, c)) {
          const c0 = c;
          while (c < L.cols && g.solid[r][c] && !g.isSolid(r - 1, c)) c++;
          this.drawSlab(r, c0, c - 1, dx, dy);
        } else c++;
      }
    }
  }

  private drawSlab(r: number, c0: number, c1: number, dx: number, dy: number): void {
    const ctx = this.ctx;
    const g = this.g;
    const x0 = g.OX + c0 * g.CELL;
    const x1 = g.OX + (c1 + 1) * g.CELL;
    const yTop = g.OY + r * g.CELL;
    const frontH = g.CELL * 1.05;

    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, yTop + frontH + 4, (x1 - x0) / 2 + 6, g.CELL * 0.16, 0, 0, 7);
    ctx.fill();

    // front face
    const fg = ctx.createLinearGradient(0, yTop, 0, yTop + frontH);
    fg.addColorStop(0, PAL.slabFront);
    fg.addColorStop(1, PAL.slabFront2);
    ctx.fillStyle = fg;
    roundRectPath(ctx, x0, yTop, x1 - x0, frontH, 5);
    ctx.fill();

    // top face (parallelogram)
    const tg = ctx.createLinearGradient(0, yTop - dy, 0, yTop);
    tg.addColorStop(0, PAL.slabTop);
    tg.addColorStop(1, PAL.slabTop2);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(x0, yTop);
    ctx.lineTo(x0 + dx, yTop - dy);
    ctx.lineTo(x1 + dx, yTop - dy);
    ctx.lineTo(x1, yTop);
    ctx.closePath();
    ctx.fill();

    // rim highlight
    ctx.strokeStyle = 'rgba(120,200,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yTop);
    ctx.lineTo(x1, yTop);
    ctx.stroke();

    // panel seams + bolts
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let cc = c0; cc <= c1; cc++) {
      const sx = g.OX + (cc + 1) * g.CELL;
      if (cc < c1) {
        ctx.beginPath();
        ctx.moveTo(sx, yTop + 3);
        ctx.lineTo(sx, yTop + frontH - 3);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(150,180,255,0.18)';
      ctx.beginPath();
      ctx.arc(g.OX + cc * g.CELL + g.CELL * 0.5, yTop + frontH * 0.78, Math.max(1.2, g.CELL * 0.03), 0, 7);
      ctx.fill();
    }
  }

  // ---------- rails (ladders) ----------
  private drawRails(): void {
    const ctx = this.ctx;
    const g = this.g;
    const L = g.level!;
    for (let c = 0; c < L.cols; c++) {
      let r = 0;
      while (r < L.rows) {
        if (L.ladder[r][c]) {
          const r0 = r;
          while (r < L.rows && L.ladder[r][c]) r++;
          const x = g.OX + (c + 0.5) * g.CELL;
          const y0 = g.OY + r0 * g.CELL;
          const y1 = g.OY + r * g.CELL;
          const w = g.CELL * 0.34;
          ctx.strokeStyle = PAL.rail;
          ctx.lineWidth = g.CELL * 0.06;
          ctx.beginPath();
          ctx.moveTo(x - w, y0);
          ctx.lineTo(x - w, y1);
          ctx.moveTo(x + w, y0);
          ctx.lineTo(x + w, y1);
          ctx.stroke();
          ctx.strokeStyle = PAL.railHi;
          ctx.lineWidth = g.CELL * 0.05;
          for (let yy = y0 + g.CELL * 0.3; yy < y1; yy += g.CELL * 0.42) {
            ctx.beginPath();
            ctx.moveTo(x - w, yy);
            ctx.lineTo(x + w, yy);
            ctx.stroke();
          }
        } else r++;
      }
    }
  }

  // ---------- exit hatch ----------
  private drawDoor(): void {
    const ctx = this.ctx;
    const g = this.g;
    const d = g.door;
    if (!d) return;
    const x = g.OX + d.c * g.CELL;
    const y = g.OY + d.r * g.CELL;
    const w = g.CELL;
    const h = g.CELL;
    const op = d.open;

    // frame
    ctx.fillStyle = '#0c1024';
    roundRectPath(ctx, x + w * 0.12, y, w * 0.76, h, 6);
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, x + w * 0.16, y + 2, w * 0.68, h - 2, 5);
    ctx.clip();
    if (op > 0.02) {
      const ig = ctx.createLinearGradient(0, y, 0, y + h);
      ig.addColorStop(0, `rgba(120,220,255,${0.9 * op})`);
      ig.addColorStop(1, `rgba(60,130,255,${0.5 * op})`);
      ctx.fillStyle = ig;
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(200,240,255,${0.12 * op})`;
        ctx.fillRect(x + w * (0.22 + i * 0.15), y, w * 0.04, h);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = '#1b2247';
      ctx.fillRect(x, y, w, h);
      // sealed chevrons
      ctx.strokeStyle = 'rgba(160,180,230,0.5)';
      ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) {
        const yy = y + h * (0.28 + j * 0.22);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, yy);
        ctx.lineTo(x + w * 0.5, yy + h * 0.07);
        ctx.lineTo(x + w * 0.7, yy);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (op > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(
        x + w / 2,
        y + h / 2,
        0,
        x + w / 2,
        y + h / 2,
        g.CELL * 1.6
      );
      gg.addColorStop(0, `rgba(110,200,255,${0.4 * op})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - g.CELL, y - g.CELL, w + g.CELL * 2, h + g.CELL * 2);
      ctx.restore();
    }

    ctx.fillStyle = op > 0.02 ? '#082030' : 'rgba(200,210,255,0.55)';
    ctx.font = `700 ${g.CELL * 0.16}px "Space Grotesk",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', x + w / 2, y + h * 0.5);
  }

  // ---------- modules ----------
  private moduleVisual(m: PlacedModule): ModuleVisual {
    const g = this.g;
    if (g.mode === 'play') return { st: 'up' };
    const el = (g.t - g.chainStart) * 1000;
    const term = g.termEv[m.id];
    if (term && el >= term.t) return { st: 'gone' };
    const fe = g.activateEv[m.id];
    if (!fe) return { st: 'up' };
    const wob = fe.wobbleStart != null ? fe.wobbleStart : fe.t;
    if (el < wob) return { st: 'up' };
    if (fe.wobbleStart != null && el < fe.t) {
      return { st: 'wobble', k: (el - fe.wobbleStart) / (fe.t - fe.wobbleStart), dir: fe.dir };
    }
    if (el < fe.t + PULSE_MS) {
      const raw = (el - fe.t) / PULSE_MS;
      const a = raw * raw * (3 - 2 * raw);
      return {
        st: 'activate',
        a: (a * Math.PI) / 2,
        dir: fe.dir,
        type: fe.type,
        flash: Math.max(0, 1 - raw * 1.6),
      };
    }
    return { st: 'spent', dir: fe.dir };
  }

  private drawAllModules(): void {
    const g = this.g;
    let list: PlacedModule[] = g.mode === 'play' ? g.moduleList() : g.chainModules ?? [];
    list = list.slice().sort((a, b) => a.r - b.r || a.c - b.c);
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const vis = this.moduleVisual(m);
      if (vis.st === 'gone') continue;
      this.drawModule(m, vis, i);
    }
  }

  private drawModule(m: PlacedModule, vis: ModuleVisual, idx: number): void {
    const ctx = this.ctx;
    const g = this.g;
    const s = MODULE_STYLES[m.type];
    const bx = g.footX(m.c);
    const by = g.floorY(m.r);
    const w = g.CELL * 0.6;
    const h = g.CELL * 0.92;
    const depth = g.CELL * 0.14;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bx, by - 2, w * 0.7, g.CELL * 0.1, 0, 0, 7);
    ctx.fill();

    if (vis.st === 'spent') {
      this.drawSpent(bx, by, w, h, s, vis.dir, m.type);
      return;
    }

    // socket the device sits in
    ctx.fillStyle = '#0c1226';
    roundRectPath(ctx, bx - w * 0.62, by - g.CELL * 0.1, w * 1.24, g.CELL * 0.12, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,180,255,0.25)';
    ctx.beginPath();
    ctx.arc(bx - w * 0.5, by - g.CELL * 0.04, Math.max(1.2, g.CELL * 0.025), 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + w * 0.5, by - g.CELL * 0.04, Math.max(1.2, g.CELL * 0.025), 0, 7);
    ctx.fill();

    let ang = 0;
    let flash = 0;
    if (vis.st === 'activate') {
      ang = vis.a * vis.dir;
      flash = vis.flash;
    } else if (vis.st === 'wobble') {
      ang = Math.sin(g.t * 60) * 0.06 * (0.4 + vis.k * 0.6);
      flash = vis.k * 0.35; // charging glow
    }

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);
    this.drawDeviceBody(w, h, depth, s, m.type, flash);
    ctx.restore();

    // emissive halos for the important modules while idle
    if (vis.st === 'up' && s.glow) {
      this.drawHalo(bx, by - h * 0.55, s.glow, idx, m.type === 'Core' ? 1.05 : 0.85);
      if (m.type === 'Core') this.drawCoreRing(bx, by - h * 0.5, h * 0.5);
    }
  }

  private drawDeviceBody(
    w: number,
    h: number,
    depth: number,
    s: ModuleStyle,
    type: ModuleType,
    flash: number
  ): void {
    const ctx = this.ctx;
    const g = this.g;
    const led = s.glow || s.c1;

    // side / depth face
    ctx.fillStyle = s.edge;
    roundRectPath(ctx, -w / 2 + depth, -h - depth, w, h, 6);
    ctx.fill();

    // front face
    const fg = ctx.createLinearGradient(0, -h, 0, 0);
    fg.addColorStop(0, s.c1);
    fg.addColorStop(1, s.c2);
    ctx.fillStyle = fg;
    roundRectPath(ctx, -w / 2, -h, w, h, 6);
    ctx.fill();

    // outer border
    ctx.strokeStyle = hexA('#000000', 0.3);
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, -w / 2, -h, w, h, 6);
    ctx.stroke();

    // inner bevel
    ctx.strokeStyle = hexA('#ffffff', 0.22);
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, -w / 2 + 2, -h + 2, w - 4, h - 4, 5);
    ctx.stroke();

    // status LED
    ctx.fillStyle = led;
    ctx.beginPath();
    ctx.arc(0, -h + h * 0.12, w * 0.07, 0, 7);
    ctx.fill();

    // inset screen
    const sw = w * 0.66;
    const sh = h * 0.42;
    const sy = -h * 0.5;
    ctx.fillStyle = hexA('#05070f', 0.62);
    roundRectPath(ctx, -sw / 2, sy - sh / 2, sw, sh, 4);
    ctx.fill();
    ctx.strokeStyle = hexA('#000000', 0.4);
    ctx.lineWidth = 1;
    roundRectPath(ctx, -sw / 2, sy - sh / 2, sw, sh, 4);
    ctx.stroke();

    // icon
    ctx.save();
    ctx.translate(0, sy);
    drawIcon(ctx, type, Math.min(sw, sh) * 0.52, s.c1);
    ctx.restore();

    // vents near the base
    ctx.strokeStyle = hexA('#000000', 0.25);
    ctx.lineWidth = Math.max(1, g.CELL * 0.02);
    for (let i = 0; i < 3; i++) {
      const vy = -h * 0.16 + i * h * 0.05;
      ctx.beginPath();
      ctx.moveTo(-w * 0.26, vy);
      ctx.lineTo(w * 0.26, vy);
      ctx.stroke();
    }

    // gloss
    ctx.fillStyle = hexA('#ffffff', 0.16);
    roundRectPath(ctx, -w / 2 + w * 0.12, -h + h * 0.06, w * 0.16, h * 0.84, 3);
    ctx.fill();

    // power surge while activating / charging
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash;
      const eg = ctx.createLinearGradient(0, -h, 0, 0);
      eg.addColorStop(0, hexA(led, 0.85));
      eg.addColorStop(1, hexA(led, 0.15));
      ctx.fillStyle = eg;
      roundRectPath(ctx, -w / 2, -h, w, h, 6);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSpent(
    bx: number,
    by: number,
    w: number,
    h: number,
    s: ModuleStyle,
    dir: number,
    type: ModuleType
  ): void {
    const ctx = this.ctx;
    const len = h * 0.92;
    const th = w * 0.78;
    const x0 = bx;
    const x1 = bx + dir * len;
    const lx = Math.min(x0, x1);
    const rx = Math.max(x0, x1);
    const topY = by - th;

    // powered-down panel
    const tg = ctx.createLinearGradient(0, topY, 0, by);
    tg.addColorStop(0, '#283353');
    tg.addColorStop(1, '#161d36');
    ctx.fillStyle = tg;
    roundRectPath(ctx, lx, topY, rx - lx, th, 4);
    ctx.fill();
    ctx.strokeStyle = hexA('#000000', 0.3);
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, lx, topY, rx - lx, th, 4);
    ctx.stroke();

    // dim status strip in the module's colour
    ctx.fillStyle = hexA(s.c2, 0.5);
    ctx.fillRect(lx + 3, topY + 3, rx - lx - 6, th * 0.16);

    // faint icon near the head
    ctx.globalAlpha = 0.45;
    ctx.save();
    ctx.translate(bx + dir * len * 0.5, topY + th * 0.5);
    drawIcon(ctx, type, th * 0.42, hexA('#aab6ff', 0.9));
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawHalo(x: number, y: number, glow: string, idx: number, scale: number): void {
    const ctx = this.ctx;
    const g = this.g;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(g.t * 3 + idx);
    const R = g.CELL * 0.95 * scale;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, R);
    gg.addColorStop(0, hexA(glow, 0.35 + 0.2 * pulse));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  private drawCoreRing(x: number, y: number, R: number): void {
    const ctx = this.ctx;
    const g = this.g;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(g.t * 1.2);
    ctx.strokeStyle = hexA('#ffe79a', 0.85);
    ctx.lineWidth = Math.max(1.5, g.CELL * 0.03);
    ctx.setLineDash([R * 0.5, R * 0.5]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- robot ----------
  private drawRobot(): void {
    const ctx = this.ctx;
    const g = this.g;
    const a = g.robot;
    if (!a) return;
    const s = g.CELL;
    const x = a.fx;
    const y = a.fy + (a.moving ? 0 : a.bob);
    const f = a.facing;
    const walking = a.moving && a.kind === 'walk';
    const bob = walking ? Math.abs(Math.sin(a.phase)) * s * 0.02 : 0;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, s * 0.32, s * 0.09, 0, 0, 7);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    ctx.translate(0, -bob);

    // --- wheels / treads ---
    const wheelY = -s * 0.07;
    for (let i = -1; i <= 1; i += 2) {
      const wx = i * s * 0.16;
      ctx.fillStyle = '#11182e';
      ctx.beginPath();
      ctx.arc(wx, wheelY, s * 0.1, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#39456e';
      ctx.beginPath();
      ctx.arc(wx, wheelY, s * 0.055, 0, 7);
      ctx.fill();
      // spokes spin while walking
      ctx.strokeStyle = '#1a2138';
      ctx.lineWidth = s * 0.02;
      ctx.save();
      ctx.translate(wx, wheelY);
      ctx.rotate(walking ? a.phase * 1.4 : 0);
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s * 0.09);
        ctx.stroke();
      }
      ctx.restore();
    }

    // axle bar
    ctx.fillStyle = '#222c4a';
    roundRectPath(ctx, -s * 0.2, wheelY - s * 0.06, s * 0.4, s * 0.1, s * 0.04);
    ctx.fill();

    // --- chassis body ---
    const bodyBot = -s * 0.16;
    const bodyTop = -s * 0.5;
    const bodyW = s * 0.46;
    radialFill(ctx, 0, (bodyBot + bodyTop) / 2, s * 0.4, '#eef3ff', '#aebbe0');
    roundRectPath(ctx, -bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop, s * 0.08);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,60,0.5)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    roundRectPath(ctx, -bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop, s * 0.08);
    ctx.stroke();
    // panel seam + rivets
    ctx.strokeStyle = 'rgba(80,100,150,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, bodyTop + s * 0.04);
    ctx.lineTo(0, bodyBot - s * 0.04);
    ctx.stroke();
    ctx.fillStyle = 'rgba(80,100,150,0.55)';
    for (const rx of [-bodyW / 2 + s * 0.05, bodyW / 2 - s * 0.05]) {
      ctx.beginPath();
      ctx.arc(rx, bodyTop + s * 0.05, s * 0.014, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rx, bodyBot - s * 0.05, s * 0.014, 0, 7);
      ctx.fill();
    }
    // chest indicator LED (blinks)
    const blink = 0.5 + 0.5 * Math.sin(g.t * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(PAL.amber, 0.5 + 0.5 * blink);
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.04, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7a5410';
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.022, 0, 7);
    ctx.fill();

    // --- arms ---
    ctx.strokeStyle = '#8492b8';
    ctx.lineWidth = s * 0.05;
    ctx.lineCap = 'round';
    if (a.carrying) {
      // raised to hold the carried module overhead
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * bodyW * 0.42, bodyTop + s * 0.06);
        ctx.lineTo(i * s * 0.12, -s * 0.66);
        ctx.stroke();
      }
    } else {
      const swing = walking ? Math.sin(a.phase) * s * 0.05 : 0;
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.42, bodyTop + s * 0.08);
      ctx.lineTo(bodyW * 0.42 + s * 0.06, -s * 0.18 + swing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.42, bodyTop + s * 0.08);
      ctx.lineTo(-bodyW * 0.42 - s * 0.04, -s * 0.18 - swing);
      ctx.stroke();
    }

    // --- head ---
    const headBot = -s * 0.48;
    const headTop = -s * 0.72;
    const headW = s * 0.4;
    radialFill(ctx, 0, (headBot + headTop) / 2, s * 0.32, '#f4f7ff', '#bcc8ea');
    roundRectPath(ctx, -headW / 2, headTop, headW, headBot - headTop, s * 0.09);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,60,0.5)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    roundRectPath(ctx, -headW / 2, headTop, headW, headBot - headTop, s * 0.09);
    ctx.stroke();
    // side bolts
    ctx.fillStyle = '#9aa8cc';
    ctx.beginPath();
    ctx.arc(-headW / 2 - s * 0.01, (headBot + headTop) / 2, s * 0.025, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headW / 2 + s * 0.01, (headBot + headTop) / 2, s * 0.025, 0, 7);
    ctx.fill();
    // visor band
    const visorY = (headBot + headTop) / 2;
    ctx.fillStyle = '#0a1326';
    roundRectPath(ctx, -headW * 0.4, visorY - s * 0.06, headW * 0.8, s * 0.12, s * 0.05);
    ctx.fill();
    // glowing eye (looks toward facing)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createRadialGradient(s * 0.05, visorY, 0, s * 0.05, visorY, s * 0.12);
    eg.addColorStop(0, hexA(PAL.accent, 0.95));
    eg.addColorStop(1, 'rgba(95,208,255,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(s * 0.05, visorY, s * 0.12, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#dffaff';
    ctx.beginPath();
    ctx.arc(s * 0.05, visorY, s * 0.035, 0, 7);
    ctx.fill();

    // --- antenna ---
    const sway = Math.sin(g.t * 2.2) * s * 0.02;
    ctx.strokeStyle = '#8492b8';
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.moveTo(s * 0.02, headTop);
    ctx.quadraticCurveTo(s * 0.06, headTop - s * 0.1, s * 0.06 + sway, headTop - s * 0.16);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(PAL.amber, 0.4 + 0.4 * blink);
    ctx.beginPath();
    ctx.arc(s * 0.06 + sway, headTop - s * 0.17, s * 0.045, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PAL.amber;
    ctx.beginPath();
    ctx.arc(s * 0.06 + sway, headTop - s * 0.17, s * 0.022, 0, 7);
    ctx.fill();

    // --- carried module ---
    if (a.carrying) {
      const cs = MODULE_STYLES[a.carrying];
      ctx.save();
      ctx.translate(0, -s * 0.84);
      const cw = s * 0.3;
      const ch = s * 0.34;
      const fg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
      fg.addColorStop(0, cs.c1);
      fg.addColorStop(1, cs.c2);
      ctx.fillStyle = fg;
      roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, 4);
      ctx.fill();
      ctx.strokeStyle = hexA('#000', 0.25);
      ctx.lineWidth = 1.2;
      roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, 4);
      ctx.stroke();
      drawIcon(ctx, a.carrying, Math.min(cw, ch) * 0.42, cs.edge);
      if (cs.glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, cw);
        gg.addColorStop(0, hexA(cs.glow, 0.4));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(0, 0, cw, 0, 7);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ---------- hint ghosts ----------
  private drawHintGhosts(): void {
    const ctx = this.ctx;
    const g = this.g;
    if (!g.hint || g.mode !== 'play') return;
    const sol = g.level!.solution;
    if (!sol) return;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexA(PAL.amber, 0.9);
    (sol.moves || []).forEach((m) => {
      this.arrow(
        g.footX(m.from[1]),
        g.floorY(m.from[0]) - g.CELL * 0.5,
        g.footX(m.to[1]),
        g.floorY(m.to[0]) - g.CELL * 0.5
      );
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = PAL.accent;
    ctx.lineWidth = 3;
    if (sol.push) {
      const px = g.footX(sol.push.cell[1]);
      const py = g.floorY(sol.push.cell[0]) - g.CELL * 0.5;
      this.arrow(px - sol.push.dir * g.CELL * 0.7, py, px + sol.push.dir * g.CELL * 0.3, py);
    }
    ctx.restore();
  }

  private arrow(x0: number, y0: number, x1: number, y1: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(ang - 0.5) * 10, y1 - Math.sin(ang - 0.5) * 10);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(ang + 0.5) * 10, y1 - Math.sin(ang + 0.5) * 10);
    ctx.stroke();
  }

  // ---------- lighting ----------
  private drawLighting(): void {
    const ctx = this.ctx;
    const g = this.g;
    const grad = ctx.createRadialGradient(
      g.W / 2,
      g.H * 0.45,
      g.H * 0.2,
      g.W / 2,
      g.H * 0.5,
      g.H * 0.85
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, g.W, g.H);
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(210,235,255,${g.flash * 0.5})`;
      ctx.fillRect(0, 0, g.W, g.H);
    }
  }
}
