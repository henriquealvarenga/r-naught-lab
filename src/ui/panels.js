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
