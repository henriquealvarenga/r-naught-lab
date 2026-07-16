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

// ---- Sons (Parte 2) --------------------------------------------------------
// Sons sintetizados via Web Audio API (sem arquivos). Veja js/audio/sfx.js.
export const SOM = {
  habilitadoPorPadrao: true,     // som ligado por padrão (usuário pode mutar)
  chaveStorage: "rnaught_som",   // preferência de som salva no localStorage
  volume: 0.22,                  // volume mestre (0..1) — abaixe se ficar alto
};

// ---- Margem de acerto dos desafios (Parte 3) -------------------------------
// Tolerância RELATIVA para considerar a estimativa "correta".
//   0.20 = ±20%.  Ex.: se o R₀ certo é 3, acerta quem chutar entre 2,4 e 3,6.
// >>> Este é o parâmetro para afrouxar/apertar a dificuldade. Troque só aqui. <<<
export const MARGEM_ACERTO = 0.20;

// Forma da pontuação em torno da margem (ajuste fino, opcional):
export const PONTOS_ACERTO_MAX = 100; // pontos no alvo exato
export const PONTOS_ACERTO_MIN = 60;  // pontos exatamente na borda da faixa de acerto
export const FATOR_ERRO_ZERO = 3;     // a pontuação zera quando o erro atinge MARGEM_ACERTO × este fator
                                      // (com 0.20 e 3 → zera em 60% de erro relativo)
