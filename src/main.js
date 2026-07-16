/**
 * main.js — ponto de entrada da aplicacao.
 * -----------------------------------------------------------------------------
 * Orquestra store + UI + motor. Responsabilidades:
 *   - montar a estrutura de paineis
 *   - reagir a mudancas do store re-renderizando controles
 *   - rodar a simulacao e desenhar os graficos
 *   - alternar entre Modo Livre e Cenarios e trocar idioma
 * Mantido fino: a logica pesada vive nos modulos de engine/ui/data.
 */

import { runSimulation } from './engine/simulation.js';
import { t, setLanguage, getLanguage, onLanguageChange } from './i18n/index.js';
import {
  getState, subscribe, setMode, reset, setResult, loadScenarioConfig,
} from './state/store.js';
import { SCENARIOS, scenarioById } from './data/scenarios.js';
import { renderPathogenControls, renderCityControls } from './ui/controls.js';
import { renderInterventions } from './ui/interventions-ui.js';
import { drawLineChart, PALETTE } from './ui/charts.js';
import { renderKPIs, renderMap, renderExplanation } from './ui/panels.js';

const el = (id) => document.getElementById(id);

/* ----------------------------- render principal ------------------------- */

function renderControls() {
  const st = getState();
  renderPathogenControls(el('pathogen-controls'), st.config);
  renderCityControls(el('city-controls'), st.config);
  const scenario = st.scenarioId ? scenarioById(st.scenarioId) : null;
  renderInterventions(el('intervention-controls'), scenario ? scenario.allowedInterventions : null);
}

function seriesFromAggregate(agg, keys) {
  return keys.map((k) => ({
    label: t('chart.legend.' + k),
    color: PALETTE[k],
    points: agg.map((d) => ({ x: d.day, y: d[k] })),
  }));
}

function renderCharts(result) {
  // 1) Curva epidemica agregada
  drawLineChart(el('chart-epidemic'), {
    title: t('chart.epidemicCurve'),
    series: seriesFromAggregate(result.aggregate, ['S', 'I', 'R', 'D']),
    xLabel: t('chart.axis.days'),
  });

  // 2) Rt por cidade, com linha de referencia Rt = 1
  drawLineChart(el('chart-rt'), {
    title: t('chart.rt'),
    series: result.perCity.map((c) => ({
      label: t(c.id === 'A' ? 'city.A.name' : c.id === 'B' ? 'city.B.name' : 'city.C.name'),
      color: PALETTE[c.id],
      points: c.series.map((p) => ({ x: p.day, y: p.Rt })),
    })),
    thresholds: [{ y: 1, label: 'Rt = 1', color: '#dc2626' }],
    yMax: Math.max(3, result.perCity[0].series[0].Rt + 0.5),
  });

  // 3) Ocupacao hospitalar (%) por cidade, referencia em 100%
  drawLineChart(el('chart-hospital'), {
    title: t('chart.hospital'),
    series: result.perCity.map((c) => ({
      label: t(c.id === 'A' ? 'city.A.name' : c.id === 'B' ? 'city.B.name' : 'city.C.name'),
      color: PALETTE[c.id],
      points: c.series.map((p) => ({ x: p.day, y: p.hospOccupancy * 100 })),
    })),
    thresholds: [{ y: 100, label: '100%', color: '#dc2626' }],
  });
}

function runAndRender() {
  const st = getState();
  const result = runSimulation(st.config);
  let evaluation = null;
  if (st.scenarioId) {
    const sc = scenarioById(st.scenarioId);
    evaluation = sc ? sc.evaluate(result) : null;
  }
  setResult(result, evaluation);

  renderCharts(result);
  renderKPIs(el('kpis'), result);
  renderMap(el('map'), result);
  renderExplanation(el('explanation'), result, st.config);

  const banner = el('scenario-result');
  if (evaluation) {
    banner.style.display = 'block';
    banner.className = 'scenario-result ' + (evaluation.passed ? 'ok' : 'no');
    banner.textContent = (evaluation.passed ? t('scenario.success') : t('scenario.fail'));
  } else {
    banner.style.display = 'none';
  }
}

/* ------------------------------- cenarios ------------------------------- */

function renderScenarioList() {
  const box = el('scenario-list');
  box.innerHTML = '';
  for (const sc of SCENARIOS) {
    const card = document.createElement('button');
    card.className = 'scenario-card';
    card.innerHTML = `<strong>${t(sc.titleKey)}</strong><span>${t(sc.objectiveKey)}</span>`;
    card.addEventListener('click', () => {
      loadScenarioConfig(sc);
      runAndRender();
    });
    box.append(card);
  }
}

/* ------------------------------- i18n / chrome -------------------------- */

function applyStaticLabels() {
  el('app-title').textContent = t('app.title');
  el('app-subtitle').textContent = t('app.subtitle');
  el('btn-run').textContent = t('app.run');
  el('btn-reset').textContent = t('app.reset');
  el('tab-sandbox').textContent = t('app.mode.sandbox');
  el('tab-scenarios').textContent = t('app.mode.scenarios');
  el('disclaimer').textContent = t('disclaimer');
  el('h-pathogen').textContent = '🦠 ' + t('section.pathogen');
  el('h-cities').textContent = '🏙️ ' + t('section.cities');
  el('h-interventions').textContent = '🛡️ ' + t('section.interventions');
}

function fullRerender() {
  applyStaticLabels();
  renderControls();
  renderScenarioList();
  const st = getState();
  el('sandbox-panel').style.display = st.mode === 'sandbox' ? 'block' : 'none';
  el('scenarios-panel').style.display = st.mode === 'scenarios' ? 'block' : 'none';
  if (st.result) renderCharts(st.result);
}

/* --------------------------------- init --------------------------------- */

function init() {
  el('btn-run').addEventListener('click', runAndRender);
  el('btn-reset').addEventListener('click', () => { reset(); runAndRender(); });
  el('tab-sandbox').addEventListener('click', () => setMode('sandbox'));
  el('tab-scenarios').addEventListener('click', () => setMode('scenarios'));
  el('lang-pt').addEventListener('click', () => setLanguage('pt'));
  el('lang-en').addEventListener('click', () => setLanguage('en'));

  subscribe(() => {
    // re-render leve dos controles (mantem sliders sincronizados com o store)
    const st = getState();
    el('sandbox-panel').style.display = st.mode === 'sandbox' ? 'block' : 'none';
    el('scenarios-panel').style.display = st.mode === 'scenarios' ? 'block' : 'none';
  });
  onLanguageChange(fullRerender);

  fullRerender();
  runAndRender(); // roda uma vez para nao abrir vazio
}

document.addEventListener('DOMContentLoaded', init);
