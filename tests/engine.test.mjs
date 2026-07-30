/**
 * engine.test.mjs
 * -----------------------------------------------------------------------------
 * Testes de sanidade CIENTIFICA do motor (rodam em Node, sem DOM). Verificam
 * que o modelo obedece a resultados teoricos conhecidos. Se algum destes
 * quebrar, o motor esta errado — nao a teoria.
 *
 *   node tests/engine.test.mjs      (ou: npm test)
 */

import { runSimulation, buildContext } from '../src/engine/simulation.js';
import { finalSizeTheory, herdImmunityThreshold } from '../src/engine/metrics.js';
import { REFERENCE_DENSITY } from '../src/config/constants.js';

let passed = 0, failed = 0;
function assert(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}  ${detail}`); }
}
function approx(a, b, tol) { return Math.abs(a - b) <= tol; }

/** Config de 1 cidade isolada e bem-misturada (para comparar com a teoria). */
function singleCityConfig(R0) {
  return {
    cities: [{
      id: 'A', labelKey: 'city.A.name', descKey: 'city.A.desc',
      population: 1_000_000,
      density: REFERENCE_DENSITY,   // contactFactor = 1
      sanitation: 0,                // (1 - k*0) = 1  -> betaEff = betaBase
      connectivity: 0,              // sem acoplamento
      hospitalCapacity: 1e9,        // sem colapso
    }],
    pathogen: { route: 'respiratory', R0, latentPeriod: 3, infectiousPeriod: 6, hospRate: 0.06, ifr: 0.008, hospStay: 10 },
    interventions: [],
    seed: { city: 0, infections: 10 },
    horizonDays: 600,
    dt: 0.25,
  };
}

console.log('\n== Testes de sanidade do motor SEIHRD ==\n');

// ---------------------------------------------------------------------------
console.log('[1] Conservacao de populacao');
{
  const r = runSimulation(singleCityConfig(2.5));
  const first = r.aggregate[0].N + r.aggregate[0].D;
  const last = r.aggregate[r.aggregate.length - 1].N + r.aggregate[r.aggregate.length - 1].D;
  assert('populacao total conservada (S+E+I+H+R+D constante)', approx(first, last, 1), `inicio=${first} fim=${last}`);
}

// ---------------------------------------------------------------------------
console.log('[2] Tamanho final vs teoria z = 1 - e^{-R0 z}');
for (const R0 of [1.5, 2.5, 4.0]) {
  const r = runSimulation(singleCityConfig(R0));
  const last = r.aggregate[r.aggregate.length - 1];
  const pop0 = r.aggregate[0].N;
  const attack = (last.R + last.D) / pop0;
  const theory = finalSizeTheory(R0);
  assert(`R0=${R0}: taxa de ataque ${(attack * 100).toFixed(1)}% ~ teoria ${(theory * 100).toFixed(1)}%`,
    approx(attack, theory, 0.02), `dif=${Math.abs(attack - theory).toFixed(4)}`);
}

// ---------------------------------------------------------------------------
console.log('[3] Rt = 1 no pico do TOTAL de infectados (E+I) — identidade exata do SEIR');
{
  // Identidade exata: no pico de P = E+I, dP/dt = 0 => beta*S/N = gamma
  // => R0*(S/N) = 1 => Rt = 1. (O pico de I sozinho fica atrasado pela latencia.)
  const r = runSimulation(singleCityConfig(2.5));
  const agg = r.aggregate;
  let peakDay = 0, peakP = -Infinity;
  for (const d of agg) { const P = d.E + d.I; if (P > peakP) { peakP = P; peakDay = d.day; } }
  const rtAtPeak = r.perCity[0].series.find((p) => p.day === peakDay).Rt;
  assert(`Rt no pico de (E+I) ~ 1 (obtido ${rtAtPeak.toFixed(3)} no dia ${peakDay})`,
    approx(rtAtPeak, 1, 0.02), `Rt=${rtAtPeak.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
console.log('[4] Rt inicial ~ R0 (S/N ~ 1 no dia 0)');
{
  const r = runSimulation(singleCityConfig(2.5));
  const rt0 = r.perCity[0].series[0].Rt;
  assert(`Rt(0) ~ R0=2.5 (obtido ${rt0.toFixed(3)})`, approx(rt0, 2.5, 0.05));
}

// ---------------------------------------------------------------------------
console.log('[5] Limiar de imunidade de rebanho 1 - 1/R0');
{
  assert('R0=2 -> 50%', approx(herdImmunityThreshold(2), 0.5, 1e-9));
  assert('R0=4 -> 75%', approx(herdImmunityThreshold(4), 0.75, 1e-9));
}

// ---------------------------------------------------------------------------
console.log('[6] Saneamento reduz a epidemia em rota fecal-oral, nao em respiratoria');
{
  const base = (route, sanitation) => ({
    cities: [{ id: 'A', labelKey: '', descKey: '', population: 1e6, density: REFERENCE_DENSITY, sanitation, connectivity: 0, hospitalCapacity: 1e9 }],
    pathogen: { route, R0: 2.5, latentPeriod: 3, infectiousPeriod: 6, hospRate: 0.06, ifr: 0.008, hospStay: 10 },
    interventions: [], seed: { city: 0, infections: 10 }, horizonDays: 600,
  });
  const ar = (cfg) => { const r = runSimulation(cfg); const l = r.aggregate.at(-1); return (l.R + l.D) / r.aggregate[0].N; };
  const fecalLow = ar(base('fecal_oral', 0.2));
  const fecalHigh = ar(base('fecal_oral', 0.95));
  const respLow = ar(base('respiratory', 0.2));
  const respHigh = ar(base('respiratory', 0.95));
  assert(`fecal-oral: saneamento alto reduz taxa de ataque (${(fecalLow*100).toFixed(0)}% -> ${(fecalHigh*100).toFixed(0)}%)`, fecalHigh < fecalLow - 0.05);
  assert(`respiratoria: saneamento quase nao muda (${(respLow*100).toFixed(0)}% ~ ${(respHigh*100).toFixed(0)}%)`, Math.abs(respHigh - respLow) < 0.03);
}

// ---------------------------------------------------------------------------
console.log('[7] Metapopulacao: cidade isolada (baixa conectividade) tem pico mais tardio');
{
  const cfg = {
    cities: [
      { id: 'A', labelKey: '', descKey: '', population: 5e6, density: 7500, sanitation: 0.8, connectivity: 1.0, hospitalCapacity: 1e9 },
      { id: 'C', labelKey: '', descKey: '', population: 2e6, density: 5000, sanitation: 0.8, connectivity: 0.2, hospitalCapacity: 1e9 },
    ],
    pathogen: { route: 'respiratory', R0: 2.5, latentPeriod: 3, infectiousPeriod: 6, hospRate: 0.06, ifr: 0.008, hospStay: 10 },
    interventions: [], seed: { city: 0, infections: 50 }, horizonDays: 400, baseCoupling: 0.05,
  };
  const r = runSimulation(cfg);
  const peakDay = (s) => s.reduce((best, p, i, arr) => (p.I > arr[best].I ? i : best), 0);
  const dayA = r.perCity[0].series[peakDay(r.perCity[0].series)].day;
  const dayC = r.perCity[1].series[peakDay(r.perCity[1].series)].day;
  assert(`pico da Cidade C (dia ${dayC}) chega depois da Cidade A (dia ${dayA})`, dayC > dayA);
}

// ---------------------------------------------------------------------------
console.log('[8] Isolar casos (intervencao isolation): conserva populacao e encurta a epidemia');
{
  // Isolar casos = testar-rastrear-isolar: aumenta gamma (encurta periodo infeccioso),
  // reduzindo o R0 efetivo (R0 = beta/gamma) -> menor taxa de ataque final.
  const withIsolation = () => {
    const cfg = singleCityConfig(2.5);
    cfg.interventions = [{ type: 'isolation', value: 0.4, startDay: 0, cities: 'all' }];
    return cfg;
  };
  const rBase = runSimulation(singleCityConfig(2.5));
  const rIso = runSimulation(withIsolation());
  const cons = (r) => {
    const a = r.aggregate[0], b = r.aggregate.at(-1);
    return approx(a.N + a.D, b.N + b.D, 1);
  };
  assert('populacao conservada com isolation ativa', cons(rIso),
    `inicio=${(rIso.aggregate[0].N + rIso.aggregate[0].D).toFixed(0)} fim=${(rIso.aggregate.at(-1).N + rIso.aggregate.at(-1).D).toFixed(0)}`);
  const arBase = (rBase.aggregate.at(-1).R + rBase.aggregate.at(-1).D) / rBase.aggregate[0].N;
  const arIso = (rIso.aggregate.at(-1).R + rIso.aggregate.at(-1).D) / rIso.aggregate[0].N;
  assert(`isolation reduz taxa de ataque (${(arBase * 100).toFixed(0)}% -> ${(arIso * 100).toFixed(0)}%)`, arIso < arBase - 0.05);
}

// ---------------------------------------------------------------------------
console.log('[9] Expandir leitos (intervencao beds): conserva populacao e reduz mortes por colapso');
{
  // Patogeno grave numa cidade com poucos leitos -> H estoura a capacidade -> mortes por
  // sobrecarga. Expandir leitos (capacidade variavel no tempo) deve reduzir esses obitos.
  const collapseConfig = (interventions) => ({
    cities: [{
      id: 'A', labelKey: '', descKey: '',
      population: 1_000_000, density: REFERENCE_DENSITY, sanitation: 0,
      connectivity: 0, hospitalCapacity: 2_000,
    }],
    pathogen: { route: 'contact', R0: 2.5, latentPeriod: 4, infectiousPeriod: 7, hospRate: 0.40, ifr: 0.15, hospStay: 12 },
    interventions, seed: { city: 0, infections: 50 }, horizonDays: 400,
  });
  const rNoBeds = runSimulation(collapseConfig([]));
  const rBeds = runSimulation(collapseConfig([{ type: 'beds', value: 4, startDay: 0, cities: 'all' }]));
  const cons = (r) => {
    const a = r.aggregate[0], b = r.aggregate.at(-1);
    return approx(a.N + a.D, b.N + b.D, 1);
  };
  assert('populacao conservada com beds ativa', cons(rBeds),
    `inicio=${(rBeds.aggregate[0].N + rBeds.aggregate[0].D).toFixed(0)} fim=${(rBeds.aggregate.at(-1).N + rBeds.aggregate.at(-1).D).toFixed(0)}`);
  const deathsNoBeds = rNoBeds.aggregate.at(-1).D;
  const deathsBeds = rBeds.aggregate.at(-1).D;
  assert(`expandir leitos reduz obitos (${deathsNoBeds.toFixed(0)} -> ${deathsBeds.toFixed(0)})`, deathsBeds < deathsNoBeds);
}

console.log(`\n== Resultado: ${passed} passaram, ${failed} falharam ==\n`);
process.exit(failed === 0 ? 0 : 1);
