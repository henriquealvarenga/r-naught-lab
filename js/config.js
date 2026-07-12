// ============================================================================
// config.js  ·  Parâmetros ajustáveis num só lugar.
// Centraliza as constantes "afináveis" do app (pontuação, cronômetro, chaves
// de armazenamento). A ideia é que ajustar o jogo não exija caçar números
// mágicos espalhados pelos módulos.
// ============================================================================

// ---- Persistência ----------------------------------------------------------
export const STORAGE_BEST_KEY = "rnaught_best"; // recorde salvo no localStorage

// ---- Pontuação dos desafios ------------------------------------------------
// OBS: a Parte 3 vai reunificar a pontuação em torno de uma margem de acerto
// (MARGEM_ACERTO). Por ora, apenas centralizamos os valores já em uso.
export const SCORING = {
  guessR0Penalidade: 60,  // pontos perdidos por unidade de erro no R₀
  herdPenalidade: 2.5,    // pontos perdidos por ponto percentual de erro
  bonusTempoMax: 30,      // bônus máximo por rapidez (∝ tempo restante)
  quizAcerto: 20,         // pontos por acerto no quiz entre rodadas
};

// ---- Cronômetro ------------------------------------------------------------
export const TIMER_TICK_MS = 100; // resolução do cronômetro (ms por tique)
export const TIMER_LOW_S = 5;     // abaixo disso, o timer entra em estado "acabando"
