/**
 * state/store.js
 * -----------------------------------------------------------------------------
 * Store observavel minimalista (padrao publish/subscribe). Mantem TODO o estado
 * da aplicacao num unico lugar — a UI apenas le do store e reage a mudancas.
 * Isso desacopla os componentes entre si e facilita debug (um so ponto de
 * verdade). Sem dependencias externas; sem localStorage (restricao do ambiente).
 */

import { cloneCities } from '../data/cities.js';
import { clonePathogen } from '../data/pathogens.js';

function defaultConfig() {
  return {
    cities: cloneCities(),
    pathogen: clonePathogen('resp_moderate'),
    interventions: [],
    seed: { city: 0, infections: 20 },
    horizonDays: 240,
  };
}

const state = {
  mode: 'sandbox',        // 'sandbox' | 'scenarios'
  scenarioId: null,
  config: defaultConfig(),
  result: null,           // ultimo resultado de simulacao
  evaluation: null,       // avaliacao do cenario (se houver)
};

const listeners = new Set();

/** Retorna o estado atual (nao mutar diretamente; use as acoes). */
export function getState() {
  return state;
}

/** Assina mudancas de estado. Retorna unsubscribe. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

/* ------------------------------- acoes ---------------------------------- */

export function setMode(mode) {
  state.mode = mode;
  emit();
}

export function setConfig(patch) {
  state.config = { ...state.config, ...patch };
  emit();
}

export function updateCityParam(cityId, key, value) {
  const city = state.config.cities.find((c) => c.id === cityId);
  if (city) city[key] = value;
  emit();
}

export function updatePathogenParam(key, value) {
  state.config.pathogen = { ...state.config.pathogen, [key]: value };
  emit();
}

export function setPathogen(preset) {
  state.config.pathogen = clonePathogen(preset);
  emit();
}

export function setInterventions(list) {
  state.config.interventions = list;
  emit();
}

export function loadScenarioConfig(scenario) {
  state.mode = 'scenarios';
  state.scenarioId = scenario.id;
  state.config = scenario.buildConfig();
  state.result = null;
  state.evaluation = null;
  emit();
}

export function setResult(result, evaluation = null) {
  state.result = result;
  state.evaluation = evaluation;
  emit();
}

export function reset() {
  state.config = defaultConfig();
  state.result = null;
  state.evaluation = null;
  state.scenarioId = null;
  emit();
}
