/**
 * main.js — roteador da aplicacao (Jogo <-> Analise).
 * -----------------------------------------------------------------------------
 * Ponto de entrada unico. Possui a barra de topo (toggle de modo + idioma) e
 * monta um dos dois modos:
 *   - Modo Jogo    (src/game/*)      — fluxo em 3 telas, dirigido pelo motor.
 *   - Modo Analise (src/analysis/*)  — o painel-dashboard de exploracao livre.
 * O motor (src/engine/*) e compartilhado e continua puro.
 */

import { t, setLanguage, onLanguageChange } from './i18n/index.js';
import { initAnalysis, rerenderAnalysis } from './analysis/index.js';
import { mountGame, pauseGame, relayoutGame, onLanguageChangeGame } from './game/screens.js';

const el = (id) => document.getElementById(id);

let mode = 'game';
let gameMounted = false;
let analysisMounted = false;

function applyChrome() {
  el('app-title').textContent = t('app.title');
  el('mode-game').textContent = t('game.mode');
  el('mode-analysis').textContent = t('analysis.mode');
}

function setMode(m) {
  mode = m;
  el('mode-game').classList.toggle('active', m === 'game');
  el('mode-analysis').classList.toggle('active', m === 'analysis');
  el('game-root').style.display = m === 'game' ? 'block' : 'none';
  el('analysis-root').style.display = m === 'analysis' ? 'block' : 'none';
  if (m === 'game') {
    if (!gameMounted) { mountGame(el('game-root')); gameMounted = true; }
    relayoutGame();
  } else {
    pauseGame();
    // Montagem preguicosa: so simula/desenha o dashboard quando ele aparece.
    if (!analysisMounted) { initAnalysis(); analysisMounted = true; }
  }
}

function init() {
  applyChrome();

  el('mode-game').addEventListener('click', () => setMode('game'));
  el('mode-analysis').addEventListener('click', () => setMode('analysis'));
  el('lang-pt').addEventListener('click', () => setLanguage('pt'));
  el('lang-en').addEventListener('click', () => setLanguage('en'));

  onLanguageChange(() => {
    applyChrome();
    if (analysisMounted) rerenderAnalysis();
    if (gameMounted) onLanguageChangeGame();
  });

  setMode('game');
}

document.addEventListener('DOMContentLoaded', init);
