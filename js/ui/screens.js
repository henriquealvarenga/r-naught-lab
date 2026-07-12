// ============================================================================
// ui/screens.js  ·  [ ~ roteador de UI ]
// Troca de seções (topo) e de telas do jogo. Também o toggle de nível do
// simulador. Redesenha os gráficos quando a seção fica visível (a largura só
// é mensurável com o contêiner exibido).
// ============================================================================

import { state } from "../core/state.js";
import { atualizarN1, atualizarN2 } from "./sim.js";

export function showSection(sec) {
  state.secao = sec;
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  const alvo = document.getElementById("sec-" + sec);
  if (alvo) alvo.classList.add("active");
  document.querySelectorAll("#nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.sec === sec));
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Redesenha o simulador ao entrar (largura correta do contêiner).
  if (sec === "simulador") redrawNivel();
}

function setNivel(n) {
  state.nivel = n;
  document.getElementById("nivel1").classList.toggle("hidden", n !== 1);
  document.getElementById("nivel2").classList.toggle("hidden", n !== 2);
  document.querySelectorAll("#level-toggle button").forEach((b) =>
    b.classList.toggle("active", +b.dataset.nivel === n));
  redrawNivel();
}

export function redrawNivel() {
  if (state.nivel === 1) atualizarN1(); else atualizarN2();
}

// ---- Telas do jogo --------------------------------------------------------
export function showScreen(tela) {
  state.jogo.tela = tela;
  document.querySelectorAll("#sec-desafios .screen").forEach((s) => s.classList.remove("active"));
  const alvo = document.getElementById("screen-" + tela);
  if (alvo) alvo.classList.add("active");
}

// ---- Wiring da navegação (chamado no main.js) -----------------------------
export function initNav() {
  document.querySelectorAll("#nav button").forEach((b) =>
    b.addEventListener("click", () => showSection(b.dataset.sec)));

  document.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => showSection(b.dataset.goto)));

  document.querySelectorAll("#level-toggle button").forEach((b) =>
    b.addEventListener("click", () => setNivel(+b.dataset.nivel)));
}
