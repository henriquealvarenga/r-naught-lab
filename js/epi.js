// ============================================================================
// epi.js  ·  [ ~ modelo.R ]
// Modelos epidemiológicos — funções puras, sem DOM nem D3.
//
//   NÍVEL 1 — Crescimento exponencial (geracional), fiel ao app.R:
//             inc[0] = i0 ;  inc[k] = inc[k-1] * R0  ->  inc[k] = i0 * R0^k
//
//   NÍVEL 2 — Modelo SIR (compartimental), integrado por Runge-Kutta 4:
//             S' = -β·S·I/N ;  I' = β·S·I/N − γ·I ;  R' = γ·I
//             β = R0·γ ,  γ = 1/D  (D = período infeccioso em dias)
// ============================================================================

// ----------------------------------------------------------------------------
// NÍVEL 1 — Exponencial
// ----------------------------------------------------------------------------

// Gera incidência por ciclo e acumulado. Porte de gera_series() do app.R.
function serieExponencial(R0, ciclos, i0) {
  const inc = new Array(ciclos + 1);
  inc[0] = i0;
  for (let k = 1; k <= ciclos; k++) inc[k] = inc[k - 1] * R0;
  const acum = new Array(ciclos + 1);
  let soma = 0;
  for (let k = 0; k <= ciclos; k++) {
    soma += inc[k];
    acum[k] = soma;
  }
  return { inc, acum };
}

// Tempo de duplicação em ciclos: ln(2)/ln(R0). Só faz sentido para R0 > 1.
function tempoDuplicacao(R0) {
  if (R0 <= 1) return Infinity; // não dobra (estável ou em declínio)
  return Math.log(2) / Math.log(R0);
}

// Limiar de imunidade de rebanho: HIT = 1 − 1/R0 (fração da população).
function limiarRebanho(R0) {
  if (R0 <= 1) return 0; // abaixo de 1 não há epidemia sustentada
  return 1 - 1 / R0;
}

// Monta o quadro comparativo A x B (o data.frame do app.R).
// tipo: "acum" | "inc"  -> qual série usar para diferença/razão.
function compararCenarios(R0_A, R0_B, ciclos, i0, tipo) {
  const A = serieExponencial(R0_A, ciclos, i0);
  const B = serieExponencial(R0_B, ciclos, i0);
  const linhas = [];
  for (let k = 0; k <= ciclos; k++) {
    const sA = tipo === "acum" ? A.acum[k] : A.inc[k];
    const sB = tipo === "acum" ? B.acum[k] : B.inc[k];
    const razao = sA === 0 ? null : sB / sA; // A=0 -> NA (exibido como "—")
    linhas.push({
      ciclo: k,
      incA: A.inc[k], incB: B.inc[k],
      acumA: A.acum[k], acumB: B.acum[k],
      difAbs: sB - sA,
      razao: Number.isFinite(razao) ? razao : null,
    });
  }
  return { A, B, linhas };
}

// ----------------------------------------------------------------------------
// NÍVEL 2 — SIR
// ----------------------------------------------------------------------------

// Integra o modelo SIR por RK4. Retorna séries amostradas + métricas.
//   params: { R0, D, N, I0, dias, dt }
function modeloSIR(params) {
  const R0 = Math.max(0, params.R0);
  const D = Math.max(0.1, params.D);
  const N = Math.max(1, params.N);
  const I0 = Math.min(Math.max(0, params.I0), N);
  const dias = Math.max(1, params.dias);
  const dt = params.dt ?? 0.1;

  const gamma = 1 / D;
  const beta = R0 * gamma;

  // Derivadas do sistema (S, I) — R obtido por conservação (N constante).
  const deriv = (S, I) => {
    const novasInfeccoes = (beta * S * I) / N;
    const recuperacoes = gamma * I;
    return [-novasInfeccoes, novasInfeccoes - recuperacoes];
  };

  let S = N - I0;
  let I = I0;
  let R = 0;

  const passos = Math.round(dias / dt);
  // Amostra ~diariamente (ou o que couber) para manter os arrays enxutos.
  const passosPorAmostra = Math.max(1, Math.round(1 / dt));

  const t = [0], sS = [S], sI = [I], sR = [R], sRt = [R0 * (S / N)];
  let picoI = I, picoDia = 0;

  for (let n = 1; n <= passos; n++) {
    // Runge-Kutta 4 no par (S, I)
    const [k1s, k1i] = deriv(S, I);
    const [k2s, k2i] = deriv(S + (dt / 2) * k1s, I + (dt / 2) * k1i);
    const [k3s, k3i] = deriv(S + (dt / 2) * k2s, I + (dt / 2) * k2i);
    const [k4s, k4i] = deriv(S + dt * k3s, I + dt * k3i);

    S += (dt / 6) * (k1s + 2 * k2s + 2 * k3s + k4s);
    I += (dt / 6) * (k1i + 2 * k2i + 2 * k3i + k4i);
    if (S < 0) S = 0;
    if (I < 0) I = 0;
    R = N - S - I;

    const tempo = n * dt;
    if (I > picoI) { picoI = I; picoDia = tempo; }

    if (n % passosPorAmostra === 0 || n === passos) {
      t.push(tempo);
      sS.push(S); sI.push(I); sR.push(R);
      sRt.push(R0 * (S / N)); // Rt = R0 · S/N (razão efetiva no tempo)
    }
  }

  const infectadosTotais = N - S;           // todos que já passaram por I
  const fracaoFinal = infectadosTotais / N; // "tamanho final do surto"

  // Overlay exponencial (aproximação do início): I(t) ≈ I0 · e^{r·t},
  // com r = β − γ = γ(R0 − 1). Mostra onde o exponencial "puro" divergiria.
  const r = gamma * (R0 - 1);
  // cap finito evita Infinity (exp estoura para R0 alto e horizonte longo)
  const expOverlay = t.map((tempo) => Math.min(I0 * Math.exp(r * tempo), 1e15));

  return {
    t, S: sS, I: sI, R: sR, Rt: sRt, expOverlay,
    metricas: {
      R0, gamma, beta, N,
      picoI, picoDia,
      infectadosTotais, fracaoFinal,
      rCrescimento: r,
    },
  };
}

// Resolve o "tamanho final" analítico do SIR (equação implícita 1 − z = e^{−R0·z}).
// Útil para conferência; não usado no gráfico. Retorna fração infectada.
function tamanhoFinalSIR(R0) {
  if (R0 <= 1) return 0;
  let z = 0.5;
  for (let i = 0; i < 100; i++) {
    const f = 1 - z - Math.exp(-R0 * z);
    const df = -1 + R0 * Math.exp(-R0 * z);
    const passo = f / df;
    z -= passo;
    if (Math.abs(passo) < 1e-10) break;
  }
  return Math.min(Math.max(z, 0), 1);
}
