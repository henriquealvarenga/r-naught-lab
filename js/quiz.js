// ============================================================================
// quiz.js  ·  [ ~ banco de itens conceituais ]
// Perguntas de múltipla escolha exibidas entre as rodadas, com correção
// explicativa (igual ao linear-regression-lab).
// ============================================================================

const QUIZ = [
  {
    q: "O que significa R₀ = 3?",
    opcoes: [
      "Cada caso infecta, em média, 3 pessoas numa população totalmente suscetível",
      "A doença dura 3 dias",
      "3% da população será infectada",
      "São necessários 3 casos para iniciar um surto",
    ],
    correta: 0,
    explica: "R₀ é o número médio de infecções secundárias geradas por um caso quando toda a população é suscetível.",
  },
  {
    q: "Qual a diferença entre R₀ e R_t?",
    opcoes: [
      "São a mesma coisa",
      "R₀ é o potencial inicial; R_t é o R efetivo ao longo do tempo, considerando os já imunes",
      "R_t só existe para vírus",
      "R₀ muda a cada dia e R_t é fixo",
    ],
    correta: 1,
    explica: "R_t = R₀ · (S/N). Conforme S cai (mais imunes), R_t diminui; quando R_t < 1, a epidemia recua.",
  },
  {
    q: "Uma doença com R₀ = 4 exige que fração da população esteja imune para conter a transmissão?",
    opcoes: ["25%", "50%", "75%", "100%"],
    correta: 2,
    explica: "Limiar de imunidade de rebanho = 1 − 1/R₀ = 1 − 1/4 = 0,75 (75%).",
  },
  {
    q: "Por que o crescimento exponencial 'puro' não dura para sempre numa epidemia real?",
    opcoes: [
      "Porque o vírus enfraquece sozinho",
      "Porque os suscetíveis se esgotam, reduzindo novas infecções (a curva satura)",
      "Porque R₀ sempre vira zero",
      "Porque o clima muda",
    ],
    correta: 1,
    explica: "No SIR, à medida que S diminui, β·S·I/N cai. A curva atinge um pico (onde R_t = 1) e depois recua.",
  },
  {
    q: "No modelo SIR, o que representa γ (gama)?",
    opcoes: [
      "A taxa de contato",
      "A taxa de recuperação (γ = 1/período infeccioso)",
      "O número de mortes",
      "A população total",
    ],
    correta: 1,
    explica: "γ = 1/D. Junto com β, define R₀ = β/γ. Quanto maior o período infeccioso D, menor o γ.",
  },
  {
    q: "Se R₀ < 1, o que acontece com o surto?",
    opcoes: [
      "Cresce exponencialmente",
      "Estabiliza para sempre",
      "Tende a desaparecer (cada caso gera menos de 1 novo caso)",
      "Dobra a cada ciclo",
    ],
    correta: 2,
    explica: "Com R₀ < 1, cada geração é menor que a anterior; a cadeia de transmissão se extingue.",
  },
];

// Sorteia uma pergunta ainda não usada (para variar entre rodadas).
function sorteiaQuiz(usadas) {
  const disponiveis = QUIZ.map((_, i) => i).filter((i) => !usadas.includes(i));
  const pool = disponiveis.length ? disponiveis : QUIZ.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}
