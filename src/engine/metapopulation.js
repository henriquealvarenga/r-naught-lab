/**
 * metapopulation.js
 * -----------------------------------------------------------------------------
 * Constroi a matriz de mobilidade M (nCities x nCities, armazenada plana) e o
 * fator de contato por cidade a partir da densidade. Isola a "geografia" do
 * modelo, para que trocar a topologia de cidades nao exija tocar em model.js.
 *
 * M_ij = fluxo de infeccao importada para a cidade i vinda de j.
 * Aqui usamos um acoplamento gravitacional simplificado:
 *   M_ij = baseCoupling * conn_i * conn_j        (i != j), 0 na diagonal.
 * `conn` (connectivity 0..1) vem dos dados da cidade (transporte/mobilidade).
 */

import { REFERENCE_DENSITY, DENSITY_CONTACT_EXPONENT } from '../config/constants.js';

/**
 * Fator de contato sublinear em funcao da densidade urbana efetiva.
 * densidade de referencia -> 1.0; densidade maior -> > 1.0.
 */
export function contactFactorFromDensity(density) {
  return Math.pow(density / REFERENCE_DENSITY, DENSITY_CONTACT_EXPONENT);
}

/**
 * Monta a matriz de mobilidade plana a partir da conectividade de cada cidade.
 * @param {number[]} connectivity  conn[i] em [0,1]
 * @param {number} baseCoupling    intensidade global do acoplamento (ex.: 0.05)
 * @returns {Float64Array} matriz nxn (linha-maior)
 */
export function buildMobilityMatrix(connectivity, baseCoupling = 0.05) {
  const n = connectivity.length;
  const M = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      M[i * n + j] = baseCoupling * connectivity[i] * connectivity[j];
    }
  }
  return M;
}
