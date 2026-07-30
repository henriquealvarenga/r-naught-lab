/**
 * data/deck.js
 * -----------------------------------------------------------------------------
 * Baralho de intervencoes do Modo Jogo. Cada carta e declarativa e mapeia
 * DIRETO para um tipo do CATALOG do motor (src/engine/interventions.js), de modo
 * que "comprar" uma carta no dia D vira apenas:
 *
 *   { type, value, startDay: D, cities: 'all' }
 *
 * apendado em config.interventions e re-simulado (Opcao A da migracao — ver
 * docs/PLAY_MODE_DESIGN.md §7). Nada de logica de modelo aqui: so custo, icone,
 * chaves de i18n e o par (type, value) que o motor entende.
 *
 * Equivalencias de intensidade (por que estes `value`):
 *   distancing  beta * (1 - v)      v=0.45 -> beta * 0.55
 *   masks       beta * (1 - 0.5 v)  v=0.44 -> beta * 0.78
 *   isolation   gamma * (1 + v)     v=0.40 -> gamma * 1.40 (encurta periodo infeccioso)
 *   sanitation  w += v              v=0.40 -> reforca saneamento (so pesa em rota de k alto)
 *   vaccination vax += v (frac/dia) v=0.012 -> ~1,2%/dia de S -> imunes
 *   beds        capacidade * (1 + v) v=0.50 -> +50% de leitos
 *
 * `unlockAfter` (opcional): dias APOS a deteccao antes de a carta poder ser
 * comprada. So a vacina usa — ver a nota na propria carta.
 */

export const DECK = [
  { id: 'distancing', type: 'distancing', value: 0.45, cost: 35, icon: '🚧',
    labelKey: 'game.deck.distancing.name', descKey: 'game.deck.distancing.desc' },
  { id: 'masks', type: 'masks', value: 0.44, cost: 15, icon: '😷',
    labelKey: 'game.deck.masks.name', descKey: 'game.deck.masks.desc' },
  { id: 'isolation', type: 'isolation', value: 0.40, cost: 25, icon: '🔎',
    labelKey: 'game.deck.isolation.name', descKey: 'game.deck.isolation.desc' },
  { id: 'sanitation', type: 'sanitation', value: 0.40, cost: 20, icon: '🚰',
    labelKey: 'game.deck.sanitation.name', descKey: 'game.deck.sanitation.desc' },
  // Vacina: so a partir de T+60 (60 dias APOS a deteccao). Sem essa trava ela
  // era um "botao de vencer" — 40pt levavam 331k obitos a 0,1k, zerando o resto
  // do baralho, alem de ser irreal (vacina pronta na 2a semana de um surto
  // novo). Travada, sozinha ela chega tarde demais para mudar o desfecho; e
  // somada a medidas que seguram a curva, leva 190k -> 14k. A licao vira
  // "segurar a curva ATE a vacina chegar" — vacina como complemento, nao
  // substituto. O dia 60 casa com a manchete de ensaio clinico ja existente
  // no noticiario (regra 'vtrial' em src/data/news.js).
  { id: 'vaccination', type: 'vaccination', value: 0.012, cost: 40, icon: '💉',
    unlockAfter: 60,
    labelKey: 'game.deck.vaccination.name', descKey: 'game.deck.vaccination.desc' },
  { id: 'beds', type: 'beds', value: 0.5, cost: 30, icon: '🏥',
    labelKey: 'game.deck.beds.name', descKey: 'game.deck.beds.desc' },
];

/** Orcamento inicial de resposta (pontos). */
export const START_BUDGET = 100;

/** Recupera uma carta pelo id. */
export function cardById(id) {
  return DECK.find((c) => c.id === id);
}
