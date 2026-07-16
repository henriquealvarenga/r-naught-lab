/**
 * ui/panels.js
 * -----------------------------------------------------------------------------
 * Paineis de saida: cartoes de KPI, mapa esquematico das cidades e o painel
 * "por que isso aconteceu" (interpretacao textual dinamica do resultado).
 */

import { t } from '../i18n/index.js';
import { PALETTE } from './charts.js';

function kpi(label, value) {
  const el = document.createElement('div');
  el.className = 'kpi';
  el.innerHTML = `<div class="kpi-val">${value}</div><div class="kpi-label">${label}</div>`;
  return el;
}

function fmtNum(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return String(Math.round(v));
}

/** Cartoes de indicadores-chave. */
export function renderKPIs(container, result) {
  container.innerHTML = '';
  const s = result.summary;
  container.append(
    kpi(t('metric.peakInfectious'), fmtNum(s.peakInfectious)),
    kpi(t('metric.peakDay'), 'D' + s.peakInfectiousDay),
    kpi(t('metric.totalDeaths'), fmtNum(s.totalDeaths)),
    kpi(t('metric.herdThreshold'), (result.meta.herdThreshold * 100).toFixed(0) + '%'),
  );
}

/** Mapa esquematico: nos = cidades, tamanho ~ populacao, cor ~ pico de I. */
export function renderMap(canvas, result) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const n = result.perCity.length;
  const nodes = result.perCity.map((city, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cx = W / 2 + Math.cos(angle) * Math.min(W, H) * 0.28;
    const cy = H / 2 + Math.sin(angle) * Math.min(W, H) * 0.28;
    let peakI = 0, pop = 0;
    for (const p of city.series) if (p.I > peakI) peakI = p.I;
    pop = city.series[0].N;
    return { cx, cy, r: 14 + Math.sqrt(pop) / 260, peakFrac: pop ? peakI / pop : 0, id: city.id };
  });

  // Arestas (mobilidade) — desenha todas com espessura leve
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    ctx.beginPath(); ctx.moveTo(nodes[i].cx, nodes[i].cy); ctx.lineTo(nodes[j].cx, nodes[j].cy); ctx.stroke();
  }

  // Nos
  for (const nd of nodes) {
    const intensity = Math.min(1, nd.peakFrac * 6);
    const r = Math.round(220 * intensity + 30);
    ctx.fillStyle = `rgb(${r}, ${Math.round(80 - 60 * intensity)}, ${Math.round(90 - 70 * intensity)})`;
    ctx.beginPath(); ctx.arc(nd.cx, nd.cy, nd.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nd.id, nd.cx, nd.cy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

/**
 * Painel interpretativo: gera 2-4 frases explicando o resultado com base nas
 * metricas — o "momento eureca" verbalizado.
 */
export function renderExplanation(container, result, config) {
  const lines = [];
  const R0 = config.pathogen.R0;
  const herd = (result.meta.herdThreshold * 100).toFixed(0);
  lines.push(`R0 = ${R0.toFixed(1)} → limiar de imunidade de rebanho ≈ ${herd}% (1 − 1/R0).`);

  // Cidade com maior pico de ocupacao
  let worst = null, worstOcc = 0;
  for (const city of result.perCity) {
    for (const p of city.series) if (p.hospOccupancy > worstOcc) { worstOcc = p.hospOccupancy; worst = city; }
  }
  if (worst) {
    const pct = (worstOcc * 100).toFixed(0);
    if (worstOcc >= 1) {
      lines.push(`A ${t(worst.id === 'A' ? 'city.A.name' : worst.id === 'B' ? 'city.B.name' : 'city.C.name')} ultrapassou a capacidade hospitalar (pico ${pct}%): mortes por colapso.`);
    } else {
      lines.push(`Pico de ocupacao hospitalar ficou em ${pct}% da capacidade — sistema nao colapsou.`);
    }
  }

  // Rota de transmissao x saneamento
  if (config.pathogen.route === 'fecal_oral') {
    lines.push('Rota fecal-oral: o saneamento pesa muito. Cidades com baixa cobertura sofrem taxas de ataque bem maiores.');
  } else if (config.pathogen.route === 'respiratory') {
    lines.push('Rota respiratoria: saneamento quase nao afeta; o que importa e contato e mobilidade.');
  }

  container.innerHTML = '';
  const h = document.createElement('h4');
  h.textContent = '🔍 Por que isso aconteceu';
  container.append(h);
  for (const l of lines) {
    const p = document.createElement('p');
    p.textContent = l;
    container.append(p);
  }
}
