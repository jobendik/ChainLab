/* ============================================================
   Chain Lab — Particle / FX system.
   ============================================================ */

type ParticleKind = 'dust' | 'smoke' | 'spark' | 'ring' | 'flash' | 'confetti' | 'bolt';

interface Particle {
  k: ParticleKind;
  x: number;
  y: number;
  life: number;
  t: number;
  vx?: number;
  vy?: number;
  r?: number;
  col?: string;
  grav?: number;
  r0?: number;
  r1?: number;
  rot?: number;
  vr?: number;
  // bolt endpoints
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

export class Particles {
  private list: Particle[] = [];

  clear(): void {
    this.list.length = 0;
  }

  private add(p: Particle): void {
    this.list.push(p);
  }

  /** A soft puff of dust/energy. */
  puff(x: number, y: number, n: number, cell: number, col = '#cfc39a'): void {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'dust',
        x: x + (Math.random() - 0.5) * cell * 0.5,
        y: y - Math.random() * cell * 0.2,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 50,
        life: 0.5 + Math.random() * 0.4,
        t: 0,
        r: cell * (0.05 + Math.random() * 0.08),
        col,
      });
    }
  }

  /** An expanding ring shock. */
  ring(x: number, y: number, cell: number, col: string, scale = 1): void {
    this.add({
      k: 'ring',
      x,
      y,
      life: 0.4,
      t: 0,
      r0: cell * 0.2 * scale,
      r1: cell * 1.0 * scale,
      col,
    });
  }

  /** A fast glowing pulse streak travelling from one module to the next. */
  bolt(x0: number, y0: number, x1: number, y1: number, col: string): void {
    this.add({ k: 'bolt', x: x0, y: y0, x0, y0, x1, y1, life: 0.16, t: 0, col });
  }

  explosion(x: number, y: number, cell: number): void {
    this.add({ k: 'flash', x, y, life: 0.18, t: 0, r0: cell * 0.3, r1: cell * 2.4, col: '#fff2c2' });
    for (let i = 0; i < 26; i++) {
      this.add({
        k: 'spark',
        x,
        y,
        vx: (Math.random() - 0.5) * 520,
        vy: (Math.random() - 0.7) * 520,
        life: 0.4 + Math.random() * 0.5,
        t: 0,
        r: cell * (0.04 + Math.random() * 0.06),
        col: ['#ffd36a', '#ff8a3d', '#ff5a2a', '#ffffff'][i % 4],
        grav: 900,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.add({
        k: 'smoke',
        x: x + (Math.random() - 0.5) * cell,
        y: y - Math.random() * cell * 0.5,
        vx: (Math.random() - 0.5) * 60,
        vy: -40 - Math.random() * 60,
        life: 0.7 + Math.random() * 0.6,
        t: 0,
        r: cell * (0.2 + Math.random() * 0.2),
        col: '#4a4458',
      });
    }
  }

  /** Phase-out implosion sparks. */
  phaseFx(x: number, y: number, cell: number): void {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.add({
        k: 'spark',
        x: x + Math.cos(a) * cell * 0.6,
        y: y + Math.sin(a) * cell * 0.6,
        vx: -Math.cos(a) * 160,
        vy: -Math.sin(a) * 160,
        life: 0.4,
        t: 0,
        r: cell * 0.05,
        col: '#b79bff',
        grav: 0,
      });
    }
  }

  confetti(x: number, y: number, cell: number): void {
    const cols = ['#8fd0ff', '#ffd24a', '#8bf0a6', '#b79bff', '#8ff0e2', '#ff90a6'];
    for (let i = 0; i < 90; i++) {
      this.add({
        k: 'confetti',
        x: x + (Math.random() - 0.5) * cell * 2,
        y: y - Math.random() * cell,
        vx: (Math.random() - 0.5) * 360,
        vy: -260 - Math.random() * 320,
        life: 1.6 + Math.random() * 1.2,
        t: 0,
        r: cell * (0.08 + Math.random() * 0.08),
        col: cols[i % cols.length],
        grav: 520,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 16,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      if (p.vx != null) {
        p.x += p.vx * dt;
        p.y += (p.vy ?? 0) * dt;
      }
      if (p.grav) p.vy = (p.vy ?? 0) + p.grav * dt;
      if (p.vr) p.rot = (p.rot ?? 0) + p.vr * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, cell: number): void {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      const k = p.t / p.life;
      const alpha = 1 - k;
      if (p.k === 'dust' || p.k === 'smoke') {
        ctx.globalAlpha = alpha * (p.k === 'smoke' ? 0.5 : 0.7);
        ctx.fillStyle = p.col!;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.r ?? 1) * (1 + k * (p.k === 'smoke' ? 1.6 : 0.4)), 0, 7);
        ctx.fill();
      } else if (p.k === 'spark') {
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.col!;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r ?? 1, 0, 7);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.k === 'ring') {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.col!;
        ctx.lineWidth = cell * 0.06;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.r0 ?? 0) + ((p.r1 ?? 0) - (p.r0 ?? 0)) * k, 0, 7);
        ctx.stroke();
      } else if (p.k === 'flash') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        const rr = (p.r0 ?? 0) + ((p.r1 ?? 0) - (p.r0 ?? 0)) * k;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, p.col!);
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, 7);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.k === 'bolt') {
        // Travelling pulse: a bright head with a short trail.
        const hx = (p.x0 ?? 0) + ((p.x1 ?? 0) - (p.x0 ?? 0)) * k;
        const hy = (p.y0 ?? 0) + ((p.y1 ?? 0) - (p.y0 ?? 0)) * k;
        const tk = Math.max(0, k - 0.4);
        const tx = (p.x0 ?? 0) + ((p.x1 ?? 0) - (p.x0 ?? 0)) * tk;
        const ty = (p.y0 ?? 0) + ((p.y1 ?? 0) - (p.y0 ?? 0)) * tk;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = p.col!;
        ctx.lineWidth = cell * 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, cell * 0.07, 0, 7);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.k === 'confetti') {
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.fillStyle = p.col!;
        const r = p.r ?? 2;
        ctx.fillRect(-r, -r * 0.5, r * 2, r);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}
