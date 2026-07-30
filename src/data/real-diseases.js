/**
 * data/real-diseases.js
 * -----------------------------------------------------------------------------
 * R0 tipicos de doencas REAIS (estimativas de literatura; variam por
 * contexto/estudo). Dado curado, salvo do app classico (antes em
 * classic/js/game/datasets.js) ao remover aquele app. Reservado para o
 * easter-egg / desafios de R0 previstos no ROADMAP e no PLAY_MODE_DESIGN.
 *
 * Estes sao nomes de doencas reais e PUBLICOS (diferente dos perfis A/B/C de
 * cidades, que sao anonimizados). O MODEL_MATH.md ja cita faixas como "sarampo
 * 12-18". Nomes vem bilingues aqui; ao ligar na UI, migre para t() se preferir.
 */

export const REAL_DISEASES = [
  { id: 'measles',    r0: 15,  range: '12-18',  name: { pt: 'Sarampo',            en: 'Measles' } },
  { id: 'pertussis',  r0: 13,  range: '12-17',  name: { pt: 'Coqueluche',         en: 'Whooping cough' } },
  { id: 'diphtheria', r0: 6,   range: '6-7',    name: { pt: 'Difteria',           en: 'Diphtheria' } },
  { id: 'rubella',    r0: 6,   range: '5-7',    name: { pt: 'Rubéola',            en: 'Rubella' } },
  { id: 'smallpox',   r0: 5,   range: '3.5-6',  name: { pt: 'Varíola',            en: 'Smallpox' } },
  { id: 'polio',      r0: 5,   range: '5-7',    name: { pt: 'Poliomielite',       en: 'Poliomyelitis' } },
  { id: 'mumps',      r0: 4.5, range: '4-7',    name: { pt: 'Caxumba',            en: 'Mumps' } },
  { id: 'covid',      r0: 2.5, range: '2-3',    name: { pt: 'COVID-19 (ancestral)', en: 'COVID-19 (ancestral)' } },
  { id: 'sars',       r0: 2.5, range: '2-4',    name: { pt: 'SARS (2003)',        en: 'SARS (2003)' } },
  { id: 'ebola',      r0: 1.8, range: '1.5-2.5', name: { pt: 'Ebola',             en: 'Ebola' } },
  { id: 'flu',        r0: 1.3, range: '1.2-1.4', name: { pt: 'Gripe (sazonal)',   en: 'Influenza (seasonal)' } },
];

/** R0 maximo da tabela — util para escalar as barras do easter-egg. */
export const R0_MAX_DISEASE = 18;
