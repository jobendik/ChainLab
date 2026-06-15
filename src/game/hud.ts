/* ============================================================
   Chain Lab — HUD & overlays (DOM side). No game logic here.
   ============================================================ */

import { MODULE_INFO, MODULE_STYLES } from './theme';
import { clamp } from './util';

export interface HudHandlers {
  start: () => void;
  begin: () => void;
  next: () => void;
  reset: () => void;
  hint: () => void;
  mute: () => void;
  legend: () => void;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in the page.`);
  return el as T;
}

export class Hud {
  private levelName = byId('levelName');
  private levelNum = byId('levelNum');
  private toast = byId('toast');
  private intro = byId('intro');
  private introName = byId('introName');
  private introHint = byId('introHint');
  private introNum = byId('introNum');
  private clearOv = byId('clear');
  private clearTitle = byId('clearTitle');
  private clearSub = byId('clearSub');
  private clearBtn = byId('clearBtn');
  private title = byId('title');
  private legend = byId('legend');
  private muteBtn = byId('muteBtn');

  private gauge = byId<HTMLCanvasElement>('gauge');
  private gctx = this.gauge.getContext('2d')!;
  private DPR = Math.min(window.devicePixelRatio || 1, 2);

  constructor() {
    this.buildLegend();
  }

  bind(h: HudHandlers): void {
    byId('startBtn').addEventListener('click', h.start);
    byId('introBtn').addEventListener('click', h.begin);
    this.clearBtn.addEventListener('click', h.next);
    byId('resetBtn').addEventListener('click', h.reset);
    byId('hintBtn').addEventListener('click', h.hint);
    this.muteBtn.addEventListener('click', h.mute);
    byId('legendBtn').addEventListener('click', h.legend);
    byId('legendClose').addEventListener('click', () => this.closeLegend());
  }

  // ---- title ----
  showTitle(): void {
    this.title.classList.add('show');
  }
  hideTitle(): void {
    this.title.classList.remove('show');
  }

  // ---- intro ----
  showIntro(name: string, index: number, total: number, hint: string): void {
    this.introName.textContent = name;
    this.introNum.textContent = `Chamber ${index + 1} / ${total}`;
    this.introHint.textContent = hint;
    this.intro.classList.add('show');
  }
  hideIntro(): void {
    this.intro.classList.remove('show');
  }

  // ---- clear ----
  showClear(isLast: boolean): void {
    this.clearTitle.textContent = isLast ? 'All Chambers Cleared!' : 'Chamber Cleared';
    this.clearSub.textContent = isLast
      ? 'Every circuit routed and every Core online. The lab is yours.'
      : 'Pulse routed cleanly. On to the next chamber.';
    this.clearBtn.textContent = isLast ? 'Play Again' : 'Next Chamber';
    this.clearOv.classList.add('show');
  }
  hideClear(): void {
    this.clearOv.classList.remove('show');
  }

  // ---- legend ----
  toggleLegend(): void {
    this.legend.classList.toggle('show');
  }
  closeLegend(): void {
    this.legend.classList.remove('show');
  }

  // ---- per-frame ----
  setBadge(name: string, index: number): void {
    this.levelName.textContent = name;
    this.levelNum.textContent = String(index + 1).padStart(2, '0');
  }
  setToast(text: string): void {
    this.toast.textContent = text || '';
    this.toast.style.opacity = text ? '1' : '0';
  }
  setMuteLabel(muted: boolean): void {
    this.muteBtn.textContent = muted ? '✕ Sound' : '♪ Sound';
  }

  /** Draw the circular power gauge (replaces the old burning fuse). */
  drawGauge(timeLeft: number, total: number): void {
    const sz = 64;
    if (this.gauge.width !== sz * this.DPR) {
      this.gauge.width = sz * this.DPR;
      this.gauge.height = sz * this.DPR;
    }
    const g = this.gctx;
    g.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    g.clearRect(0, 0, sz, sz);
    const cx = sz / 2;
    const cy = sz / 2;
    const R = sz * 0.38;
    const frac = total ? clamp(timeLeft / total, 0, 1) : 1;

    // track
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(cx, cy, R, 0, 7);
    g.stroke();

    // power arc — cools from cyan to red as it drains
    const col = frac > 0.4 ? '#5fd0ff' : frac > 0.18 ? '#ffb02e' : '#ff3a4f';
    const a0 = -Math.PI / 2;
    const a1 = a0 + frac * Math.PI * 2;
    g.strokeStyle = col;
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.shadowColor = col;
    g.shadowBlur = frac < 0.18 ? 10 : 6;
    g.beginPath();
    g.arc(cx, cy, R, a0, a1);
    g.stroke();
    g.shadowBlur = 0;

    // glowing tip
    const ex = cx + Math.cos(a1) * R;
    const ey = cy + Math.sin(a1) * R;
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(ex, ey, 3, 0, 7);
    g.fill();

    // number
    const tl = Math.max(0, Math.ceil(timeLeft));
    g.fillStyle = '#fff';
    g.font = '700 16px "Space Mono",monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(tl), cx, cy + 1);
  }

  private buildLegend(): void {
    const box = byId('legendList');
    MODULE_INFO.forEach((info) => {
      const s = MODULE_STYLES[info.type];
      const row = document.createElement('div');
      row.className = 'lrow';
      row.innerHTML =
        `<span class="sw" style="background:linear-gradient(180deg,${s.c1},${s.c2})"></span>` +
        `<span class="ln"><b>${info.name}</b><i>${info.desc}</i></span>`;
      box.appendChild(row);
    });
  }
}
