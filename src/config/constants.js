/**
 * constants.js
 * -----------------------------------------------------------------------------
 * Constantes globais do motor e da simulacao. Nenhuma logica aqui: apenas
 * numeros de calibracao e enums. Centralizar constantes facilita tuning e
 * evita "magic numbers" espalhados pelo codigo (boa pratica para debug/escala).
 */

/** Passo de integracao em dias. dt menor = mais preciso, mais custoso. */
export const DEFAULT_DT = 0.25;

/** Horizonte padrao da simulacao em dias. */
export const DEFAULT_HORIZON_DAYS = 240;

/** Densidade de referencia (hab/km2) para normalizar o fator de contato. */
export const REFERENCE_DENSITY = 5000;

/** Expoente sublinear do contato em funcao da densidade (0..1). */
export const DENSITY_CONTACT_EXPONENT = 0.4;

/** Escalar global de acoplamento entre cidades (mobilidade). */
export const GLOBAL_COUPLING = 1.0;

/**
 * Mortalidade adicional por colapso hospitalar: fator aplicado ao excedente
 * (H - capacidade) por dia. Representa mortes evitaveis por falta de leito.
 */
export const OVERFLOW_MORTALITY = 0.10;

/** Rotas de transmissao suportadas e sua sensibilidade ao saneamento (k). */
export const TRANSMISSION_ROUTES = Object.freeze({
  respiratory: { id: 'respiratory', sanitationSensitivity: 0.05 },
  fecal_oral:  { id: 'fecal_oral',  sanitationSensitivity: 0.80 },
  contact:     { id: 'contact',     sanitationSensitivity: 0.40 },
  vector:      { id: 'vector',      sanitationSensitivity: 0.10 },
});

/** Indices dos compartimentos no vetor de estado de cada cidade. */
export const COMPARTMENTS = Object.freeze({
  S: 0, E: 1, I: 2, H: 3, R: 4, D: 5,
});

/** Quantidade de compartimentos por cidade. */
export const N_COMPARTMENTS = 6;
