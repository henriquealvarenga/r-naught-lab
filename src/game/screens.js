/**
 * game/screens.js
 * -----------------------------------------------------------------------------
 * UI do Modo Jogo: fluxo em 3 telas (Territorio -> Patogeno -> Surto) + cockpit
 * (KPIs, Rt, hospital, TV de noticias SNN, baralho de intervencoes) + relatorio
 * de FIM com quiz. Porta o protótipo (docs/prototypes/game-mockup.html) para o
 * app real: o MODELO e as NOTICIAS vivem no store (src/game/store.js, Opcao A),
 * as strings passam por t()/tf(), e os ids sao prefixados `g-` para conviver com
 * o Modo Analise no mesmo documento.
 *
 * Camadas respeitadas: o motor (src/engine/*) continua puro; dia/orcamento/
 * historico/plantao vivem aqui (UI) e no store — nunca no engine.
 */

import * as game from './store.js';
import { CITIES } from '../data/cities.js';
import { PATHOGENS } from '../data/pathogens.js';
import { TRANSMISSION_ROUTES } from '../config/constants.js';
import { DECK, START_BUDGET } from '../data/deck.js';
import { QUIZZES } from '../data/quiz.js';
import { REAL_DISEASES, R0_MAX_DISEASE } from '../data/real-diseases.js';
import { t, tf, setLanguage, getLanguage } from '../i18n/index.js';
import { drawGameCharts } from './charts.js';
import * as sfx from './sfx.js';

const TICK_MS = 1800;   // ms por dia no 1x (base lenta; dividida pela velocidade)
const $ = (id) => document.getElementById(id);

let rootEl = null;
let screen = 0;
let playing = false;
let speed = 1;
let timer = null;
// fluxo de plantao / feed (UI)
let plantaoQueue = [];
let plantaoActive = false;
let resumePlay = false;
let feedResume = false;

/* ------------------------------ formatacao ------------------------------- */

function fmt(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}
function pct(x) { return Math.round(x * 100) + '%'; }

/**
 * Percentual com precisao adaptativa, para os KPIs do cockpit.
 * Com uma cidade de 12M, obitos e hospitalizados passam quase a partida toda
 * abaixo de 0,05% — com casas fixas TODOS liam "0.0%" e o painel nao informava
 * nada. Aqui a casa decimal acompanha a ordem de grandeza.
 */
function pctAuto(frac) {
  const p = frac * 100;
  if (p === 0) return '0%';
  if (p >= 10) return p.toFixed(0) + '%';
  if (p >= 1) return p.toFixed(1) + '%';
  if (p >= 0.01) return p.toFixed(2) + '%';
  return '<0,01%';
}

/* ------------------------------- shell HTML ------------------------------ */

/**
 * Capa (Tela 0) — splash escuro em tela cheia, mostrado ao abrir o Modo Jogo.
 * Fica ACIMA da barra de topo (position:fixed, z-index alto) de proposito: o
 * cabecalho claro cortando um hero escuro parecia acidente. Por isso a capa
 * traz o proprio seletor de idioma. Some ao entrar e nao volta na sessao.
 */
function coverHTML() {
  return `
  <section class="cover" id="g-cover">
    <div class="cover-lang">
      <button id="g-cover-pt">PT</button><button id="g-cover-en">EN</button>
    </div>
    <div class="cover-inner">
      <div class="cover-badge" id="g-cover-badge"></div>
      <h1 class="cover-title" id="g-cover-title"></h1>
      <div class="cover-sub" id="g-cover-sub"></div>
      <div class="cover-kicker"><span id="g-cover-kicker"></span></div>
      <p class="cover-lede" id="g-cover-lede"></p>
      <p class="cover-author" id="g-cover-author"></p>
      <div class="cover-cta">
        <button class="cbtn cbtn-primary" id="g-cover-start"></button>
        <button class="cbtn cbtn-ghost" id="g-cover-help"></button>
      </div>
      <div class="cover-cards" id="g-cover-cards"></div>
      <p class="cover-foot" id="g-cover-foot"></p>
    </div>

    <div class="cover-modal" id="g-cover-howto">
      <div class="cm-card">
        <h3 id="g-howto-title"></h3>
        <ol class="cm-steps" id="g-howto-steps"></ol>
        <p class="cm-note" id="g-howto-note"></p>
        <button class="cbtn cbtn-primary" id="g-howto-close"></button>
      </div>
    </div>
  </section>`;
}

function shellHTML() {
  return coverHTML() + `
  <div class="wrap">
    <div class="flow" id="g-flow">
      <div class="step active" data-s="0"><span class="num">1</span><span id="g-flow-0"></span></div>
      <div class="bar"></div>
      <div class="step" data-s="1"><span class="num">2</span><span id="g-flow-1"></span></div>
      <div class="bar"></div>
      <div class="step" data-s="2"><span class="num">3</span><span id="g-flow-2"></span></div>
    </div>

    <section class="screen active" id="g-screen-city">
      <div class="screen-head"><h2 id="g-s1-title"></h2><p id="g-s1-sub"></p></div>
      <div class="cities" id="g-city-cards"></div>
      <div class="actions">
        <button class="btn btn-ghost" id="g-to-cover"></button>
        <button class="btn btn-primary" id="g-to-virus" disabled></button>
      </div>
    </section>

    <section class="screen" id="g-screen-virus">
      <div class="screen-head"><h2 id="g-s2-title"></h2></div>
      <div class="presets" id="g-presets"></div>
      <div class="virus-grid">
        <div class="panel sliders" id="g-sliders"></div>
        <div class="panel derived">
          <h4 id="g-derived-title"></h4>
          <div class="drow"><span id="g-dl-herd"></span><b id="g-d-herd">—</b></div>
          <div class="drow"><span id="g-dl-double"></span><b id="g-d-double">—</b></div>
          <div class="drow"><span id="g-dl-route"></span><b id="g-d-route">—</b></div>
          <div class="drow"><span id="g-dl-san"></span><b id="g-d-san">—</b></div>
          <div class="drow"><span id="g-dl-profile"></span><b id="g-d-profile">—</b></div>

          <div class="realdis">
            <h5 id="g-real-title"></h5>
            <div id="g-real-list" class="realdis-list"></div>
            <p class="realdis-note" id="g-real-note"></p>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" id="g-back-city"></button>
        <button class="btn btn-primary" id="g-to-game"></button>
      </div>
    </section>

    <section class="screen" id="g-screen-game">
      <div class="panel game-top">
        <div class="clock"><span class="lbl" id="g-day-label"></span><span class="day" id="g-day">0</span></div>
        <div class="transport">
          <div class="rew">
            <button class="rew-btn" id="g-back10"><span class="rw">⏪</span>10</button>
            <button class="rew-btn" id="g-back1"><span class="rw">⏪</span>1</button>
          </div>
          <button class="play-btn" id="g-play">▶</button>
          <div class="speeds" id="g-speeds">
            <button data-sp="0.5" aria-pressed="false">0.5×</button>
            <button data-sp="1" aria-pressed="true">1×</button>
            <button data-sp="2" aria-pressed="false">2×</button>
            <button data-sp="4" aria-pressed="false">4×</button>
          </div>
          <button class="icbtn icbtn-text" id="g-restart">↺</button>
          <button class="icbtn" id="g-sound">🔊</button>
        </div>
        <div class="budget">
          <div class="brow"><span id="g-budget-label"></span><b><span id="g-budget-v">100</span> <span id="g-budget-pts"></span></b></div>
          <div class="meter"><i id="g-budget-bar" style="width:100%"></i></div>
        </div>
      </div>

      <div class="g-kpis" id="g-kpis"></div>

      <div class="game-main">
        <div class="side side-info">
          <div class="panel rt-card">
            <div class="rl" id="g-rt-label"></div>
            <div class="rv" id="g-rt-v">—</div>
            <span class="rtag" id="g-rt-tag">—</span>
          </div>
          <div class="panel hosp-card">
            <div class="hl"><span id="g-hosp-label"></span><b id="g-hosp-pct">0%</b></div>
            <div class="hbar" id="g-hbar"><i id="g-hbar-i" style="width:0%"></i><span class="capline" style="left:100%"></span></div>
            <div class="hosp-note" id="g-hosp-note"></div>
          </div>
          <div class="tv" id="g-tv">
            <div class="tv-top">
              <span class="tv-live"><span class="dot"></span><span id="g-tv-live"></span></span>
              <span class="tv-chan" id="g-tv-chan"></span>
            </div>
            <div class="tv-screen">
              <span class="tv-cat" id="g-tv-cat"></span>
              <span class="tv-scene" id="g-tv-scene">🎙️</span>
              <div class="tv-lower">
                <span class="band" id="g-tv-band"></span>
                <div class="head" id="g-tv-head"></div>
              </div>
            </div>
            <div class="tv-foot"><span id="g-tv-day"></span><span class="more" id="g-tv-more"></span></div>
          </div>
        </div>
        <div class="charts">
          <div class="panel chart-card">
            <div class="ch-head"><h4 id="g-macro-title"></h4><div class="legend" id="g-macro-legend"></div></div>
            <canvas id="g-curve-macro" class="g-canvas"></canvas>
            <div class="ax-note" id="g-macro-axis"></div>
          </div>
          <div class="panel chart-card">
            <div class="ch-head"><h4 id="g-inf-title"></h4><div class="legend" id="g-inf-legend"></div></div>
            <canvas id="g-curve-inf" class="g-canvas"></canvas>
            <div class="ax-note" id="g-inf-axis"></div>
          </div>
          <div class="panel chart-card">
            <div class="ch-head"><h4 id="g-zoom-title"></h4><div class="legend" id="g-zoom-legend"></div></div>
            <canvas id="g-curve-zoom" class="g-canvas"></canvas>
            <div class="ax-note" id="g-zoom-axis"></div>
          </div>
          <div class="panel chart-card">
            <div class="ch-head"><h4 id="g-hosp-title"></h4><div class="legend" id="g-hosp-legend"></div></div>
            <canvas id="g-curve-hosp" class="g-canvas"></canvas>
            <div class="ax-note" id="g-hosp-axis"></div>
          </div>
        </div>
        <div class="side side-actions">
          <div class="panel deck-panel" style="padding:13px 15px">
            <div class="deck-head"><h4 id="g-deck-title"></h4><span class="hint" id="g-deck-hint"></span></div>
            <div class="deck" id="g-deck"></div>
          </div>
        </div>
      </div>
    </section>

    <p class="disclaimer" id="g-disclaimer"></p>
  </div>

  <div class="overlay" id="g-overlay">
    <div class="panel endcard">
      <h3 id="g-end-title"></h3>
      <p class="sub" id="g-end-sub"></p>
      <div class="score-grid" id="g-score-grid"></div>
      <div class="why" id="g-end-why"></div>
      <div class="quiz" id="g-end-quiz"></div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-primary" id="g-play-again" style="flex:1"></button>
        <button class="btn btn-ghost" id="g-review"></button>
      </div>
    </div>
  </div>

  <div class="overlay" id="g-plantao-overlay">
    <div class="plantao-card">
      <div class="pl-top">
        <span class="pl-live"><span class="dot"></span><span id="g-plantao-live"></span></span>
        <button class="pl-x" id="g-plantao-x">✕</button>
      </div>
      <div class="pl-body">
        <span class="pl-scene" id="g-plantao-scene">📰</span>
        <div>
          <div class="pl-cat" id="g-plantao-cat"></div>
          <h3 class="pl-head" id="g-plantao-head"></h3>
          <p class="pl-detail" id="g-plantao-detail"></p>
        </div>
      </div>
      <div class="pl-foot"><button class="btn btn-primary" id="g-plantao-continue"></button></div>
    </div>
  </div>

  <div class="overlay" id="g-feed-overlay">
    <div class="panel feed-card">
      <h3 id="g-feed-title"></h3>
      <p class="sub" id="g-feed-sub"></p>
      <div id="g-feed-list"></div>
      <div style="margin-top:16px"><button class="btn btn-ghost" id="g-feed-close" style="width:100%"></button></div>
    </div>
  </div>`;
}

/* --------------------------------- capa ---------------------------------- */

/**
 * Icones da capa em SVG inline (traco, monocromaticos, herdam currentColor).
 * Emoji foi descartado de proposito: 🦠 vem verde e ⏱️/📈 vem coloridos pelo
 * sistema, brigando com a paleta do hero — e o desenho muda de OS para OS.
 */
const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Virus: nucleo + 8 espiculas com botao na ponta. */
const ICON_VIRUS = svg(`
  <circle cx="12" cy="12" r="4.6"/>
  <path d="M16.6 12h2.8M15.25 15.25l1.98 1.98M12 16.6v2.8M8.75 15.25l-1.98 1.98M7.4 12H4.6M8.75 8.75L6.77 6.77M12 7.4V4.6M15.25 8.75l1.98-1.98"/>
  <circle cx="20.7" cy="12" r="1.1"/><circle cx="18.15" cy="18.15" r="1.1"/>
  <circle cx="12" cy="20.7" r="1.1"/><circle cx="5.85" cy="18.15" r="1.1"/>
  <circle cx="3.3" cy="12" r="1.1"/><circle cx="5.85" cy="5.85" r="1.1"/>
  <circle cx="12" cy="3.3" r="1.1"/><circle cx="18.15" cy="5.85" r="1.1"/>`);

/** Os tres pilares da capa. So icone + chaves; os textos vivem no i18n. */
const COVER_CARDS = [
  { k: 'timing', icon: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>') },
  { k: 'causality', icon: svg('<path d="M4 6h3.5c3 0 3 12 6 12H17M4 18h3.5c1.4 0 2.2-2.6 2.8-5.4"/><path d="M14.6 3.6L17.6 6l-3 2.4M14.6 15.6l3 2.4-3 2.4"/>') },
  { k: 'visible', icon: svg('<path d="M3.5 20V4"/><path d="M3.5 20h17"/><path d="M6.5 16.4c2.6 0 3.2-8.2 5.4-8.2 2.4 0 2.6 4.4 4 4.4 1.2 0 1.6-2.2 2.8-4.4"/>') },
];
const HOWTO_STEPS = ['territory', 'pathogen', 'outbreak'];

function renderCover() {
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('g-cover-title', t('game.cover.title'));
  set('g-cover-sub', t('game.cover.subtitle'));
  set('g-cover-kicker', t('game.cover.kicker'));
  set('g-cover-lede', t('game.cover.lede'));
  set('g-cover-author', t('game.cover.author'));
  set('g-cover-start', t('game.cover.start'));
  set('g-cover-help', t('game.cover.help'));
  set('g-cover-foot', t('disclaimer'));
  set('g-howto-title', t('game.cover.howto.title'));
  set('g-howto-note', t('game.cover.howto.note'));
  set('g-howto-close', t('game.cover.howto.close'));

  $('g-cover-badge').innerHTML = ICON_VIRUS;
  $('g-cover-cards').innerHTML = COVER_CARDS.map((c) => `
    <div class="ccard">
      <span class="cc-ic">${c.icon}</span>
      <h3>${t('game.cover.card.' + c.k + '.title')}</h3>
      <p>${t('game.cover.card.' + c.k + '.desc')}</p>
    </div>`).join('');

  $('g-howto-steps').innerHTML = HOWTO_STEPS.map((s) =>
    `<li><b>${t('game.cover.howto.' + s + '.title')}</b>${t('game.cover.howto.' + s + '.desc')}</li>`).join('');

  const lang = getLanguage();
  $('g-cover-pt').setAttribute('aria-pressed', String(lang === 'pt'));
  $('g-cover-en').setAttribute('aria-pressed', String(lang === 'en'));
}

/** Sai da capa para a Tela 1. */
function dismissCover() {
  const el = $('g-cover');
  el.classList.add('gone');
  sfx.wake();
  // Espera o fade antes de tirar do fluxo, senao a transicao nao aparece.
  setTimeout(() => { el.style.display = 'none'; }, 420);
}

/** Volta para a capa (botao "Início" da Tela 1). Pausa o jogo por seguranca. */
function showCover() {
  setPlaying(false);
  const el = $('g-cover');
  el.style.display = '';
  // Força reflow para o navegador registrar o display antes de tirar .gone —
  // sem isso a transicao de opacidade nao dispara.
  void el.offsetWidth;
  el.classList.remove('gone');
  window.scrollTo({ top: 0 });
}

/* ------------------------------ tela 1: cidades -------------------------- */

function difficultyKey(cap) {
  if (cap < 2000) return 'game.city.diff.hard';
  if (cap < 8000) return 'game.city.diff.medium';
  return 'game.city.diff.easy';
}
function statRow(label, frac, num) {
  return `<div class="stat"><label>${label}</label>
    <div class="meter"><i style="width:${Math.min(100, frac * 100)}%"></i></div>
    <span class="num">${num}</span></div>`;
}
function renderCities() {
  const box = $('g-city-cards');
  const maxCap = 12000, maxDens = 8000;
  box.innerHTML = CITIES.map((c) => `
    <button class="city" data-id="${c.id}" aria-pressed="false">
      <div class="city-top"><h3>${t(c.labelKey)}</h3><span class="pop">${fmt(c.population)} ${t('game.city.inhabitants')}</span></div>
      <div class="tag">${t(c.descKey)}</div>
      ${statRow(t('game.city.stat.density'), c.density / maxDens, c.density.toLocaleString())}
      ${statRow(t('game.city.stat.sanitation'), c.sanitation, pct(c.sanitation))}
      ${statRow(t('game.city.stat.transport'), c.connectivity, pct(c.connectivity))}
      ${statRow(t('game.city.stat.beds'), c.hospitalCapacity / maxCap, fmt(c.hospitalCapacity))}
      <div class="diff">${t('game.city.difficulty')}: <b>${t(difficultyKey(c.hospitalCapacity))}</b></div>
    </button>`).join('');
  box.querySelectorAll('.city').forEach((el) => el.addEventListener('click', () => {
    box.querySelectorAll('.city').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    el.setAttribute('aria-pressed', 'true');
    game.selectCity(el.dataset.id);
    $('g-to-virus').disabled = false;
  }));
}

/* ------------------------------ tela 2: patogeno ------------------------- */

const SLIDERS = [
  { key: 'R0', labelKey: 'param.R0', min: 0.8, max: 8, step: 0.1, fmt: (v) => v.toFixed(1) },
  { key: 'latentPeriod', labelKey: 'param.latentPeriod', min: 1, max: 10, step: 1, fmt: (v) => v + 'd' },
  { key: 'infectiousPeriod', labelKey: 'param.infectiousPeriod', min: 2, max: 14, step: 1, fmt: (v) => v + 'd' },
  { key: 'hospRate', labelKey: 'param.hospRate', min: 0.01, max: 0.5, step: 0.01, fmt: (v) => pct(v) },
  { key: 'ifr', labelKey: 'param.ifr', min: 0.001, max: 0.3, step: 0.001, fmt: (v) => (v * 100).toFixed(1) + '%' },
  { key: 'hospStay', labelKey: 'param.hospStay', min: 4, max: 20, step: 1, fmt: (v) => v + 'd' },
];

function renderPresets() {
  const box = $('g-presets');
  const cur = game.getState().presetId;
  box.innerHTML = PATHOGENS.map((p) =>
    `<button class="chip" data-id="${p.id}" aria-pressed="${p.id === cur}">${t(p.labelKey)}</button>`).join('');
  box.querySelectorAll('.chip').forEach((el) => el.addEventListener('click', () => {
    game.selectPreset(el.dataset.id);
    box.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.id === el.dataset.id)));
    renderSliderValues(); updateDerived();
  }));
}

function renderSliders() {
  const box = $('g-sliders');
  const p = game.getState().pathogen;
  box.innerHTML = SLIDERS.map((s) => `
    <div class="field">
      <div class="row"><label for="g-s-${s.key}">${t(s.labelKey)}</label><span class="v" id="g-v-${s.key}">${s.fmt(p[s.key])}</span></div>
      <input type="range" id="g-s-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${p[s.key]}">
    </div>`).join('') + `
    <div class="field">
      <div class="row"><label>${t('param.route')}</label></div>
      <div class="seg" id="g-route-seg">
        ${Object.keys(TRANSMISSION_ROUTES).map((k) => `<button data-r="${k}" aria-pressed="${p.route === k}">${t('route.' + k)}</button>`).join('')}
      </div>
    </div>`;
  SLIDERS.forEach((s) => {
    $('g-s-' + s.key).addEventListener('input', (ev) => {
      game.updatePathogen(s.key, parseFloat(ev.target.value));
      renderSliderValues();
      $('g-presets').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      updateDerived();
    });
  });
  $('g-route-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    game.setRoute(b.dataset.r);
    $('g-route-seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.r === b.dataset.r)));
    $('g-presets').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    updateDerived();
  }));
}

/** Re-sincroniza os valores/posicoes dos sliders com o store (apos invariante). */
function renderSliderValues() {
  const p = game.getState().pathogen;
  SLIDERS.forEach((s) => {
    const inp = $('g-s-' + s.key), val = $('g-v-' + s.key);
    if (inp) inp.value = p[s.key];
    if (val) val.textContent = s.fmt(p[s.key]);
  });
}

/**
 * Comparador de R0 com doencas reais (o "easter-egg" previsto no ROADMAP).
 * Mostra as duas doencas que cercam o R0 escolhido pelo aluno, mais a barra do
 * proprio patogeno no meio — ancora a abstracao do slider em algo conhecido.
 * Dados: src/data/real-diseases.js (nomes reais e publicos; diferente dos
 * perfis A/B/C de cidades, que sao anonimizados).
 */
function renderRealDiseases() {
  const box = $('g-real-list');
  if (!box) return;
  const r0 = game.getState().pathogen.R0;
  const lang = getLanguage();

  // Vizinhos imediatos na escala: o de R0 logo abaixo e o logo acima.
  const asc = [...REAL_DISEASES].sort((a, b) => a.r0 - b.r0);
  const below = [...asc].reverse().find((d) => d.r0 <= r0);
  const above = asc.find((d) => d.r0 > r0);

  const rows = [];
  if (below) rows.push({ ...below, kind: 'real' });
  rows.push({ id: '__you', r0, kind: 'you', name: null });
  if (above) rows.push({ ...above, kind: 'real' });

  const scale = Math.max(R0_MAX_DISEASE, r0);
  box.innerHTML = rows.map((d) => {
    const label = d.kind === 'you' ? t('game.real.yours') : d.name[lang];
    const val = d.kind === 'you' ? d.r0.toFixed(1) : `${d.r0} (${d.range})`;
    return `<div class="rd-row ${d.kind === 'you' ? 'is-you' : ''}">
      <span class="rd-name">${label}</span>
      <span class="rd-bar"><i style="width:${Math.min(100, d.r0 / scale * 100)}%"></i></span>
      <span class="rd-val">${val}</span>
    </div>`;
  }).join('');
}

function levelKey(value, hi, mid) {
  return value >= hi ? 'game.level.high' : value >= mid ? 'game.level.medium' : 'game.level.low';
}
function updateDerived() {
  const p = game.getState().pathogen;
  const herd = p.R0 > 1 ? 1 - 1 / p.R0 : 0;
  $('g-d-herd').textContent = p.R0 > 1 ? pct(herd) : '—';
  $('g-d-double').textContent = p.R0 > 1
    ? (Math.log(2) / ((1 / p.infectiousPeriod) * (p.R0 - 1))).toFixed(1) + ' ' + t('game.derived.days')
    : '—';
  $('g-d-route').textContent = t('route.' + p.route);
  const k = TRANSMISSION_ROUTES[p.route].sanitationSensitivity;
  const kLabel = k >= 0.4 ? t('game.derived.sanMuch') : t('game.derived.sanLittle');
  $('g-d-san').textContent = `${kLabel} (${Math.round(k * 100)}%)`;
  $('g-d-profile').textContent = tf('game.derived.profileFmt', {
    t: t(levelKey(p.R0, 4, 2)), s: t(levelKey(p.ifr, 0.05, 0.01)),
  });
  renderRealDiseases();
}

/* ------------------------------ tela 3: cockpit -------------------------- */

const KPI_DEFS = [
  { key: 'S', labelKey: 'chart.legend.S', c: '--c-S' },
  { key: 'I', labelKey: 'chart.legend.I', c: '--c-I' },
  { key: 'H', labelKey: 'chart.legend.H', c: '--c-H' },
  { key: 'R', labelKey: 'chart.legend.R', c: '--c-R' },
  { key: 'D', labelKey: 'chart.legend.D', c: '--c-D' },
];

function renderKPIshell() {
  const box = $('g-kpis');
  box.innerHTML = `<div class="panel g-kpi" style="--k:var(--ink-3)">
      <div class="kl"><i style="background:var(--ink-3)"></i>${t('game.kpi.population')}</div>
      <div class="kv" id="g-kpi-pop">${fmt(game.population())}</div><div class="kp">${t('game.kpi.total')}</div>
    </div>` + KPI_DEFS.map((k) => `
    <div class="panel g-kpi" style="--k:var(${k.c})">
      <div class="kl"><i></i>${t(k.labelKey)}</div>
      <div class="kv" id="g-kpi-${k.key}">0</div>
      <div class="kp" id="g-kpp-${k.key}">0%</div>
    </div>`).join('');
}

function renderDeck() {
  const box = $('g-deck');
  box.innerHTML = DECK.map((iv) => `
    <button class="card" data-id="${iv.id}" aria-pressed="false">
      <span class="ci">${iv.icon}</span>
      <span class="cbody"><span class="cn">${t(iv.labelKey)}</span><span class="cd">${t(iv.descKey)}</span>
        <span class="clock-note" id="g-lock-${iv.id}"></span></span>
      <span class="cost">−${iv.cost}</span>
    </button>`).join('');
  box.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => {
    if (game.buyCard(el.dataset.id)) { sfx.intervene(); syncDeck(); updateHUD(); }
  }));
}

/**
 * Estado visual do baralho: comprada / travada (unlockAfter) / sem orcamento.
 * Tambem atualiza o medidor de orcamento — os tres andam juntos a cada compra,
 * avanco de dia e rewind.
 */
function syncDeck() {
  const st = game.getState();
  $('g-budget-v').textContent = st.budget;
  $('g-budget-bar').style.width = (st.budget / START_BUDGET * 100) + '%';

  const active = game.activeCardIds();
  $('g-deck').querySelectorAll('.card').forEach((el) => {
    const id = el.dataset.id;
    const card = DECK.find((c) => c.id === id);
    const bought = active.has(id);
    const unlocked = game.isUnlocked(id);
    el.setAttribute('aria-pressed', String(bought));
    el.classList.toggle('locked', !bought && !unlocked);
    el.disabled = !bought && (!unlocked || !game.affordable(id));
    // Carta travada mostra o dia (absoluto) em que sera liberada.
    const note = $('g-lock-' + id);
    if (note) {
      note.textContent = (!bought && !unlocked)
        ? tf('game.deck.locked', { day: st.startDay + card.unlockAfter })
        : '';
    }
  });
}

function updateKPIs() {
  const p = game.dayData();
  const pop = game.population();
  for (const k of KPI_DEFS) {
    $('g-kpi-' + k.key).textContent = fmt(p[k.key]);
    $('g-kpp-' + k.key).textContent = pctAuto(p[k.key] / pop);
  }
}

function updateHUD() {
  const p = game.dayData();
  $('g-day').textContent = game.getState().dayIndex;
  const canRw = game.canRewind();
  $('g-back10').disabled = !canRw;
  $('g-back1').disabled = !canRw;
  updateKPIs();

  // Rt
  const rv = $('g-rt-v'), tag = $('g-rt-tag');
  rv.textContent = p.Rt.toFixed(2);
  if (p.Rt > 1.05) {
    rv.style.color = 'var(--c-I)'; tag.textContent = t('game.rt.rising');
    tag.style.background = 'color-mix(in srgb,var(--c-I) 18%,transparent)'; tag.style.color = 'var(--c-I)';
  } else if (p.Rt < 0.95) {
    rv.style.color = 'var(--c-R)'; tag.textContent = t('game.rt.falling');
    tag.style.background = 'color-mix(in srgb,var(--c-R) 18%,transparent)'; tag.style.color = 'var(--c-R)';
  } else {
    rv.style.color = 'var(--c-H)'; tag.textContent = t('game.rt.threshold');
    tag.style.background = 'color-mix(in srgb,var(--c-H) 18%,transparent)'; tag.style.color = 'var(--c-H)';
  }

  // hospital
  const occ = p.hospOccupancy;
  $('g-hosp-pct').textContent = Math.round(occ * 100) + '%';
  const hbar = $('g-hbar');
  $('g-hbar-i').style.width = Math.min(100, occ * 100) + '%';
  const note = $('g-hosp-note');
  if (occ >= 1) { hbar.classList.add('crit'); note.textContent = t('game.hosp.collapse'); }
  else { hbar.classList.remove('crit'); note.textContent = ''; }

  drawCharts();
  updateTV();
}

function drawCharts() {
  const p = game.dayData();
  drawGameCharts(
    {
      macro: $('g-curve-macro'), zoom: $('g-curve-zoom'),
      infZoom: $('g-curve-inf'), hospZoom: $('g-curve-hosp'), root: rootEl,
    },
    {
      series: game.seriesUpTo(),
      population: game.population(),
      initialCapacity: game.initialCapacity(),
      capacityNow: p.capacity,
      capacityLabel: t('game.chart.capacity').toLowerCase(),
    },
  );
}

/* -------------------------------- TV / SNN ------------------------------- */

function setTV(e, cat, head) {
  $('g-tv-scene').textContent = e;
  $('g-tv-cat').textContent = cat;
  $('g-tv-head').textContent = head;
}
function updateTV() {
  const it = game.latestHeadline();
  if (it) setTV(it.e, it.cat, it.head);
  else setTV('🎙️', t('game.tv.bulletin'), t('game.tv.waiting'));
  $('g-tv-day').textContent = tf('game.feed.day', { n: game.getState().dayIndex });
}

function enqueuePlantoes(list) {
  if (!list.length) return;
  if (!plantaoActive && plantaoQueue.length === 0) resumePlay = playing; // 1a da leva: lembra se tocava
  for (const it of list) plantaoQueue.push(it);
  showPlantao();
}
function showPlantao() {
  if (plantaoActive || !plantaoQueue.length) return;
  const it = plantaoQueue[0];
  plantaoActive = true; setPlaying(false);
  $('g-plantao-scene').textContent = it.e;
  $('g-plantao-cat').textContent = it.cat;
  $('g-plantao-head').textContent = it.head;
  $('g-plantao-detail').textContent = it.detail;
  $('g-plantao-overlay').classList.add('show');
  if (it.id === 'collapse') sfx.collapse(); else sfx.plantao();
}
function dismissPlantao() {
  plantaoQueue.shift();
  $('g-plantao-overlay').classList.remove('show');
  plantaoActive = false;
  if (plantaoQueue.length) showPlantao();
  else if (resumePlay) setPlaying(true);
}
function openFeed() {
  const list = $('g-feed-list');
  const feed = game.getState().feed;
  list.innerHTML = feed.length
    ? [...feed].reverse().map((it) => `<div class="feed-item"><span class="fe">${it.e}</span>
        <div><div class="fc">${it.cat}</div><div class="fh">${it.head}</div><div class="fd">${tf('game.feed.day', { n: it.day })}</div></div></div>`).join('')
    : `<div class="feed-empty">${t('game.feed.empty')}</div>`;
  feedResume = playing; setPlaying(false);
  $('g-feed-overlay').classList.add('show');
}
function closeFeed() {
  $('g-feed-overlay').classList.remove('show');
  if (feedResume) setPlaying(true);
}

/* --------------------------------- loop ---------------------------------- */

function tick() {
  if (!playing) return;
  const { over, newPlantoes } = game.advanceDay();
  sfx.day();
  syncDeck();
  updateHUD();
  if (newPlantoes.length) enqueuePlantoes(newPlantoes);
  if (over) endGame();
}
function setPlaying(p) {
  playing = p;
  $('g-play').textContent = p ? '❚❚' : '▶';
  if (timer) { clearInterval(timer); timer = null; }
  if (p) timer = setInterval(tick, TICK_MS / speed);
}

function initOutbreak() {
  game.initOutbreak();
  plantaoQueue = []; plantaoActive = false; resumePlay = false;
  $('g-overlay').classList.remove('show');
  $('g-plantao-overlay').classList.remove('show');
  $('g-feed-overlay').classList.remove('show');
  $('g-macro-title').textContent = tf('game.chart.macroTitle', { city: t(CITIES.find((c) => c.id === game.getState().cityId).labelKey) });
  renderKPIshell(); renderDeck(); syncDeck();
  updateHUD();
  requestAnimationFrame(drawCharts); // garante layout do canvas visivel
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!plantaoActive) setPlaying(!reduce);
}

/* ------------------------------- rewind ---------------------------------- */

function doRewind(days) {
  setPlaying(false);
  $('g-overlay').classList.remove('show');
  plantaoQueue = []; plantaoActive = false;
  $('g-plantao-overlay').classList.remove('show');
  game.rewind(days);
  syncDeck(); updateHUD();
}

/* ------------------------------ relatorio -------------------------------- */

function endGame() {
  setPlaying(false);
  const st = game.getState();
  const p = game.dayData();
  const pop = game.population();
  const peaks = st.peaks;
  const collapsed = peaks.peakOcc >= 1;
  const early = st.dayIndex < game.HORIZON;
  const immune = p.R / pop;

  $('g-end-title').textContent = collapsed ? t('game.end.collapsedTitle') : t('game.end.containedTitle');
  const when = early ? tf('game.end.subEarly', { day: st.dayIndex }) : tf('game.end.subLimit', { h: game.HORIZON });
  $('g-end-sub').textContent = tf('game.end.sub', {
    city: t(CITIES.find((c) => c.id === st.cityId).labelKey), when, immune: pct(immune),
  });

  const scores = [
    [t('game.end.score.deaths'), fmt(p.D)],
    [t('game.end.score.peakOcc'), Math.round(peaks.peakOcc * 100) + '%'],
    [t('game.end.score.collapseDays'), peaks.collapseDays],
    [t('game.end.score.peakI'), fmt(peaks.peakI)],
    [t('game.end.score.rtCross'), peaks.rtCross ?? '—'],
    [t('game.end.score.duration'), tf('game.end.duration', { n: st.dayIndex })],
  ];
  $('g-score-grid').innerHTML = scores.map((s) =>
    `<div class="score"><div class="sl">${s[0]}</div><div class="sv">${s[1]}</div></div>`).join('');

  const herd = pct(st.pathogen.R0 > 1 ? 1 - 1 / st.pathogen.R0 : 0);
  const whyParams = { r0: st.pathogen.R0.toFixed(1), herd, peak: Math.round(peaks.peakOcc * 100) + '%' };
  $('g-end-why').innerHTML = `<b>${t('game.end.whyLabel')}</b> ` +
    tf(collapsed ? 'game.end.whyCollapsed' : 'game.end.whyContained', whyParams);

  // quiz (deterministico: sorteado pela metrica da partida)
  const qi = QUIZZES[Math.floor(peaks.peakI) % QUIZZES.length];
  const qbox = $('g-end-quiz');
  qbox.innerHTML = `<div class="q">💡 ${t(qi.qKey)}</div>` +
    qi.optKeys.map((o, i) => `<button class="opt" data-i="${i}">${t(o)}</button>`).join('') +
    `<div class="fb" id="g-q-fb">${t(qi.whyKey)}</div>`;
  let done = false;
  qbox.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    if (done) return; done = true;
    const chosen = +b.dataset.i;
    qbox.querySelectorAll('.opt').forEach((x, j) => {
      if (j === qi.correct) x.classList.add('correct');
      else if (j === chosen) x.classList.add('wrong');
      x.disabled = true;
    });
    if (chosen === qi.correct) sfx.intervene(); else sfx.collapse();
    $('g-q-fb').style.display = 'block';
  }));

  $('g-overlay').classList.add('show');
}

/* ------------------------------ navegacao -------------------------------- */

function goto(n) {
  screen = n;
  const ids = ['g-screen-city', 'g-screen-virus', 'g-screen-game'];
  ids.forEach((id, i) => $(id).classList.toggle('active', i === n));
  rootEl.querySelectorAll('#g-flow .step').forEach((st) => {
    const i = +st.dataset.s;
    st.classList.toggle('active', i === n);
    st.classList.toggle('done', i < n);
  });
  rootEl.classList.toggle('on-outbreak', n === 2);   // esconde o stepper na Tela 3
  if (n !== 2) setPlaying(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------- rotulos -------------------------------- */

function legendHTML(items) {
  return items.map((it) => it.cap
    ? `<span><i class="cap"></i>${t(it.key)}</span>`
    : `<span><i style="background:var(${it.c})"></i>${t(it.key)}</span>`).join('');
}

function applyLabels() {
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('g-flow-0', t('game.flow.territory'));
  set('g-flow-1', t('game.flow.pathogen'));
  set('g-flow-2', t('game.flow.outbreak'));
  set('g-s1-title', t('game.screen1.title'));
  set('g-s1-sub', t('game.screen1.sub'));
  set('g-to-cover', t('game.screen1.cover'));
  set('g-to-virus', t('game.screen1.next'));
  set('g-s2-title', t('game.screen2.title'));
  set('g-derived-title', t('game.screen2.derivedTitle'));
  set('g-real-title', t('game.real.title'));
  set('g-real-note', t('game.real.note'));
  set('g-dl-herd', t('game.derived.herd'));
  set('g-dl-double', t('game.derived.double'));
  set('g-dl-route', t('game.derived.route'));
  set('g-dl-san', t('game.derived.sanitation'));
  set('g-dl-profile', t('game.derived.profile'));
  set('g-back-city', t('game.screen2.back'));
  set('g-to-game', t('game.screen2.start'));
  set('g-day-label', t('game.day'));
  set('g-budget-label', t('game.budget.label'));
  set('g-budget-pts', t('game.budget.pts'));
  set('g-rt-label', t('game.rt.label'));
  set('g-hosp-label', t('game.hosp.label'));
  set('g-tv-live', t('game.tv.live'));
  set('g-tv-chan', t('game.tv.channel'));
  set('g-tv-band', t('game.tv.network'));
  set('g-tv-more', t('game.tv.history'));
  set('g-zoom-title', t('game.chart.zoomTitle'));
  set('g-inf-title', t('game.chart.infZoomTitle'));
  set('g-hosp-title', t('game.chart.hospZoomTitle'));
  set('g-macro-axis', tf('game.chart.macroAxis', { h: game.HORIZON }));
  set('g-zoom-axis', t('game.chart.zoomAxis'));
  set('g-inf-axis', t('game.chart.infZoomAxis'));
  set('g-hosp-axis', t('game.chart.hospZoomAxis'));
  set('g-deck-title', t('game.deck.title'));
  set('g-deck-hint', t('game.deck.hint'));
  set('g-restart', '↺ ' + t('game.restart.title'));
  set('g-disclaimer', t('disclaimer'));
  set('g-plantao-live', t('game.plantao.live'));
  set('g-plantao-continue', t('game.plantao.continue'));
  set('g-feed-title', t('game.feed.title'));
  set('g-feed-sub', t('game.feed.sub'));
  set('g-feed-close', t('game.feed.close'));
  set('g-play-again', t('game.end.playAgain'));
  set('g-review', t('game.end.review'));
  $('g-tv').title = t('game.tv.title');
  $('g-back10').title = t('game.back10.title');
  $('g-back1').title = t('game.back1.title');
  $('g-play').title = t('game.play.title');
  $('g-restart').title = t('game.restart.title');
  $('g-sound').title = t('game.sound.title');
  $('g-macro-legend').innerHTML = legendHTML([
    { c: '--c-S', key: 'chart.legend.S' }, { c: '--c-I', key: 'chart.legend.I' },
    { c: '--c-R', key: 'chart.legend.R' }, { c: '--c-D', key: 'chart.legend.D' },
  ]);
  $('g-inf-legend').innerHTML = legendHTML([
    { c: '--c-I', key: 'chart.legend.I' },
  ]);
  $('g-zoom-legend').innerHTML = legendHTML([
    { c: '--c-H', key: 'chart.legend.H' }, { cap: true, key: 'game.chart.capacity' },
    { c: '--c-D', key: 'game.chart.deathsCum' },
  ]);
  $('g-hosp-legend').innerHTML = legendHTML([
    { c: '--c-H', key: 'chart.legend.H' }, { cap: true, key: 'game.chart.capacity' },
    { c: '--c-D', key: 'game.chart.deathsCum' },
  ]);
  if (game.getState().cityId) {
    set('g-macro-title', tf('game.chart.macroTitle', { city: t(CITIES.find((c) => c.id === game.getState().cityId).labelKey) }));
  } else {
    set('g-macro-title', t('game.chart.macroTitle').replace('{city}', ''));
  }
}

/* ------------------------------- API publica ----------------------------- */

/** Monta o jogo dentro de rootEl (chamado uma vez pelo roteador). */
export function mountGame(el) {
  rootEl = el;
  rootEl.classList.add('game-app');
  rootEl.innerHTML = shellHTML();

  applyLabels();
  renderCover();
  renderCities();
  updateSoundIcon();

  $('g-cover-start').addEventListener('click', dismissCover);
  $('g-to-cover').addEventListener('click', showCover);
  $('g-cover-help').addEventListener('click', () => $('g-cover-howto').classList.add('show'));
  $('g-howto-close').addEventListener('click', () => $('g-cover-howto').classList.remove('show'));
  $('g-cover-pt').addEventListener('click', () => setLanguage('pt'));
  $('g-cover-en').addEventListener('click', () => setLanguage('en'));

  $('g-to-virus').addEventListener('click', () => { sfx.wake(); renderPresets(); renderSliders(); updateDerived(); goto(1); });
  $('g-back-city').addEventListener('click', () => goto(0));
  $('g-to-game').addEventListener('click', () => { sfx.wake(); goto(2); initOutbreak(); });
  $('g-play').addEventListener('click', () => { sfx.wake(); setPlaying(!playing); });
  $('g-back10').addEventListener('click', () => doRewind(10));
  $('g-back1').addEventListener('click', () => doRewind(1));
  $('g-restart').addEventListener('click', () => goto(0));   // Reiniciar: volta pra 1a tela
  $('g-sound').addEventListener('click', () => { sfx.toggle(); updateSoundIcon(); });
  $('g-plantao-x').addEventListener('click', dismissPlantao);
  $('g-plantao-continue').addEventListener('click', dismissPlantao);
  $('g-tv').addEventListener('click', openFeed);
  $('g-feed-close').addEventListener('click', closeFeed);
  $('g-play-again').addEventListener('click', () => initOutbreak());
  $('g-review').addEventListener('click', () => $('g-overlay').classList.remove('show'));
  $('g-speeds').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.sp;
    $('g-speeds').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (playing) setPlaying(true);
  }));
  window.addEventListener('resize', () => { if (screen === 2) drawCharts(); });
}

function updateSoundIcon() {
  const el = $('g-sound');
  if (el) el.textContent = sfx.isEnabled() ? '🔊' : '🔇';
}

/** Pausa o jogo (chamado pelo roteador ao sair do Modo Jogo). */
export function pauseGame() { setPlaying(false); }

/** Redesenha ao reentrar no Modo Jogo (layout do canvas pode ter mudado). */
export function relayoutGame() { if (screen === 2) requestAnimationFrame(drawCharts); }

/** Re-aplica strings + re-renderiza a tela atual ao trocar de idioma. */
export function onLanguageChangeGame() {
  game.refresh();
  applyLabels();
  renderCover();
  renderCities();
  if (screen >= 1) { renderPresets(); renderSliders(); updateDerived(); }
  if (screen === 2) { renderKPIshell(); renderDeck(); syncDeck(); updateHUD(); }
}
