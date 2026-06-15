/* ============================================================
   Chain Lab — Visual theme: palette, per-module colour language, icons.
   ============================================================ */

import type { ModuleType } from '../engine/types';

/** Scene palette — a cool, premium machine-lab look. */
export const PAL = {
  bgTop: '#0a1326',
  bgBot: '#05070f',
  grid: 'rgba(120,160,255,0.05)',
  slabTop: '#2b3a63',
  slabTop2: '#1d2748',
  slabFront: '#141c38',
  slabFront2: '#0c1228',
  slabRim: '#6d80d8',
  rail: '#5a6699',
  railHi: '#aab6ff',
  text: '#e8ecff',
  accent: '#5fd0ff',
  amber: '#ffb02e',
};

export interface ModuleStyle {
  c1: string;
  c2: string;
  edge: string;
  /** Optional emissive colour for modules that glow (Core, Blast). */
  glow?: string;
}

/**
 * Each module type has a distinct colour so the board reads instantly:
 *   Relay     blue      — the everyday signal carrier
 *   Core      gold      — the important one (glows)
 *   Firewall  red       — a hard block
 *   Timer     amber     — holds the pulse
 *   Splitter  green     — branches the pulse
 *   Phase     violet    — phases out
 *   Bridge    teal      — builds floor
 *   Blast     orange    — destroys floor (glows)
 */
export const MODULE_STYLES: Record<ModuleType, ModuleStyle> = {
  Relay: { c1: '#8fd0ff', c2: '#2f86e6', edge: '#103a6e' },
  Core: { c1: '#fff2bf', c2: '#ffc23a', edge: '#8a5e10', glow: '#ffd24a' },
  Firewall: { c1: '#ff90a6', c2: '#e23556', edge: '#75132a' },
  Timer: { c1: '#ffe49a', c2: '#f5a623', edge: '#7a5210' },
  Splitter: { c1: '#8bf0a6', c2: '#22c259', edge: '#0d5a28' },
  Phase: { c1: '#cdbcff', c2: '#8a5cf0', edge: '#3a2080' },
  Bridge: { c1: '#8ff0e2', c2: '#1fbfb0', edge: '#0a5a52' },
  Blast: { c1: '#ffc08a', c2: '#ff5f2a', edge: '#7a2a0e', glow: '#ff7a3d' },
};

/** Player-facing copy for the legend / help panel. */
export const MODULE_INFO: { type: ModuleType; name: string; desc: string }[] = [
  { type: 'Relay', name: 'Relay Module', desc: 'Activates and passes the pulse on to the next module in line.' },
  { type: 'Core', name: 'Final Core', desc: 'The goal. The pulse must reach it LAST to power the exit.' },
  {
    type: 'Firewall',
    name: 'Firewall Block',
    desc: 'A hard wall. Can’t be pushed and never activates — the pulse stops dead against it.',
  },
  { type: 'Timer', name: 'Timer Module', desc: 'Holds the pulse for a moment, then releases it onward.' },
  { type: 'Splitter', name: 'Splitter Node', desc: 'Splits the pulse in two: one half forward, one half back.' },
  { type: 'Phase', name: 'Phase Module', desc: 'Passes the pulse on, then phases out — leaving a gap behind.' },
  {
    type: 'Bridge',
    name: 'Bridge Module',
    desc: 'Extends a temporary floor across a one-tile gap, routing the pulse on.',
  },
  { type: 'Blast', name: 'Blast Cell', desc: 'Can’t be pushed. When the pulse hits, it blasts out the floor below.' },
];

/**
 * Draw a module's identifying icon, centred at the current origin.
 * `R` is the icon scale; `color` is the stroke/fill ink (usually style.edge).
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  type: ModuleType,
  R: number,
  color: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, R * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = R * 0.62;

  switch (type) {
    case 'Relay': {
      // Two forward signal chevrons »
      for (let i = 0; i < 2; i++) {
        const ox = -r * 0.35 + i * r * 0.7;
        ctx.beginPath();
        ctx.moveTo(ox - r * 0.25, -r * 0.55);
        ctx.lineTo(ox + r * 0.25, 0);
        ctx.lineTo(ox - r * 0.25, r * 0.55);
        ctx.stroke();
      }
      break;
    }
    case 'Core': {
      // Reactor: outer ring + orbiting nodes + bright centre.
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'Firewall': {
      // Brick wall — offset rows read as "block".
      ctx.lineWidth = Math.max(1.2, R * 0.12);
      const bw = r * 1.6;
      const bh = r * 0.5;
      const x0 = -bw / 2;
      for (let row = 0; row < 3; row++) {
        const y = -bh * 1.5 + row * bh;
        ctx.strokeRect(x0, y, bw, bh);
        const off = row % 2 ? bw * 0.5 : bw * 0.25;
        ctx.beginPath();
        ctx.moveTo(x0 + off, y);
        ctx.lineTo(x0 + off, y + bh);
        ctx.stroke();
      }
      break;
    }
    case 'Timer': {
      // Clock face + hands.
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r * 0.55);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.45, r * 0.12);
      ctx.stroke();
      break;
    }
    case 'Splitter': {
      // Pulse splits both ways from the centre.
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, 0);
      ctx.lineTo(-r, 0);
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r * 0.6, -r * 0.42);
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r * 0.6, r * 0.42);
      ctx.moveTo(r * 0.15, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 0.6, -r * 0.42);
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 0.6, r * 0.42);
      ctx.stroke();
      break;
    }
    case 'Phase': {
      // A phasing (dashed) ring with a fading core.
      ctx.setLineDash([R * 0.24, R * 0.2]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'Bridge': {
      // Girder: top & bottom beams with diagonal bracing.
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.45);
      ctx.lineTo(r, -r * 0.45);
      ctx.moveTo(-r, r * 0.45);
      ctx.lineTo(r, r * 0.45);
      ctx.moveTo(-r, r * 0.45);
      ctx.lineTo(-r * 0.2, -r * 0.45);
      ctx.moveTo(-r * 0.2, r * 0.45);
      ctx.lineTo(r * 0.45, -r * 0.45);
      ctx.moveTo(r * 0.45, r * 0.45);
      ctx.lineTo(r, -r * 0.45);
      ctx.stroke();
      break;
    }
    case 'Blast': {
      // Starburst.
      for (let k = 0; k < 8; k++) {
        const a = k * (Math.PI / 4);
        const inner = k % 2 ? r * 0.3 : r * 0.45;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
