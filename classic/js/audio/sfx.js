// ============================================================================
// audio/sfx.js  ·  Sons sintetizados via Web Audio API.
// Sem arquivos de áudio: tudo é gerado por osciladores em tempo real, então
// funciona offline e não adiciona binários ao repositório.
//   • tick()   — tique do relógio (mais agudo/forte quando o tempo acaba)
//   • acerto() — arpejo ascendente alegre
//   • erro()   — descida grave
// A preferência de som (ligado/mudo) é persistida no localStorage.
//
// Política de autoplay: navegadores só permitem áudio após um gesto do
// usuário. Por isso o AudioContext é criado/retomado em `despertar()`, chamado
// a partir de um clique (ex.: botão "Jogar" e o botão de som).
// ============================================================================

import { SOM } from "../config.js";

let ctx = null;
let habilitado = carregar();

function carregar() {
  try {
    const v = localStorage.getItem(SOM.chaveStorage);
    if (v === null) return SOM.habilitadoPorPadrao;
    return v === "1";
  } catch (e) { return SOM.habilitadoPorPadrao; }
}
function salvar() {
  try { localStorage.setItem(SOM.chaveStorage, habilitado ? "1" : "0"); } catch (e) {}
}

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Retoma o contexto dentro de um gesto do usuário (chame a partir de um clique).
export function despertar() { if (habilitado) getCtx(); }

export function estaHabilitado() { return habilitado; }

export function alternarSom() {
  habilitado = !habilitado;
  salvar();
  if (habilitado) getCtx(); // veio de um clique → pode retomar o contexto
  return habilitado;
}

// Um "beep" com envelope simples (ataque rápido + decaimento). Base dos sons.
function beep({ freq, dur = 0.15, tipo = "sine", vol = 1, slideTo = null, delay = 0 }) {
  if (!habilitado) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  const pico = SOM.volume * vol;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(pico, t0 + 0.012);   // ataque
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);   // decaimento
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// Tique do relógio; mais agudo e forte quando o tempo está acabando.
export function tick(urgente = false) {
  beep({ freq: urgente ? 1100 : 760, dur: 0.045, tipo: "square", vol: urgente ? 0.7 : 0.4 });
}

// Acerto: arpejo ascendente (dó-mi-sol subindo).
export function acerto() {
  beep({ freq: 660,  dur: 0.12, vol: 0.9, delay: 0.00 });
  beep({ freq: 880,  dur: 0.12, vol: 0.9, delay: 0.10 });
  beep({ freq: 1320, dur: 0.22, vol: 0.9, delay: 0.20 });
}

// Erro: descida grave "buzz".
export function erro() {
  beep({ freq: 330, dur: 0.30, tipo: "sawtooth", vol: 0.8, slideTo: 120 });
}
