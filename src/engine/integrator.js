/**
 * integrator.js
 * -----------------------------------------------------------------------------
 * Integrador numerico Runge-Kutta 4a ordem (RK4) com passo fixo. Generico:
 * recebe uma funcao de derivadas f(y, t, dyOut) e avanca o estado. Nao conhece
 * epidemiologia — pode integrar qualquer sistema de EDOs. Buffers pre-alocados
 * para nao gerar lixo no loop quente.
 */

/**
 * Cria um integrador RK4 dimensionado para vetores de tamanho `size`.
 * @param {number} size  comprimento do vetor de estado
 */
export function createRK4(size) {
  const k1 = new Float64Array(size);
  const k2 = new Float64Array(size);
  const k3 = new Float64Array(size);
  const k4 = new Float64Array(size);
  const tmp = new Float64Array(size);

  /**
   * Avanca `y` um passo `dt` a partir do tempo `t`, in place.
   * @param {Float64Array} y  estado (modificado in place)
   * @param {number} t        tempo atual
   * @param {number} dt       passo
   * @param {(y:Float64Array,t:number,out:Float64Array)=>Float64Array} f
   */
  function step(y, t, dt, f) {
    const half = dt / 2;

    f(y, t, k1);
    for (let i = 0; i < size; i++) tmp[i] = y[i] + half * k1[i];

    f(tmp, t + half, k2);
    for (let i = 0; i < size; i++) tmp[i] = y[i] + half * k2[i];

    f(tmp, t + half, k3);
    for (let i = 0; i < size; i++) tmp[i] = y[i] + dt * k3[i];

    f(tmp, t + dt, k4);
    for (let i = 0; i < size; i++) {
      y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      if (y[i] < 0) y[i] = 0; // clamp anti-ruido numerico
    }
    return y;
  }

  return { step };
}
