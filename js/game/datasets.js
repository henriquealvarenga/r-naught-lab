// ============================================================================
// game/datasets.js  ·  [ ~ dados.R ]
// Dados fixos: R₀ de doenças reais (easter-egg + desafios) e a configuração
// das rodadas de gamificação.
// ============================================================================

import { serieExponencial, limiarRebanho, modeloSIR } from "../models/epi.js";

// R₀ típicos (estimativas de literatura; variam por contexto/estudo).
export const DOENCAS = [
  { nome: "Sarampo",            r0: 15,  faixa: "12–18" },
  { nome: "Coqueluche",         r0: 13,  faixa: "12–17" },
  { nome: "Difteria",           r0: 6,   faixa: "6–7" },
  { nome: "Rubéola",            r0: 6,   faixa: "5–7" },
  { nome: "Varíola",            r0: 5,   faixa: "3.5–6" },
  { nome: "Poliomielite",       r0: 5,   faixa: "5–7" },
  { nome: "Caxumba",            r0: 4.5, faixa: "4–7" },
  { nome: "COVID-19 (ancestral)", r0: 2.5, faixa: "2–3" },
  { nome: "SARS (2003)",        r0: 2.5, faixa: "2–4" },
  { nome: "Ebola",              r0: 1.8, faixa: "1.5–2.5" },
  { nome: "Gripe (sazonal)",    r0: 1.3, faixa: "1.2–1.4" },
];

export const R0_MAX_DOENCA = 18; // para escalar as barras do easter-egg

// Configuração das rodadas. Cada rodada define tipo, título, dificuldade,
// tempo e um gerador do "enunciado" (chamado a cada partida).
// OBS: usa Math.random livremente — é JS de navegador, não workflow.
export const RODADAS = [
  {
    id: "guessR0",
    titulo: "Adivinhe o R₀",
    desc: "Observe a curva e estime o R₀ que a gerou.",
    estrelas: "⭐☆☆",
    tempo: 25,
    gera() {
      const alvos = [1.5, 2, 2.5, 3, 4, 5];
      const R0 = alvos[Math.floor(Math.random() * alvos.length)];
      const ciclos = 8, i0 = 1;
      return { R0, ciclos, i0, serie: serieExponencial(R0, ciclos, i0).inc };
    },
  },
  {
    id: "predictCases",
    titulo: "Preveja o próximo ciclo",
    desc: "Dado i₀ e R₀, quantos casos no ciclo N?",
    estrelas: "⭐⭐☆",
    tempo: 25,
    gera() {
      const R0 = [2, 3, 4][Math.floor(Math.random() * 3)];
      const i0 = [1, 2, 5][Math.floor(Math.random() * 3)];
      const alvo = 3 + Math.floor(Math.random() * 3); // ciclo 3..5
      const resposta = i0 * Math.pow(R0, alvo);
      return { R0, i0, alvo, resposta };
    },
  },
  {
    id: "herd",
    titulo: "Imunidade de rebanho",
    desc: "Que % da população precisa estar imune?",
    estrelas: "⭐⭐☆",
    tempo: 20,
    gera() {
      const d = DOENCAS[Math.floor(Math.random() * DOENCAS.length)];
      return { doenca: d.nome, R0: d.r0, resposta: limiarRebanho(d.r0) };
    },
  },
  {
    id: "peak",
    titulo: "Quem satura primeiro?",
    desc: "Dois R₀ diferentes: qual atinge o pico mais alto?",
    estrelas: "⭐⭐⭐",
    tempo: 20,
    gera() {
      let a = 1.5 + Math.random() * 1.5;      // 1.5..3
      let b = a + 1 + Math.random() * 2;      // sempre maior
      a = Math.round(a * 10) / 10; b = Math.round(b * 10) / 10;
      const simA = modeloSIR({ R0: a, D: 7, N: 100000, I0: 10, dias: 160 });
      const simB = modeloSIR({ R0: b, D: 7, N: 100000, I0: 10, dias: 160 });
      // resposta correta: o de maior pico (B, por construção, mas confirmamos)
      const correta = simA.metricas.picoI >= simB.metricas.picoI ? "A" : "B";
      return { a, b, correta, picoA: simA.metricas.picoI, picoB: simB.metricas.picoI };
    },
  },
];
