/* ============================================================
   Chain Lab — Application bootstrap.
   ============================================================ */

import './style.css';
import { Game } from './game/Game';
import { bindInput } from './game/input';

// Reveal the on-screen pad on touch devices.
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('touch');
}

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Chain Lab: missing #game canvas.');

const game = new Game(canvas);
bindInput(game);
game.start();
