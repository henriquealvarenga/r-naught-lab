/**
 * game/store.js
 * -----------------------------------------------------------------------------
 * Estado + logica do Modo Jogo. Implementa a MIGRACAO documentada em
 * docs/PLAY_MODE_DESIGN.md §7 — a **Opcao A**: o motor (batch) roda a partida
 * inteira de uma vez; o jogo guarda apenas `config` + um `dayIndex` e:
 *
 *   avancar/ler dia D  -> le result.perCity[0].series[D]  (ja calculado)
 *   comprar no dia D    -> append {type,value,startDay:D} + re-simular
 *   voltar (rewind) p/ D-> dayIndex = D e DESCARTA intervencoes com startDay > D
 *                          (orcamento devolvido). De graca — sem pilha de snapshots.
 *
 * O motor continua PURO (src/engine/*). Todo o estado do jogo (dia, orcamento,
 * historico de compras, noticias) vive AQUI, na camada de UI/store — nunca no
 * engine. As noticias (SNN) sao derivadas de forma determinIStica da serie:
 * `computeTimeline()` re-toca as regras sobre series[0..dayIndex], entao o rewind
 * so precisa mudar o indice e recomputar — coerente por construcao.
 */

import { runSimulation } from '../engine/simulation.js';
import { clonePathogen } from '../data/pathogens.js';
import { cityById } from '../data/cities.js';
import { DECK, cardById, START_BUDGET } from '../data/deck.js';
import { NEWS_RULES } from '../data/news.js';
import { t, tf } from '../i18n/index.js';

/** Horizonte maximo da partida (dias). O fim automatico costuma chegar antes. */
export const HORIZON = 360;
/** Fim automatico: encerra quando os ativos (E+I+H) caem a < 0,4% do pico. */
export const END_FRAC = 0.004;
/** Semente de infecciosos no dia 0: o paciente zero. */
const SEED_INFECTIONS = 1;

const state = {
  cityId: null,
  presetId: 'resp_moderate',
  pathogen: clonePathogen('resp_moderate'),
  dayIndex: 0,
  budget: START_BUDGET,
  interventions: [],   // [{ cardId, type, value, cost, startDay, cities:'all' }]
  // derivados (recomputados por sync/refresh):
  result: null,
  feed: [],            // [{ id, tier, e, day, cat, head, detail }]
  peaks: { peakI: 0, peakOcc: 0, activePeak: 0, collapseDays: 0, rtCross: null },
  _resultSig: null,
};

/* --------------------------------- config -------------------------------- */

function currentConfig() {
  const city = cityById(state.cityId);
  return {
    cities: [{ ...city, name: t(city.labelKey) }],
    pathogen: { ...state.pathogen },
    interventions: state.interventions.map((iv) => ({
      type: iv.type, value: iv.value, startDay: iv.startDay, cities: 'all',
    })),
    seed: { city: 0, infections: SEED_INFECTIONS },
    horizonDays: HORIZON,
  };
}

function resultSig() {
  return state.interventions.map((iv) => `${iv.type}:${iv.value}:${iv.startDay}`).join('|');
}

/** Re-simula (se as intervencoes mudaram) e recomputa a timeline de noticias. */
function sync() {
  const sig = resultSig();
  if (sig !== state._resultSig || !state.result) {
    state.result = runSimulation(currentConfig());
    state._resultSig = sig;
  }
  computeTimeline();
}

/** So recomputa a timeline/derivados (ex.: troca de idioma). */
export function refresh() {
  if (state.result) computeTimeline();
}

/* ------------------------- noticias (SNN) — puras ------------------------ */

/**
 * Re-toca as regras de noticias sobre series[0..dayIndex]. Cada regra dispara
 * UMA vez, no primeiro dia em que seu gatilho fica verdadeiro. Determinista:
 * o mesmo dayIndex sempre produz o mesmo feed — por isso o rewind e trivial.
 */
function computeTimeline() {
  const series = state.result.perCity[0].series;
  const upto = state.dayIndex;
  const city = cityById(state.cityId);
  const cityName = t(city.labelKey);
  const routeLabel = t('route.' + state.pathogen.route);
  const r0 = state.pathogen.R0;

  const seen = new Set();
  const feed = [];
  let peakI = 0, peakOcc = 0, activePeak = 0, collapseDays = 0, rtCross = null;

  for (let day = 0; day <= upto; day++) {
    const p = series[day];
    const occ = p.hospOccupancy;
    if (p.I > peakI) peakI = p.I;
    if (occ > peakOcc) peakOcc = occ;
    const act = p.E + p.I + p.H;
    if (act > activePeak) activePeak = act;
    if (occ >= 1) collapseDays++;
    if (rtCross === null && p.Rt < 1 && day > 5) rtCross = day;

    const active = new Set(
      state.interventions.filter((iv) => iv.startDay <= day).map((iv) => iv.type),
    );
    const c = {
      day, S: p.S, E: p.E, I: p.I, H: p.H, R: p.R, D: p.D, N: p.N,
      occ, rt: p.Rt, deaths: p.D, casos: p.E + p.I + p.H + p.R + p.D,
      peakI, peakOcc, active, cityName, r0, routeLabel,
    };
    for (const rule of NEWS_RULES) {
      if (seen.has(rule.id)) continue;
      let hit = false;
      try { hit = rule.when(c); } catch (_) { hit = false; }
      if (!hit) continue;
      seen.add(rule.id);
      const params = rule.params ? rule.params(c) : null;
      feed.push({
        id: rule.id, tier: rule.tier, e: rule.e, day,
        cat: t(rule.cat),
        head: tf(rule.headKey, params),
        detail: rule.detailKey ? tf(rule.detailKey, params) : '',
      });
    }
  }
  state.feed = feed;
  state.peaks = { peakI, peakOcc, activePeak, collapseDays, rtCross };
}

/* -------------------------------- acoes ---------------------------------- */

/** Tela 1: escolher cidade. */
export function selectCity(cityId) { state.cityId = cityId; }

/** Tela 2: aplicar um preset de patogeno. */
export function selectPreset(presetId) {
  state.presetId = presetId;
  state.pathogen = clonePathogen(presetId);
}

/** Tela 2: ajustar um parametro do patogeno (mantendo hospRate >= ifr). */
export function updatePathogen(key, value) {
  state.pathogen = { ...state.pathogen, [key]: value };
  // Invariante do projeto: a letalidade nao pode exceder a hospitalizacao.
  if (key === 'ifr' && value > state.pathogen.hospRate) state.pathogen.hospRate = value;
  if (key === 'hospRate' && value < state.pathogen.ifr) state.pathogen.ifr = value;
  state.presetId = 'custom';
}

export function setRoute(route) {
  state.pathogen = { ...state.pathogen, route };
  state.presetId = 'custom';
}

/** Tela 3: (re)iniciar a partida com a cidade e o patogeno escolhidos. */
export function initOutbreak() {
  state.dayIndex = 0;   // abre no dia 0: semente limpa (20 infecciosos, 0 recuperados)
  state.budget = START_BUDGET;
  state.interventions = [];
  state.result = null;
  state._resultSig = null;
  sync();
}

/** Avanca um dia. Retorna { over, newPlantoes }. */
export function advanceDay() {
  if (state.dayIndex >= HORIZON) return { over: true, newPlantoes: [] };
  state.dayIndex++;
  sync();
  const newPlantoes = state.feed.filter((f) => f.tier === 'plantao' && f.day === state.dayIndex);
  return { over: isOver(), newPlantoes };
}

/** Compra uma carta do baralho (append + re-simulacao). Retorna sucesso. */
export function buyCard(cardId) {
  const card = cardById(cardId);
  if (!card) return false;
  if (state.interventions.some((iv) => iv.cardId === cardId)) return false;
  if (state.budget < card.cost) return false;
  state.budget -= card.cost;
  state.interventions.push({
    cardId, type: card.type, value: card.value, cost: card.cost,
    startDay: state.dayIndex, cities: 'all',
  });
  sync();
  return true;
}

/** Volta `days` dias: trunca intervencoes com startDay > alvo (orcamento devolvido). */
export function rewind(days) {
  const target = Math.max(0, state.dayIndex - days);
  const kept = [];
  for (const iv of state.interventions) {
    if (iv.startDay > target) state.budget += iv.cost;
    else kept.push(iv);
  }
  state.interventions = kept;
  state.dayIndex = target;
  sync();
}

/* ------------------------------- getters --------------------------------- */

export function getState() { return state; }

/** Dados do dia atual (compartimentos, Rt, ocupacao, capacidade vigente). */
export function dayData() { return state.result.perCity[0].series[state.dayIndex]; }

/** Series (arrays) do inicio ate o dia atual, para os graficos. */
export function seriesUpTo() {
  const s = state.result.perCity[0].series.slice(0, state.dayIndex + 1);
  return {
    S: s.map((p) => p.S), I: s.map((p) => p.I), H: s.map((p) => p.H),
    R: s.map((p) => p.R), D: s.map((p) => p.D),
  };
}

/** Set de cardIds atualmente comprados (para o baralho). */
export function activeCardIds() {
  return new Set(state.interventions.map((iv) => iv.cardId));
}

/** Ultima manchete do feed (mostrada na TV), ou null. */
export function latestHeadline() {
  return state.feed.length ? state.feed[state.feed.length - 1] : null;
}

export function canRewind() { return state.dayIndex > 1; }

export function population() { return cityById(state.cityId).population; }
export function initialCapacity() { return cityById(state.cityId).hospitalCapacity; }

/** Cartas disponiveis (para desabilitar as sem orcamento). */
export function affordable(cardId) {
  const card = cardById(cardId);
  return card ? state.budget >= card.cost : false;
}

export { DECK };

/* ------------------------------- fim de jogo ----------------------------- */

function isOver() {
  const p = dayData();
  const active = p.E + p.I + p.H;
  const { activePeak } = state.peaks;
  return state.dayIndex >= HORIZON
    || (active < 1 && state.dayIndex > 10)
    || (state.dayIndex > 20 && activePeak > 500 && active < END_FRAC * activePeak);
}

export { isOver };
