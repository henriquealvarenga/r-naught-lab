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
 *   day()       — tique curto a cada dia que passa
 *   intervene() — arpejo ascendente ao comprar uma intervencao
 *   plantao()   — sino grave de "plantao" (breaking news)
 *   collapse()  — alerta descendente quando o hospital colapsa
 *   newsSting() — vinheta de abertura do telejornal (~2,2 s)
 *
 * Todas as vozes passam por um BARRAMENTO MESTRE (gain -> compressor) antes da
 * saida. Enquanto cada som era 1 oscilador isso nao importava, mas a vinheta
 * sobrepoe ate 4 vozes e a soma estourava em 0 dBFS, chiando.
 */

const STORAGE_KEY = 'epidemic.sound';
const VOLUME = 0.18;

let ctx = null;
let bus = null;      // entrada do barramento mestre
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
  if (!ctx) {
    ctx = new AC();
    // Barramento mestre: protege contra clipping quando varias vozes somam.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, ctx.currentTime);
    comp.ratio.setValueAtTime(12, ctx.currentTime);
    comp.attack.setValueAtTime(0.003, ctx.currentTime);
    comp.release.setValueAtTime(0.25, ctx.currentTime);
    bus = ctx.createGain();
    bus.gain.setValueAtTime(1, ctx.currentTime);
    bus.connect(comp).connect(ctx.destination);
  }
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

/**
 * Uma voz: oscilador -> [filtro] -> envelope -> barramento.
 * @param {object} o
 * @param {number} o.freq      frequencia inicial (Hz)
 * @param {number} [o.dur]     duracao ate o silencio
 * @param {string} [o.type]    forma de onda
 * @param {number} [o.vol]     multiplicador sobre VOLUME
 * @param {number} [o.slideTo] glide exponencial de freq ate o fim
 * @param {number} [o.delay]   atraso de agendamento (monta arpejos/vinhetas)
 * @param {number} [o.detune]  desafinacao em cents (engrossa acordes)
 * @param {number} [o.attack]  tempo de ataque
 * @param {number} [o.lp]      corte de um lowpass; se `lpTo`, o filtro abre
 * @param {number} [o.lpTo]    corte final do lowpass (swell de brilho)
 */
function beep({
  freq, dur = 0.15, type = 'sine', vol = 1, slideTo = null, delay = 0,
  detune = 0, attack = 0.012, lp = null, lpTo = null,
}) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.detune.setValueAtTime(detune, t0);
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);

  const peak = VOLUME * vol;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node = osc;
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lp, t0);
    if (lpTo) f.frequency.exponentialRampToValueAtTime(Math.max(1, lpTo), t0 + dur);
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(bus || c.destination);
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

/**
 * Vinheta de abertura do telejornal (~2,2 s), sincronizada com a animacao de
 * `playIntro()` em game/screens.js. Quatro gestos, na gramatica de plantao:
 *
 *   0,00s  impacto grave — seno 90->45 Hz, o "soco" que abre a chamada
 *   0,25s  tres notas urgentes repetidas (Si4 staccato), o teletipo
 *   0,55s  swell ascendente — sawtooth subindo com o lowpass abrindo
 *   1,25s  acorde final — tres saws desafinados (Mi/Si/Mi), sustentado
 *
 * Tudo passa pelo barramento com compressor, senao a soma estoura.
 */
export function newsSting() {
  // 1) impacto grave
  beep({ freq: 90, dur: 0.55, type: 'sine', vol: 1.5, slideTo: 45, attack: 0.004 });
  beep({ freq: 180, dur: 0.18, type: 'triangle', vol: 0.5, slideTo: 90 });

  // 2) tres notas urgentes (staccato)
  for (let i = 0; i < 3; i++) {
    beep({ freq: 988, dur: 0.075, type: 'square', vol: 0.42, delay: 0.25 + i * 0.115, attack: 0.004 });
  }

  // 3) swell ascendente: a frequencia sobe e o filtro abre junto
  beep({
    freq: 220, dur: 0.72, type: 'sawtooth', vol: 0.62, slideTo: 660,
    delay: 0.55, attack: 0.30, lp: 320, lpTo: 4200,
  });

  // 4) acorde final sustentado (Mi3 / Si3 / Mi4), levemente desafinado
  const chord = [{ f: 164.8, d: -7 }, { f: 246.9, d: 5 }, { f: 329.6, d: 9 }];
  for (const n of chord) {
    beep({
      freq: n.f, dur: 0.95, type: 'sawtooth', vol: 0.34, delay: 1.25,
      detune: n.d, attack: 0.02, lp: 2600,
    });
  }
  // brilho por cima do acorde
  beep({ freq: 659.3, dur: 0.8, type: 'triangle', vol: 0.28, delay: 1.28, attack: 0.03 });
}
