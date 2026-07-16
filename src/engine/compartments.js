/**
 * compartments.js
 * -----------------------------------------------------------------------------
 * Utilitarios para manipular o vetor de estado SEIHRD de uma metapopulacao.
 *
 * O estado completo e um Float64Array plano de comprimento (N_COMPARTMENTS * nCities).
 * Cidade c ocupa os indices [c*6 .. c*6+5] = [S,E,I,H,R,D].
 *
 * Manter esta camada "burra" (so leitura/escrita de indices) mantem o modelo
 * (model.js) e o integrador (integrator.js) desacoplados da representacao.
 */

import { COMPARTMENTS, N_COMPARTMENTS } from '../config/constants.js';

/** Cria um vetor de estado zerado para nCities cidades. */
export function createStateVector(nCities) {
  return new Float64Array(nCities * N_COMPARTMENTS);
}

/** Indice base da cidade c no vetor plano. */
export function cityOffset(c) {
  return c * N_COMPARTMENTS;
}

/** Le um compartimento (ex.: COMPARTMENTS.I) da cidade c. */
export function get(state, c, compartment) {
  return state[cityOffset(c) + compartment];
}

/** Escreve um compartimento da cidade c. */
export function set(state, c, compartment, value) {
  state[cityOffset(c) + compartment] = value;
}

/** Populacao viva da cidade c (S+E+I+H+R, exclui D). */
export function alivePopulation(state, c) {
  const o = cityOffset(c);
  return (
    state[o + COMPARTMENTS.S] +
    state[o + COMPARTMENTS.E] +
    state[o + COMPARTMENTS.I] +
    state[o + COMPARTMENTS.H] +
    state[o + COMPARTMENTS.R]
  );
}

/** Populacao total da cidade c incluindo obitos (deve ser conservada). */
export function totalPopulation(state, c) {
  return alivePopulation(state, c) + state[cityOffset(c) + COMPARTMENTS.D];
}

/** Prevalencia de infecciosos (I/N_vivos) da cidade c. Robusto a N=0. */
export function prevalence(state, c) {
  const n = alivePopulation(state, c);
  return n > 0 ? state[cityOffset(c) + COMPARTMENTS.I] / n : 0;
}

/**
 * Converte o vetor plano em um objeto legivel por cidade — usado pela UI e
 * pelos logs de debug. Nao usar no loop quente de integracao.
 */
export function snapshot(state, nCities) {
  const out = [];
  for (let c = 0; c < nCities; c++) {
    const o = cityOffset(c);
    out.push({
      S: state[o + COMPARTMENTS.S],
      E: state[o + COMPARTMENTS.E],
      I: state[o + COMPARTMENTS.I],
      H: state[o + COMPARTMENTS.H],
      R: state[o + COMPARTMENTS.R],
      D: state[o + COMPARTMENTS.D],
      N: alivePopulation(state, c),
    });
  }
  return out;
}
