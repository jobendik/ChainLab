/* ============================================================
   Chain Lab — Input wiring: HUD buttons, keyboard, on-screen pad.
   ============================================================ */

import type { Game } from './Game';

export function bindInput(game: Game): void {
  const hud = game.hud;

  // ---- HUD buttons ----
  hud.bind({
    start: () => game.startGame(),
    begin: () => game.beginLevel(),
    next: () => game.nextLevel(),
    reset: () => game.reset(),
    hint: () => game.toggleHint(),
    mute: () => game.toggleMute(),
    legend: () => hud.toggleLegend(),
  });

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    game.audio.init();

    if (game.mode === 'title') {
      if (e.key === 'Enter' || e.key === ' ') game.startGame();
      return;
    }
    if (game.mode === 'intro') {
      if (e.key === 'Enter' || e.key === ' ') {
        game.beginLevel();
        e.preventDefault();
      }
      return;
    }
    if (game.mode === 'clear') {
      if (e.key === 'Enter') game.nextLevel();
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'r') {
      game.reset();
      return;
    }
    if (k === 'h') {
      game.toggleHint();
      return;
    }
    if (k === 'm') {
      game.toggleMute();
      return;
    }
    if (game.mode !== 'play' && game.mode !== 'open') return;

    if (k === 'arrowleft' || k === 'a') {
      game.actHoriz(-1);
      e.preventDefault();
    } else if (k === 'arrowright' || k === 'd') {
      game.actHoriz(1);
      e.preventDefault();
    } else if (k === 'arrowup' || k === 'w') {
      game.actUp();
      e.preventDefault();
    } else if (k === 'arrowdown' || k === 's') {
      game.actDown();
      e.preventDefault();
    } else if (k === 'z' || k === 'j' || k === 'enter') {
      if (game.mode === 'play') game.actGrabDrop();
    } else if (k === 'x' || k === 'k' || k === ' ') {
      if (game.mode === 'play') {
        game.actPush();
        e.preventDefault();
      }
    }
  });

  // ---- on-screen pad (touch) ----
  const playable = () => game.mode === 'play' || game.mode === 'open';
  bindHold('bL', () => playable() && game.actHoriz(-1), true);
  bindHold('bR', () => playable() && game.actHoriz(1), true);
  bindHold('bU', () => playable() && game.actUp(), true);
  bindHold('bD', () => playable() && game.actDown(), true);
  bindHold('bG', () => game.mode === 'play' && game.actGrabDrop(), false);
  bindHold('bP', () => game.mode === 'play' && game.actPush(), false);

  function bindHold(id: string, fn: () => void, repeat: boolean): void {
    const btn = document.getElementById(id);
    if (!btn) return;
    let timer: number | null = null;
    const start = (e: Event) => {
      e.preventDefault();
      game.audio.init();
      fn();
      if (repeat) timer = window.setInterval(fn, 150);
    };
    const end = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointerleave', end);
    btn.addEventListener('pointercancel', end);
  }
}
