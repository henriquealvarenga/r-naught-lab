/**
 * metrics.js
 * -----------------------------------------------------------------------------
 * Metricas epidemiologicas derivadas da serie temporal e do estado. Puro.
 *
 * Inclui o R efetivo (Rt), tamanho final da epidemia (final size), pico e
 * limiar de imunidade de rebanho — todas usadas tanto pela UI quanto pelos
 * testes de sanidade cientifica.
 */

/**
 * Limiar de imunidade de rebanho para um dado R0: 1 - 1/R0.
 */
export function herdImmunityThreshold(R0) {
  return R0 > 1 ? 1 - 1 / R0 : 0;
}

/**
 * R efetivo instantaneo de uma cidade.
 *   Rt = R0_local * (S/N)
 * onde R0_local ja incorpora densidade, saneamento e intervencoes vigentes.
 * @param {number} R0Local  R0 efetivo local (betaEff/gamma)
 * @param {number} S        suscetiveis
 * @param {number} N        populacao viva
 */
export function effectiveR(R0Local, S, N) {
  return N > 0 ? R0Local * (S / N) : 0;
}

/**
 * Tamanho final teorico da epidemia (fracao infectada) resolvendo
 *   z = 1 - exp(-R0 * z)
 * por iteracao de ponto fixo. Usado como referencia de validacao.
 */
export function finalSizeTheory(R0, iters = 200) {
  if (R0 <= 1) return 0;
  let z = 0.5;
  for (let i = 0; i < iters; i++) {
    z = 1 - Math.exp(-R0 * z);
  }
  return z;
}

/**
 * Analisa uma serie temporal agregada e devolve indicadores de pico.
 * @param {Array<{day:number, I:number, H:number, D:number}>} series
 */
export function summarizeEpidemic(series) {
  let peakI = 0, peakIDay = 0, peakH = 0, peakHDay = 0;
  for (const s of series) {
    if (s.I > peakI) { peakI = s.I; peakIDay = s.day; }
    if (s.H > peakH) { peakH = s.H; peakHDay = s.day; }
  }
  const last = series[series.length - 1] || { D: 0 };
  return {
    peakInfectious: peakI,
    peakInfectiousDay: peakIDay,
    peakHospitalized: peakH,
    peakHospitalizedDay: peakHDay,
    totalDeaths: last.D,
  };
}
