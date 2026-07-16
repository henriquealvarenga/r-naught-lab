/**
 * cities.js
 * -----------------------------------------------------------------------------
 * Perfis das cidades A/B/C (ANONIMIZADOS). Os dados sao derivados de cidades
 * reais, porem NENHUM nome real aparece aqui — a rastreabilidade fica apenas no
 * documento interno docs/DATA_REFERENCE_INTERNAL.md.
 *
 * Campos:
 *   population        habitantes (aprox.)
 *   density           densidade urbana efetiva (hab/km2) -> fator de contato
 *   sanitation        fracao [0..1] de cobertura de esgoto -> parametro w
 *   connectivity      [0..1] intensidade de transporte/mobilidade -> matriz M
 *   hospitalCapacity  leitos de alta complexidade disponiveis (surto)
 *   labelKey/descKey  chaves de i18n para a UI
 */

export const CITIES = [
  {
    id: 'A',
    labelKey: 'city.A.name',
    descKey: 'city.A.desc',
    population: 11_900_000,
    density: 7500,
    sanitation: 0.76,
    connectivity: 1.00,
    hospitalCapacity: 12_000,
  },
  {
    id: 'B',
    labelKey: 'city.B.name',
    descKey: 'city.B.desc',
    population: 6_200_000,
    density: 5200,
    sanitation: 0.86,
    connectivity: 0.85,
    hospitalCapacity: 5_200,
  },
  {
    id: 'C',
    labelKey: 'city.C.name',
    descKey: 'city.C.desc',
    population: 2_200_000,
    density: 5000,
    sanitation: 0.32,
    connectivity: 0.35,
    hospitalCapacity: 1_200,
  },
];

/** Clona os perfis para uso mutavel na UI (sliders alteram copias). */
export function cloneCities() {
  return CITIES.map((c) => ({ ...c }));
}

/** Recupera um perfil pelo id. */
export function cityById(id) {
  return CITIES.find((c) => c.id === id);
}
