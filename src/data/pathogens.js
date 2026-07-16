/**
 * pathogens.js
 * -----------------------------------------------------------------------------
 * Presets de patogenos (genericos, NAO nomeados como virus reais). Cada preset
 * traz parametros clinicos plausiveis e uma rota de transmissao. As faixas sao
 * inspiradas em literatura (registradas em docs/MODEL_MATH.md), mas os rotulos
 * sao neutros para uso didatico.
 *
 * INVARIANTE: hospRate >= ifr (a letalidade nao pode exceder a hospitalizacao,
 * pois no modelo os obitos vem do compartimento H).
 */

export const PATHOGENS = [
  {
    id: 'resp_moderate',
    labelKey: 'pathogen.resp_moderate',
    route: 'respiratory',
    R0: 2.5,
    latentPeriod: 3,
    infectiousPeriod: 6,
    hospRate: 0.06,
    ifr: 0.008,
    hospStay: 10,
  },
  {
    id: 'resp_high_transmission',
    labelKey: 'pathogen.resp_high_transmission',
    route: 'respiratory',
    R0: 6.0,          // alta transmissibilidade
    latentPeriod: 4,
    infectiousPeriod: 8,
    hospRate: 0.02,
    ifr: 0.001,       // baixa letalidade -> cenario 5
    hospStay: 8,
  },
  {
    id: 'severe_low_transmission',
    labelKey: 'pathogen.severe_low_transmission',
    route: 'contact',
    R0: 1.6,          // baixa transmissibilidade
    latentPeriod: 5,
    infectiousPeriod: 7,
    hospRate: 0.40,
    ifr: 0.15,        // alta letalidade -> cenario 5
    hospStay: 12,
  },
  {
    id: 'waterborne',
    labelKey: 'pathogen.waterborne',
    route: 'fecal_oral', // sensivel a saneamento -> cenario 2
    R0: 2.2,
    latentPeriod: 2,
    infectiousPeriod: 5,
    hospRate: 0.10,
    ifr: 0.02,
    hospStay: 7,
  },
];

export function clonePathogen(id) {
  const p = PATHOGENS.find((x) => x.id === id) || PATHOGENS[0];
  return { ...p };
}
