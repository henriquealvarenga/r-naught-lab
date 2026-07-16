/**
 * interventions.js
 * -----------------------------------------------------------------------------
 * Camada de intervencoes de saude publica. Converte uma lista declarativa de
 * intervencoes (distanciamento, mascara, saneamento emergencial, restricao de
 * mobilidade, vacinacao) em modificadores dependentes do tempo que o modelo
 * consome via `resolveAt(t)`.
 *
 * Cada intervencao e um objeto declarativo:
 *   {
 *     type: 'distancing' | 'masks' | 'mobility_restriction' | 'vaccination' | 'sanitation',
 *     value: number,          // intensidade 0..1 (ex.: 0.5 = corta 50%)
 *     startDay, endDay,       // janela de vigencia (endDay opcional = infinito)
 *     cities: number[] | 'all'
 *   }
 *
 * Manter as intervencoes fora de model.js permite adicionar novas politicas sem
 * mexer no nucleo matematico (principio aberto/fechado).
 */

const CATALOG = {
  // reduzem beta multiplicativamente
  distancing: (v) => ({ beta: 1 - v }),
  masks:      (v) => ({ beta: 1 - 0.5 * v }),
  sanitation: (v) => ({ sanitationBoost: v }), // aumenta w efetivo (rota fecal-oral)
  // reduz mobilidade
  mobility_restriction: (v) => ({ mob: 1 - v }),
  // move S->R
  vaccination: (v) => ({ vax: v }),           // fracao/dia de S vacinada * eficacia
};

/**
 * Cria um resolvedor de intervencoes para nCities cidades.
 * @param {Array} list          intervencoes declarativas
 * @param {number} nCities
 * @returns {{resolveAt: (t:number)=>{betaMult:Float64Array,mobMult:number,vaxRate:Float64Array,sanitationBoost:Float64Array}}}
 */
export function createInterventions(list, nCities) {
  const active = (list || []).slice();

  // buffers reutilizados
  const betaMult = new Float64Array(nCities);
  const vaxRate = new Float64Array(nCities);
  const sanitationBoost = new Float64Array(nCities);

  function applies(iv, t, city) {
    if (t < iv.startDay) return false;
    if (iv.endDay != null && t > iv.endDay) return false;
    if (iv.cities === 'all' || iv.cities == null) return true;
    return iv.cities.includes(city);
  }

  function resolveAt(t) {
    betaMult.fill(1);
    vaxRate.fill(0);
    sanitationBoost.fill(0);
    let mobMult = 1;

    for (const iv of active) {
      const fx = CATALOG[iv.type];
      if (!fx) continue;
      const out = fx(iv.value);
      for (let c = 0; c < nCities; c++) {
        if (!applies(iv, t, c)) continue;
        if (out.beta != null) betaMult[c] *= out.beta;
        if (out.vax != null) vaxRate[c] += out.vax;
        if (out.sanitationBoost != null) sanitationBoost[c] += out.sanitationBoost;
      }
      if (out.mob != null) {
        // restricao de mobilidade e global neste prototipo (aplica se vigente p/ qualquer cidade)
        if (applies(iv, t, 0) || iv.cities === 'all') mobMult *= out.mob;
      }
    }
    return { betaMult, mobMult, vaxRate, sanitationBoost };
  }

  return { resolveAt };
}
