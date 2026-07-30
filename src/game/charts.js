/**
 * game/charts.js
 * -----------------------------------------------------------------------------
 * Os dois graficos do cockpit, em <canvas> sem dependencias. A decisao de design
 * (docs/PLAY_MODE_DESIGN.md §2, rodada 2) e o EIXO Y FIXO: nunca reescalar
 * automaticamente, para preservar a nocao de magnitude e permitir comparar
 * antes/depois de uma intervencao.
 *
 *   Macro ("A epidemia")     — eixo Y fixo = ½ da populacao (½N). S, R, D e a
 *                              onda de I (preenchida).
 *   Zoom  ("Pressao hospital")— eixo Y fixo = 2,5× a capacidade INICIAL de leitos.
 *                              H (preenchida) + linha de capacidade (que sobe se
 *                              o jogador compra leitos) + D acumulado.
 */

import { HORIZON } from './store.js';

/** Le uma variavel CSS resolvida no escopo do jogo (.game-app). */
function cvar(rootEl, name) {
  return getComputedStyle(rootEl).getPropertyValue(name).trim();
}

/**
 * Arredonda para cima ate o proximo numero "redondo" (1/2/5 x 10^n). Usado no
 * eixo dos paineis de ZOOM: como o maxY = niceMax(maximo da serie ate o dia
 * atual), o eixo "sobe em degraus" (200k -> 500k -> 1M) conforme a onda cresce
 * e trava no pico (o maximo para de crescer) — a "catraca" de PLAY_MODE_DESIGN.
 */
function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  // 1/1.5/2/3/5: degraus redondos e "apertados" — ex.: capacidade 12k -> 15k
  // (linha a 80%, nao 20k a 60%); pico 2,18M -> 3M (~73%).
  const step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Formata numeros em notacao humana para os rotulos de eixo. */
function fmt(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/**
 * Desenha UM painel com eixo Y FIXO (0..maxY) e rotulos numericos.
 * @param {HTMLCanvasElement} cv
 * @param {number} maxY            teto do eixo Y (fixo)
 * @param {Array<{data:number[],color:string,fill:boolean}>} series
 * @param {object} opts            { capacity?:number, maxX?:number }
 *                                 maxX = teto do eixo X em dias (default: HORIZON)
 * @param {HTMLElement} rootEl     raiz .game-app (para ler os tokens CSS)
 */
function drawChart(cv, maxY, series, opts, rootEl) {
  opts = opts || {};
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (w === 0 || h === 0) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const line = cvar(rootEl, '--line');
  const ink2 = cvar(rootEl, '--ink-2');
  const ink3 = cvar(rootEl, '--ink-3');
  const mono = cvar(rootEl, '--mono') || 'monospace';
  const pad = { l: 50, r: 12, t: 10, b: 20 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const maxX = opts.maxX || HORIZON;
  const X = (i) => pad.l + (maxX <= 1 ? 0 : (i / (maxX - 1)) * plotW);
  const Y = (v) => pad.t + plotH - (Math.min(v, maxY) / maxY) * plotH;

  // grade horizontal + rotulos do eixo Y
  ctx.font = '10px ' + mono; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for (let g = 0; g <= 4; g++) {
    const yy = pad.t + plotH - (g / 4) * plotH;
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
    ctx.fillStyle = ink3; ctx.fillText(fmt((g / 4) * maxY), pad.l - 7, yy);
  }
  // rotulos do eixo X (dias)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = ink3;
  for (let g = 0; g <= 4; g++) {
    ctx.fillText(String(Math.round((g / 4) * maxX)), pad.l + (g / 4) * plotW, pad.t + plotH + 5);
  }
  // linha de capacidade (movel; o eixo e que fica fixo)
  if (opts.capacity != null) {
    const cy = Y(opts.capacity);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = ink2; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(w - pad.r, cy); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '9px ' + mono;
    ctx.fillText(opts.capacityLabel || 'cap', pad.l + 4, cy - 2);
  }
  // series
  const plot = (arr, color, fill) => {
    if (!arr || arr.length < 1) return;
    ctx.beginPath();
    arr.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (fill) {
      ctx.lineTo(X(arr.length - 1), pad.t + plotH); ctx.lineTo(X(0), pad.t + plotH); ctx.closePath();
      ctx.fillStyle = color + '22'; ctx.fill(); ctx.beginPath();
      arr.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    const lx = X(arr.length - 1), ly = Y(arr[arr.length - 1]);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
  };
  for (const s of series) plot(s.data, s.color, s.fill);
}

/**
 * Piso do eixo dos paineis de zoom: comeca em 1k para nao "tremer" nos numeros
 * minusculos dos primeiros dias. O eixo so passa a subir quando a curva cruza 1k.
 */
const ZOOM_FLOOR = 1000;

/**
 * Catraca do eixo X dos paineis de zoom: sobe em degraus de 30 dias (meses),
 * com piso de 60. Sem isso o jogador no dia 74 via um quadro de 0 a 360 —
 * ~80% de espaco vazio — e a curva parecia colada na parede esquerda.
 * Mesma logica do eixo Y: funcao pura do dia atual, sem estado novo.
 */
function niceDays(day) {
  return Math.max(60, Math.ceil((day + 1) / 30) * 30);
}

/**
 * Desenha os QUATRO paineis do cockpit (grid 2x2):
 *   coluna esquerda = ESCALA FIXA (magnitude / comparacao — decisao da rodada 2)
 *   coluna direita  = ZOOM AUTOMATICO (catraca: eixo = niceMax(max ate o dia))
 *
 * @param {object} refs  { macro, zoom, infZoom, hospZoom, root }
 * @param {object} data  { series:{S,I,H,R,D}, population, initialCapacity, capacityNow, capacityLabel }
 */
export function drawGameCharts(refs, data) {
  const { macro, zoom, infZoom, hospZoom, root } = refs;
  const { series, population, initialCapacity, capacityNow, capacityLabel } = data;
  const cS = cvar(root, '--c-S'), cI = cvar(root, '--c-I'), cH = cvar(root, '--c-H'),
    cR = cvar(root, '--c-R'), cD = cvar(root, '--c-D');

  // --- ESQUERDA: escala fixa (inalterada) -----------------------------------
  // Macro — eixo Y fixo = ½N; S, R, D e a onda de I (preenchida)
  drawChart(macro, 0.5 * population, [
    { data: series.S, color: cS, fill: false },
    { data: series.R, color: cR, fill: false },
    { data: series.D, color: cD, fill: false },
    { data: series.I, color: cI, fill: true },
  ], {}, root);
  // Zoom clinico — eixo Y fixo = 2,5× capacidade INICIAL; H (preenchida), D e capacidade
  drawChart(zoom, 2.5 * initialCapacity, [
    { data: series.H, color: cH, fill: true },
    { data: series.D, color: cD, fill: false },
  ], { capacity: capacityNow, capacityLabel }, root);

  // --- DIREITA: zoom automatico (catraca em X e em Y) -----------------------
  const dayMax = niceDays(series.I.length - 1);
  // Infecciosos — eixo ajustado ao pico de I ate o dia atual.
  const infMax = niceMax(Math.max(ZOOM_FLOOR, ...series.I));
  drawChart(infZoom, infMax, [
    { data: series.I, color: cI, fill: true },
  ], { maxX: dayMax }, root);
  // Hospitalizados — piso do eixo = capacidade atual, para a LINHA DE CAPACIDADE
  // aparecer desde o dia 1 (ve-se H subindo ate ela). Se H estoura a capacidade,
  // o eixo sobe (catraca) e a linha desce no quadro — mostrando o quanto furou.
  const hospMax = niceMax(Math.max(capacityNow, ZOOM_FLOOR, ...series.H));
  drawChart(hospZoom, hospMax, [
    { data: series.H, color: cH, fill: true },
    { data: series.D, color: cD, fill: false },
  ], { capacity: capacityNow, capacityLabel, maxX: dayMax }, root);
}
