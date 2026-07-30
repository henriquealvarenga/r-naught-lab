/**
 * model.js
 * -----------------------------------------------------------------------------
 * Definicao do modelo SEIHRD com metapopulacao. FUNCAO PURA: dado um estado e
 * um contexto de parametros resolvidos, devolve as derivadas dy/dt. Nao toca
 * DOM, nao guarda estado, nao chama Math.random. Isso a torna trivialmente
 * testavel (ver tests/engine.test.mjs).
 *
 * Compartimentos por cidade i:
 *   S -> E -> I -> {H, R}
 *   H -> {R, D}
 *
 * Forca de infeccao (com saneamento, contato, intervencoes e importacao):
 *   betaEff_i = betaBase * contato_i * (1 - k * w_i) * intervencaoBeta_i
 *   lambda_i  = betaEff_i * ( prev_i + coupling * Sum_j M_ij * mobMult * prev_j )
 *
 * onde prev_i = I_i / N_i (prevalencia de infecciosos vivos).
 */

import { COMPARTMENTS as C, N_COMPARTMENTS } from '../config/constants.js';

/**
 * Deriva as taxas internas do patogeno a partir de parametros clinicos.
 * @param {object} p  { R0, latentPeriod, infectiousPeriod, hospRate, ifr, hospStay }
 * @returns {object}  taxas resolvidas para o modelo
 */
export function derivePathogenRates(p) {
  const sigma = 1 / p.latentPeriod;         // E -> I
  const gamma = 1 / p.infectiousPeriod;     // saida de I
  const betaBase = p.R0 * gamma;            // R0 = beta / gamma

  // IFR = hospRate * (fracao de hospitalizados que morrem)
  // => fracao de morte no hospital = ifr / hospRate  (requer hospRate >= ifr)
  const fatalityInHospital = Math.min(1, p.ifr / Math.max(p.hospRate, 1e-9));
  const hospExit = 1 / p.hospStay;          // saida total de H por dia
  const deltaH = fatalityInHospital * hospExit; // H -> D
  const rho = (1 - fatalityInHospital) * hospExit; // H -> R

  return { sigma, gamma, betaBase, deltaH, rho, hospRate: p.hospRate };
}

/**
 * Calcula dy/dt para todo o vetor de metapopulacao.
 *
 * @param {Float64Array} y            estado atual (plano)
 * @param {number} t                  tempo (dias) — usado pelas intervencoes
 * @param {object} ctx                contexto resolvido (ver simulation.js)
 * @param {Float64Array} dy           buffer de saida (mesmo tamanho de y)
 * @returns {Float64Array} dy
 */
export function derivatives(y, t, ctx, dy) {
  const n = ctx.nCities;
  const { betaBase, sigma, gamma, hospRate, deltaH, rho } = ctx.rates;
  const k = ctx.sanitationSensitivity;
  const coupling = ctx.coupling;

  // Modificadores dependentes do tempo (intervencoes).
  const mod = ctx.interventions.resolveAt(t); // { betaMult:[], mobMult:number, vaxRate:[] }

  // 1) Pre-calcula populacao viva e prevalencia por cidade.
  const prev = ctx._prevBuffer;   // buffers reutilizados p/ evitar alocacao no loop quente
  const alive = ctx._aliveBuffer;
  for (let i = 0; i < n; i++) {
    const o = i * N_COMPARTMENTS;
    const N = y[o + C.S] + y[o + C.E] + y[o + C.I] + y[o + C.H] + y[o + C.R];
    alive[i] = N;
    prev[i] = N > 0 ? y[o + C.I] / N : 0;
  }

  // 2) Derivadas por cidade.
  for (let i = 0; i < n; i++) {
    const o = i * N_COMPARTMENTS;
    const S = y[o + C.S], E = y[o + C.E], I = y[o + C.I], H = y[o + C.H];

    // Importacao de infeccao via mobilidade (linha i da matriz M).
    let imported = 0;
    const rowBase = i * n;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const m = ctx.mobility[rowBase + j];
      if (m !== 0) imported += m * mod.mobMult * prev[j];
    }

    // Saneamento efetivo = base da cidade + eventual reforco emergencial (intervencao).
    const wEff = Math.min(1, ctx.sanitationLevel[i] + mod.sanitationBoost[i]);

    const betaEff =
      betaBase *
      ctx.contactFactor[i] *
      (1 - k * wEff) *
      mod.betaMult[i];

    const lambda = betaEff * (prev[i] + coupling * imported);

    // gamma efetivo: isolar casos (testar-rastrear-isolar) encurta o periodo infeccioso.
    const gammaEff = gamma * mod.gammaMult[i];

    const newInf = lambda * S;
    const vax = mod.vaxRate[i] * S;          // S -> R por vacinacao
    const EtoI = sigma * E;
    const Iout = gammaEff * I;
    const ItoH = hospRate * Iout;
    const ItoR = (1 - hospRate) * Iout;

    // Colapso hospitalar: excesso acima da capacidade efetiva morre a taxa extra.
    // A capacidade pode ser expandida no tempo (intervencao 'beds').
    const capEff = ctx.capacity[i] * mod.capacityMult[i];
    const overflow = ctx.overflowMortality * Math.max(0, H - capEff);
    const Hdeath = deltaH * H + overflow;
    const Hrecover = rho * H;

    dy[o + C.S] = -newInf - vax;
    dy[o + C.E] = newInf - EtoI;
    dy[o + C.I] = EtoI - Iout;
    dy[o + C.H] = ItoH - Hrecover - Hdeath;
    dy[o + C.R] = ItoR + Hrecover + vax;
    dy[o + C.D] = Hdeath;
  }

  return dy;
}
