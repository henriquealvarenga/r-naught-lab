/**
 * game/sfx.js
 * -----------------------------------------------------------------------------
 * Sons sintetizados via Web Audio API (portado de classic/js/audio/sfx.js).
 * Sem arquivos de audio: osciladores em tempo real -> funciona offline, zero
 * binarios. Camada de UI (nao e o motor) — pode usar window/localStorage.
 *
 * Politica de autoplay: navegadores so tocam apos um gesto do usuario, entao o
 * AudioContext e criado/retomado em wake(), chamado a partir de um clique.
 *
 *   day()      — tique curto a cada dia que passa
 *   intervene()— arpejo ascendente ao comprar uma intervencao
 *   plantao()  — sino grave de "plantao" (breaking news)
 *   collapse() — alerta descendente quando o hospital colapsa
 */

const STORAGE_KEY = 'epidemic.sound';
const VOLUME = 0.18;

let ctx = null;
let enabled = load();

function load() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === '1';
  } catch (_) { return true; }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (_) { /* noop */ }
}

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Retoma o contexto dentro de um gesto do usuario (chame a partir de um clique). */
export function wake() { if (enabled) getCtx(); }

export function isEnabled() { return enabled; }

export function toggle() {
  enabled = !enabled;
  save();
  if (enabled) getCtx();
  return enabled;
}

function beep({ freq, dur = 0.15, type = 'sine', vol = 1, slideTo = null, delay = 0 }) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  const peak = VOLUME * vol;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Tique discreto a cada dia. */
export function day() { beep({ freq: 620, dur: 0.03, type: 'square', vol: 0.25 }); }

/** Arpejo ascendente ao implantar uma intervencao. */
export function intervene() {
  beep({ freq: 660, dur: 0.10, vol: 0.8, delay: 0.00 });
  beep({ freq: 990, dur: 0.14, vol: 0.8, delay: 0.09 });
}

/** Sino de plantao (breaking news). */
export function plantao() {
  beep({ freq: 440, dur: 0.18, type: 'triangle', vol: 0.9, delay: 0.00 });
  beep({ freq: 587, dur: 0.30, type: 'triangle', vol: 0.9, delay: 0.14 });
}

/** Alerta descendente quando o hospital colapsa. */
export function collapse() {
  beep({ freq: 330, dur: 0.35, type: 'sawtooth', vol: 0.7, slideTo: 110 });
}
