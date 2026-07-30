/**
 * simulation.js
 * -----------------------------------------------------------------------------
 * Orquestrador do motor: monta o contexto a partir de um `config` declarativo,
 * roda o loop de integracao e devolve series temporais + metricas. Esta e a
 * UNICA porta de entrada que a UI precisa conhecer do motor.
 *
 *   import { runSimulation } from './engine/simulation.js';
 *   const result = runSimulation(config);
 */

import {
  DEFAULT_DT, DEFAULT_HORIZON_DAYS, GLOBAL_COUPLING, OVERFLOW_MORTALITY,
  TRANSMISSION_ROUTES, COMPARTMENTS as C, N_COMPARTMENTS,
} from '../config/constants.js';
import { createStateVector } from './compartments.js';
import { derivePathogenRates, derivatives } from './model.js';
import { createRK4 } from './integrator.js';
import { contactFactorFromDensity, buildMobilityMatrix } from './metapopulation.js';
import { createInterventions } from './interventions.js';
import { effectiveR, herdImmunityThreshold, finalSizeTheory, summarizeEpidemic } from './metrics.js';

/**
 * Monta o contexto imutavel de simulacao a partir do config.
 * Exportado para permitir testes unitarios do contexto.
 */
export function buildContext(config) {
  const cities = config.cities;
  const n = cities.length;

  const route = TRANSMISSION_ROUTES[config.pathogen.route] || TRANSMISSION_ROUTES.respiratory;
  const rates = derivePathogenRates(config.pathogen);

  const contactFactor = new Float64Array(n);
  const sanitationLevel = new Float64Array(n);
  const capacity = new Float64Array(n);
  const connectivity = new Array(n);

  for (let i = 0; i < n; i++) {
    contactFactor[i] = contactFactorFromDensity(cities[i].density);
    sanitationLevel[i] = cities[i].sanitation;
    capacity[i] = cities[i].hospitalCapacity;
    connectivity[i] = cities[i].connectivity;
  }

  const mobility = buildMobilityMatrix(connectivity, config.baseCoupling ?? 0.05);
  const interventions = createInterventions(config.interventions, n);

  return {
    nCities: n,
    rates,
    sanitationSensitivity: route.sanitationSensitivity,
    contactFactor,
    sanitationLevel,
    capacity,
    mobility,
    interventions,
    coupling: config.coupling ?? GLOBAL_COUPLING,
    overflowMortality: config.overflowMortality ?? OVERFLOW_MORTALITY,
    _prevBuffer: new Float64Array(n),
    _aliveBuffer: new Float64Array(n),
  };
}

/** Estado inicial: todos suscetiveis, exceto a semente de infecciosos. */
function initialState(config) {
  const n = config.cities.length;
  const y = createStateVector(n);
  for (let i = 0; i < n; i++) {
    y[i * N_COMPARTMENTS + C.S] = config.cities[i].population;
  }
  const seed = config.seed || { city: 0, infections: 10 };
  const o = seed.city * N_COMPARTMENTS;
  y[o + C.S] -= seed.infections;
  y[o + C.I] += seed.infections;
  return y;
}

/**
 * Roda a simulacao completa.
 * @param {object} config
 * @returns {object} resultado com series por cidade, agregado e metricas
 */
export function runSimulation(config) {
  const ctx = buildContext(config);
  const n = ctx.nCities;
  const dt = config.dt ?? DEFAULT_DT;
  const horizon = config.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const stepsPerDay = Math.round(1 / dt);

  const y = initialState(config);
  const size = y.length;
  const rk4 = createRK4(size);
  const dy = new Float64Array(size);
  const f = (state, t, out) => derivatives(state, t, ctx, out);

  const perCity = config.cities.map((c) => ({ id: c.id, name: c.name, series: [] }));
  const aggregate = [];

  const record = (day) => {
    let aggS = 0, aggE = 0, aggI = 0, aggH = 0, aggR = 0, aggD = 0, aggN = 0;
    const mod = ctx.interventions.resolveAt(day);
    for (let i = 0; i < n; i++) {
      const o = i * N_COMPARTMENTS;
      const S = y[o + C.S], E = y[o + C.E], I = y[o + C.I], H = y[o + C.H], R = y[o + C.R], D = y[o + C.D];
      const N = S + E + I + H + R;

      // R0 efetivo local (para Rt) com intervencoes vigentes.
      const wEff = Math.min(1, ctx.sanitationLevel[i] + mod.sanitationBoost[i]);
      const betaEff = ctx.rates.betaBase * ctx.contactFactor[i] * (1 - ctx.sanitationSensitivity * wEff) * mod.betaMult[i];
      const gammaEff = ctx.rates.gamma * mod.gammaMult[i];
      const R0Local = betaEff / gammaEff;
      const capEff = ctx.capacity[i] * mod.capacityMult[i];

      perCity[i].series.push({
        day, S, E, I, H, R, D, N,
        Rt: effectiveR(R0Local, S, N),
        hospOccupancy: capEff > 0 ? H / capEff : 0,
        capacity: capEff,
      });
      aggS += S; aggE += E; aggI += I; aggH += H; aggR += R; aggD += D; aggN += N;
    }
    aggregate.push({ day, S: aggS, E: aggE, I: aggI, H: aggH, R: aggR, D: aggD, N: aggN });
  };

  record(0);
  for (let day = 1; day <= horizon; day++) {
    let t = day - 1;
    for (let s = 0; s < stepsPerDay; s++) {
      rk4.step(y, t, dt, f);
      t += dt;
    }
    record(day);
  }

  return {
    perCity,
    aggregate,
    summary: summarizeEpidemic(aggregate),
    meta: {
      rates: ctx.rates,
      herdThreshold: herdImmunityThreshold(config.pathogen.R0),
      finalSizeTheory: finalSizeTheory(config.pathogen.R0),
      route: config.pathogen.route,
    },
  };
}
