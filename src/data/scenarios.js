/**
 * scenarios.js
 * -----------------------------------------------------------------------------
 * Cenarios guiados (missoes). Cada cenario define uma configuracao inicial, um
 * objetivo pedagogico e uma funcao `evaluate(result)` que decide se o aluno
 * atingiu a meta. Sao dados/declarativos: adicionar cenarios NAO exige tocar no
 * motor nem na UI (basta acrescentar aqui).
 *
 * Cenarios iniciais implementados: 1 (achatar a curva), 2 (saneamento importa),
 * 5 (transmissibilidade vs severidade). 3 e 4 ficam para a proxima fase.
 */

import { cloneCities } from './cities.js';
import { clonePathogen } from './pathogens.js';

/** Taxa de ataque agregada (fracao da populacao que foi infectada). */
function attackRate(result) {
  const last = result.aggregate[result.aggregate.length - 1];
  const pop0 = result.aggregate[0].N;
  return pop0 > 0 ? (last.R + last.D) / pop0 : 0;
}

/** Pico de ocupacao hospitalar (max sobre cidades e tempo). */
function peakOccupancy(result) {
  let peak = 0;
  for (const city of result.perCity) {
    for (const p of city.series) if (p.hospOccupancy > peak) peak = p.hospOccupancy;
  }
  return peak;
}

export const SCENARIOS = [
  {
    id: 'flatten_the_curve',
    titleKey: 'scenario.flatten.title',
    descKey: 'scenario.flatten.desc',
    objectiveKey: 'scenario.flatten.objective',
    allowedInterventions: ['distancing', 'masks'],
    buildConfig() {
      return {
        cities: cloneCities(),
        pathogen: clonePathogen('resp_moderate'),
        interventions: [], // o aluno adiciona
        seed: { city: 0, infections: 20 },
        horizonDays: 240,
      };
    },
    // Sucesso: manter ocupacao hospitalar abaixo de 100% em toda parte.
    evaluate(result) {
      const peak = peakOccupancy(result);
      return {
        passed: peak < 1.0,
        metricKey: 'metric.peakOccupancy',
        value: peak,
      };
    },
  },

  {
    id: 'sanitation_matters',
    titleKey: 'scenario.sanitation.title',
    descKey: 'scenario.sanitation.desc',
    objectiveKey: 'scenario.sanitation.objective',
    allowedInterventions: ['sanitation'],
    // Roda o MESMO patogeno hidrico; a graca e comparar A (saneamento alto)
    // com C (saneamento baixo). A UI destaca as duas curvas.
    buildConfig() {
      return {
        cities: cloneCities(),
        pathogen: clonePathogen('waterborne'),
        interventions: [],
        seed: { city: 2, infections: 20 }, // semeia na Cidade C (saneamento baixo)
        horizonDays: 200,
      };
    },
    // "Sucesso" aqui e comparativo: mostra que a Cidade C sofre bem mais.
    evaluate(result) {
      const cityA = result.perCity.find((c) => c.id === 'A');
      const cityC = result.perCity.find((c) => c.id === 'C');
      const finalA = cityA.series[cityA.series.length - 1];
      const finalC = cityC.series[cityC.series.length - 1];
      const arA = (finalA.R + finalA.D) / (finalA.N + finalA.D);
      const arC = (finalC.R + finalC.D) / (finalC.N + finalC.D);
      return {
        passed: arC > arA, // esperado: cidade com saneamento baixo sofre mais
        metricKey: 'metric.attackRateGap',
        value: arC - arA,
      };
    },
  },

  {
    id: 'transmissibility_vs_severity',
    titleKey: 'scenario.tradeoff.title',
    descKey: 'scenario.tradeoff.desc',
    objectiveKey: 'scenario.tradeoff.objective',
    allowedInterventions: ['distancing', 'masks', 'vaccination'],
    // Preset A: R0 alto, letalidade baixa. O aluno pode trocar para o preset
    // de R0 baixo/letalidade alta e comparar mortes vs velocidade.
    buildConfig() {
      return {
        cities: cloneCities(),
        pathogen: clonePathogen('resp_high_transmission'),
        interventions: [],
        seed: { city: 0, infections: 20 },
        horizonDays: 240,
        compareWith: 'severe_low_transmission', // dica p/ a UI oferecer a comparacao
      };
    },
    evaluate(result) {
      return {
        passed: true, // cenario exploratorio
        metricKey: 'metric.attackRate',
        value: attackRate(result),
      };
    },
  },
];

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}

export { attackRate, peakOccupancy };
