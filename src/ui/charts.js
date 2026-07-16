/**
 * ui/charts.js
 * -----------------------------------------------------------------------------
 * Renderizador de graficos de linha em <canvas>, SEM dependencias externas
 * (mantem o bundle autocontido e evita CDNs). Uma unica funcao publica desenha
 * multiplas series com eixos, grade, legenda e linhas de referencia (ex.: Rt=1
 * ou a capacidade hospitalar).
 */

const PALETTE = {
  S: '#2563eb', E: '#f59e0b', I: '#dc2626', H: '#7c3aed', R: '#16a34a', D: '#334155',
  A: '#2563eb', B: '#0891b2', C: '#dc2626',
  threshold: '#94a3b8',
};

function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function fmt(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  if (v < 1 && v > 0) return v.toFixed(2);
  return String(Math.round(v));
}

/**
 * Desenha um grafico de linha.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 *   opts.series     [{label, color, points:[{x,y}]}]
 *   opts.xMax       (opcional) maximo do eixo x
 *   opts.yMax       (opcional) maximo do eixo y
 *   opts.thresholds [{y, label, color}] linhas horizontais de referencia
 *   opts.xLabel, opts.yLabel, opts.title
 */
export function drawLineChart(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 54, r: 12, t: 28, b: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const series = opts.series.filter((s) => s.points && s.points.length);
  let xMax = opts.xMax ?? 0, yMax = opts.yMax ?? 0;
  for (const s of series) for (const p of s.points) {
    if (p.x > xMax) xMax = p.x;
    if (p.y > yMax) yMax = p.y;
  }
  for (const th of opts.thresholds || []) if (th.y > yMax) yMax = th.y;
  yMax = niceMax(yMax || 1);
  xMax = xMax || 1;

  const X = (x) => pad.l + (x / xMax) * plotW;
  const Y = (y) => pad.t + plotH - (y / yMax) * plotH;

  // Titulo
  if (opts.title) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(opts.title, pad.l, 16);
  }

  // Grade + rotulos Y
  ctx.strokeStyle = '#e2e8f0';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, sans-serif';
  ctx.lineWidth = 1;
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const yy = pad.t + (plotH * i) / ticks;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
    const val = yMax * (1 - i / ticks);
    ctx.fillText(fmt(val), 6, yy + 3);
  }
  // Rotulos X
  for (let i = 0; i <= 4; i++) {
    const xx = pad.l + (plotW * i) / 4;
    const val = (xMax * i) / 4;
    ctx.fillText(String(Math.round(val)), xx - 8, H - 12);
  }

  // Linhas de referencia
  for (const th of opts.thresholds || []) {
    ctx.strokeStyle = th.color || PALETTE.threshold;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, Y(th.y)); ctx.lineTo(W - pad.r, Y(th.y)); ctx.stroke();
    ctx.setLineDash([]);
    if (th.label) {
      ctx.fillStyle = th.color || PALETTE.threshold;
      ctx.fillText(th.label, W - pad.r - ctx.measureText(th.label).width - 2, Y(th.y) - 3);
    }
  }

  // Series
  ctx.lineWidth = 2;
  for (const s of series) {
    ctx.strokeStyle = s.color || '#334155';
    ctx.beginPath();
    s.points.forEach((p, idx) => {
      const px = X(p.x), py = Y(p.y);
      if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Legenda
  let lx = pad.l;
  const ly = H - 2;
  ctx.font = '11px system-ui, sans-serif';
  for (const s of series) {
    ctx.fillStyle = s.color || '#334155';
    ctx.fillRect(lx, ly - 9, 10, 3);
    ctx.fillStyle = '#334155';
    ctx.fillText(s.label, lx + 14, ly - 4);
    lx += 20 + ctx.measureText(s.label).width + 12;
  }
}

export { PALETTE };
