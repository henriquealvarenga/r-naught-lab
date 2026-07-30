/**
 * analysis/index.js — Modo Analise (o antigo painel-dashboard).
 * -----------------------------------------------------------------------------
 * Orquestra store + UI + motor para o modo de exploracao livre / cenarios. E o
 * app original (antes em src/main.js); agora e um dos dois modos, montado pelo
 * roteador em src/main.js. Idioma e a barra de topo sao responsabilidade do
 * roteador; aqui expomos initAnalysis() e rerenderAnalysis().
 * Mantido fino: a logica pesada vive nos modulos de engine/ui/data.
 */

import { runSimulation } from '../engine/simulation.js';
import { summarizeEpidemic } from '../engine/metrics.js';
import { t } from '../i18n/index.js';
import {
  getState, subscribe, setMode, reset, setResult, loadScenarioConfig,
} from '../state/store.js';
import { SCENARIOS, scenarioById } from '../data/scenarios.js';
import { renderPathogenControls, renderCityControls } from '../ui/controls.js';
import { renderInterventions } from '../ui/interventions-ui.js';
import { drawLineChart, PALETTE } from '../ui/charts.js';
import { renderKPIs, renderExplanation } from '../ui/panels.js';

const el = (id) => document.getElementById(id);

const cityNameKey = (id) => (id === 'A' ? 'city.A.name' : id === 'B' ? 'city.B.name' : 'city.C.name');

/** Cidade em foco (a marcada no seletor lateral); cai na 1a se algo sair do lugar. */
function focusedCity(result) {
  const id = getState().selectedCityId;
  return result.perCity.find((c) => c.id === id) || result.perCity[0];
}

/* ----------------------------- render principal ------------------------- */

function renderControls() {
  const st = getState();
  renderPathogenControls(el('pathogen-controls'), st.config);
  renderCityControls(el('city-controls'), st.config);
  const scenario = st.scenarioId ? scenarioById(st.scenarioId) : null;
  renderInterventions(el('intervention-controls'), scenario ? scenario.allowedInterventions : null);
}

function renderCharts(result) {
  // Todos os graficos mostram a MESMA cidade em foco (a marcada no seletor),
  // na cor daquela cidade — menos informacao de uma vez para o aluno. A
  // simulacao segue metapopulacional; a curva ja embute o acoplamento.
  const city = focusedCity(result);
  const label = t(cityNameKey(city.id));
  const color = PALETTE[city.id];
  const suffix = ' — ' + label;

  // 1) Curva epidemica (S/I/R/D) da cidade em foco
  drawLineChart(el('chart-epidemic'), {
    title: t('chart.epidemicCurve') + suffix,
    series: ['S', 'I', 'R', 'D'].map((k) => ({
      label: t('chart.legend.' + k),
      color: PALETTE[k],
      points: city.series.map((p) => ({ x: p.day, y: p[k] })),
    })),
    xLabel: t('chart.axis.days'),
  });

  // 2) Rt da cidade em foco, com linha de referencia Rt = 1
  drawLineChart(el('chart-rt'), {
    title: t('chart.rt') + suffix,
    series: [{ label, color, points: city.series.map((p) => ({ x: p.day, y: p.Rt })) }],
    thresholds: [{ y: 1, label: 'Rt = 1', color: '#dc2626' }],
    yMax: Math.max(3, city.series[0].Rt + 0.5),
  });

  // 3) Ocupacao hospitalar (%) da cidade em foco, referencia em 100%
  drawLineChart(el('chart-hospital'), {
    title: t('chart.hospital') + suffix,
    series: [{ label, color, points: city.series.map((p) => ({ x: p.day, y: p.hospOccupancy * 100 })) }],
    thresholds: [{ y: 100, label: '100%', color: '#dc2626' }],
  });

  // 4) Novos casos por dia (incidencia) da cidade em foco = queda diaria de S
  drawLineChart(el('chart-incidence'), {
    title: t('chart.incidence') + suffix,
    series: [{
      label,
      color,
      points: city.series.map((p, i) => ({
        x: p.day,
        y: i === 0 ? 0 : Math.max(0, city.series[i - 1].S - p.S),
      })),
    }],
    xLabel: t('chart.axis.days'),
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
  const city = focusedCity(result);
  renderKPIs(el('kpis'), { summary: summarizeEpidemic(city.series), meta: result.meta });
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
  el('app-subtitle').textContent = t('app.subtitle');
  el('btn-reset').textContent = t('app.reset');
  el('tab-sandbox').textContent = t('app.mode.sandbox');
  el('tab-scenarios').textContent = t('app.mode.scenarios');
  el('disclaimer').textContent = t('disclaimer');
  el('h-pathogen').textContent = '🦠 ' + t('section.pathogen');
  el('h-cities').textContent = '🏙️ ' + t('section.cities');
  el('h-interventions').textContent = '🛡️ ' + t('section.interventions');
}

/** Re-render completo (usado pelo roteador ao trocar de idioma). */
export function rerenderAnalysis() {
  applyStaticLabels();
  renderControls();
  renderScenarioList();
  const st = getState();
  el('sandbox-panel').style.display = st.mode === 'sandbox' ? 'block' : 'none';
  el('scenarios-panel').style.display = st.mode === 'scenarios' ? 'block' : 'none';
  if (st.result) renderCharts(st.result);
}

/* --------------------------------- init --------------------------------- */

export function initAnalysis() {
  el('btn-reset').addEventListener('click', () => { reset(); rerenderAnalysis(); runAndRender(); });
  el('tab-sandbox').addEventListener('click', () => setMode('sandbox'));
  el('tab-scenarios').addEventListener('click', () => setMode('scenarios'));

  // Simulacao AO VIVO: qualquer ajuste nos controles (slider, seletor de preset,
  // via, cidade) re-roda e redesenha na hora. Coalescido por frame para o arraste
  // do slider nao disparar dezenas de re-simulacoes. Dispensa o botao "Simular".
  let rafPending = false;
  const liveRun = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; runAndRender(); });
  };
  const root = el('analysis-root');
  root.addEventListener('input', liveRun);
  root.addEventListener('change', liveRun);

  subscribe(() => {
    // re-render leve dos controles (mantem sliders sincronizados com o store)
    const st = getState();
    el('tab-sandbox').classList.toggle('active', st.mode === 'sandbox');
    el('tab-scenarios').classList.toggle('active', st.mode === 'scenarios');
    el('sandbox-panel').style.display = st.mode === 'sandbox' ? 'block' : 'none';
    el('scenarios-panel').style.display = st.mode === 'scenarios' ? 'block' : 'none';
  });

  rerenderAnalysis();
  runAndRender(); // roda uma vez para nao abrir vazio
}
