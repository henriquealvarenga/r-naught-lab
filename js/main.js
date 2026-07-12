// ============================================================================
// main.js  ·  [ ~ main.R / global.R ]
// Entry point (ES module). Importa os módulos e inicializa simulador,
// navegação, jogo e o easter-egg; redesenha no resize.
// Carregado com <script type="module"> — executa após o parse do DOM.
// ============================================================================

import { state } from "./core/state.js";
import { fmtNum } from "./core/format.js";
import { initSim } from "./ui/sim.js";
import { initNav, showSection, redrawNivel } from "./ui/screens.js";
import { initGame } from "./game/game.js";
import { DOENCAS, R0_MAX_DOENCA } from "./game/datasets.js";

document.addEventListener("DOMContentLoaded", () => {
  if (state._initialized) return;

  initSim();     // sim.js  — controles reativos + desenho inicial
  initNav();     // screens.js — nav, data-goto, toggle de nível
  initGame();    // game.js — lista de rodadas, placar
  initEgg();     // easter-egg (R₀ de doenças)

  state._initialized = true;
});

// ---- Easter-egg: R₀ de doenças reais --------------------------------------
function initEgg() {
  // preenche a lista (barras proporcionais ao R₀)
  const lista = document.getElementById("egg-list");
  lista.innerHTML = DOENCAS.map((d) => {
    const pct = Math.min(100, (d.r0 / R0_MAX_DOENCA) * 100);
    return `<div class="disease-row">
        <span style="min-width:150px">${d.nome} <small class="muted">(${d.faixa})</small></span>
        <div class="disease-bar"><i style="width:${pct}%"></i></div>
        <span class="disease-r0">${fmtNum(d.r0, 1)}</span>
      </div>`;
  }).join("");

  const egg = document.getElementById("egg");
  const abrir = () => egg.classList.add("active");
  const fechar = () => egg.classList.remove("active");

  document.getElementById("egg-close").addEventListener("click", fechar);
  egg.addEventListener("click", (e) => { if (e.target === egg) fechar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });

  // logo: clique normal volta à Teoria; 5 cliques rápidos abrem o easter-egg
  let cliques = 0, ultimo = 0;
  document.getElementById("logo").addEventListener("click", () => {
    const agora = performance.now();
    cliques = (agora - ultimo < 1200) ? cliques + 1 : 1;
    ultimo = agora;
    if (cliques >= 5) { cliques = 0; abrir(); return; }
    showSection("teoria");
  });
}

// ---- Redesenho responsivo (debounce) --------------------------------------
let _resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (state.secao === "simulador") redrawNivel();
  }, 180);
});
