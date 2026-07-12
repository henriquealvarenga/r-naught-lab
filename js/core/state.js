// ============================================================================
// core/state.js  ·  [ ~ environment global do R ]
// Objeto único e mutável compartilhado por todos os módulos (mesmo padrão do
// linear-regression-lab). Sem setters/imutabilidade: os módulos importam
// `state` e leem/escrevem `state.*` diretamente (objeto compartilhado por
// referência entre os imports).
// ============================================================================

export const state = {
  // ---- Navegação --------------------------------------------------------
  secao: "teoria",        // seção ativa: teoria | simulador | desafios | como-usar | creditos
  nivel: 1,               // simulador: 1 (exponencial) | 2 (SIR)

  // ---- Nível 1 (exponencial) -------------------------------------------
  n1: {
    ciclos: 12,
    i0: 1,
    R0_A: 1.5,
    R0_B: 3.0,
    tipoSerie: "acum",    // "acum" (acumulado) | "inc" (no ciclo)
    logY: false,
  },

  // ---- Nível 2 (SIR) ----------------------------------------------------
  n2: {
    R0: 2.5,
    D: 7,                 // período infeccioso (dias)
    N: 100000,            // população
    I0: 10,               // infectados iniciais
    dias: 160,            // horizonte
    mostrarExp: true,     // overlay exponencial tracejado
  },

  // ---- Gamificação ------------------------------------------------------
  jogo: {
    tela: "home",         // home | briefing | play | result | quiz | final
    rodada: 0,            // índice da rodada atual
    pontos: 0,
    respostas: [],        // histórico por rodada
    timer: null,          // id do setInterval
    tempoRestante: 0,
    palpite: null,        // valor corrente do controle do desafio
  },

  // ---- Cache / lifecycle ------------------------------------------------
  _dadosN1: null,         // último resultado de compararCenarios()
  _dadosN2: null,         // último resultado de modeloSIR()
  _initialized: false,    // guarda para D3 iniciar só uma vez
};
