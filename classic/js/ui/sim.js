// ============================================================================
// ui/sim.js  ·  [ ~ server.R (reativo) ]
// Liga os controles ao estado e ao desenho. Sem botão "Calcular": tudo
// atualiza ao vivo (input event). Cuida da tabela, dos insights e do CSV.
// ============================================================================

import { state } from "../core/state.js";
import { compararCenarios, tempoDuplicacao, limiarRebanho, modeloSIR } from "../models/epi.js";
import { fmtNum, fmtInt, fmtBR, fmtPct, toCSV, downloadTexto } from "../core/format.js";
import { desenharN1, desenharN2 } from "./plot.js";

// Helpers de leitura/escrita de valores no padrão pt-BR para os rótulos.
export function setVal(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function num(id, fallback) { const el = document.getElementById(id); const v = parseFloat(el.value); return Number.isFinite(v) ? v : fallback; }

// ----------------------------------------------------------------------------
// NÍVEL 1
// ----------------------------------------------------------------------------
export function atualizarN1() {
  const p = state.n1;
  // clamp/validação (espelha o validate() do app.R)
  const ciclos = Math.max(1, Math.min(15, Math.round(p.ciclos)));
  const i0 = Math.max(0, p.i0);
  const R0_A = Math.max(0, Math.min(15, p.R0_A));
  const R0_B = Math.max(0, Math.min(15, p.R0_B));

  const dados = compararCenarios(R0_A, R0_B, ciclos, i0, p.tipoSerie);
  state._dadosN1 = dados;

  // título + subtítulo
  setVal("n1-title", `Evolução de casos (${p.tipoSerie === "acum" ? "acumulado" : "no ciclo"})`);
  setVal("n1-sub", `R₀ A = ${fmtNum(R0_A, 1)}  ·  R₀ B = ${fmtNum(R0_B, 1)}  ·  casos iniciais = ${fmtInt(i0)}`);

  desenharN1(dados, { tipo: p.tipoSerie, logY: p.logY });
  tabelaN1(dados, p.tipoSerie);
  insightsN1(dados, R0_A, R0_B, ciclos);
}

function tabelaN1(dados, tipo) {
  const tbl = document.getElementById("n1-table");
  const cabA = tipo === "acum" ? "Acumulado A" : "Incidência A";
  const cabB = tipo === "acum" ? "Acumulado B" : "Incidência B";
  const kA = tipo === "acum" ? "acumA" : "incA";
  const kB = tipo === "acum" ? "acumB" : "incB";

  let html = `<thead><tr><th>Ciclo</th><th>${cabA}</th><th>${cabB}</th>` +
    `<th>Diferença (B−A)</th><th>Razão B/A</th></tr></thead><tbody>`;
  for (const l of dados.linhas) {
    html += `<tr><td>${l.ciclo}</td><td>${fmtBR(l[kA])}</td><td>${fmtBR(l[kB])}</td>` +
      `<td>${fmtBR(l.difAbs)}</td><td>${l.razao == null ? "—" : fmtNum(l.razao, 2)}</td></tr>`;
  }
  tbl.innerHTML = html + "</tbody>";
}

function insightsN1(dados, R0_A, R0_B, ciclos) {
  const ult = dados.linhas[dados.linhas.length - 1];
  const dupA = tempoDuplicacao(R0_A), dupB = tempoDuplicacao(R0_B);
  const hitA = limiarRebanho(R0_A), hitB = limiarRebanho(R0_B);

  const cards = [
    { k: "Acumulado final A", v: fmtBR(ult.acumA), cls: "a", s: `após ${ciclos} ciclos` },
    { k: "Acumulado final B", v: fmtBR(ult.acumB), cls: "b", s: `após ${ciclos} ciclos` },
    { k: "Duplicação A", v: Number.isFinite(dupA) ? fmtNum(dupA, 2) : "—", cls: "a", s: "ciclos p/ dobrar" },
    { k: "Duplicação B", v: Number.isFinite(dupB) ? fmtNum(dupB, 2) : "—", cls: "b", s: "ciclos p/ dobrar" },
    { k: "Imunidade de rebanho A", v: fmtPct(hitA), cls: "a", s: "1 − 1/R₀" },
    { k: "Imunidade de rebanho B", v: fmtPct(hitB), cls: "b", s: "1 − 1/R₀" },
  ];
  renderStats("n1-stats", cards);
}

// ----------------------------------------------------------------------------
// NÍVEL 2 (SIR)
// ----------------------------------------------------------------------------
export function atualizarN2() {
  const p = state.n2;
  const sir = modeloSIR({ R0: p.R0, D: p.D, N: p.N, I0: p.I0, dias: p.dias });
  state._dadosN2 = sir;

  const mt = sir.metricas;
  setVal("n2-sub", `R₀ = ${fmtNum(mt.R0, 1)}  ·  período infeccioso = ${fmtInt(p.D)} d  ·  ` +
    `N = ${fmtInt(mt.N)}  ·  R₀·γ = β = ${fmtNum(mt.beta, 3)}/d`);

  document.getElementById("n2-leg-exp").style.display = p.mostrarExp ? "" : "none";
  desenharN2(sir, { mostrarExp: p.mostrarExp });
  insightsN2(sir);
}

function insightsN2(sir) {
  const mt = sir.metricas;
  const S_end = mt.N - mt.infectadosTotais;
  const hit = limiarRebanho(mt.R0);
  const cards = [
    { k: "Pico de infectados", v: fmtInt(mt.picoI), cls: "b", s: `no dia ${Math.round(mt.picoDia)}` },
    { k: "Tamanho final do surto", v: fmtPct(mt.fracaoFinal), cls: "", s: `${fmtInt(mt.infectadosTotais)} pessoas` },
    { k: "Nunca infectados", v: fmtPct(S_end / mt.N), cls: "a", s: `${fmtInt(S_end)} pessoas` },
    { k: "Limiar de rebanho", v: fmtPct(hit), cls: "", s: "1 − 1/R₀" },
  ];
  renderStats("n2-stats", cards);
}

// ----------------------------------------------------------------------------
// Utilidades comuns
// ----------------------------------------------------------------------------
function renderStats(id, cards) {
  const box = document.getElementById(id);
  box.innerHTML = cards.map((c) =>
    `<div class="stat"><div class="k">${c.k}</div>` +
    `<div class="v ${c.cls}">${c.v}</div><small>${c.s}</small></div>`).join("");
}

// ----------------------------------------------------------------------------
// CSV (Nível 1) — dois formatos, como no downloadHandler do app.R
// ----------------------------------------------------------------------------
function baixarCSV() {
  const dados = state._dadosN1;
  if (!dados) return;
  const p = state.n1;
  const tipo = p.tipoSerie;
  const fmt = state._csvFmt || "bruto";

  const headers = tipo === "acum"
    ? ["Ciclo", "Acumulado_A", "Acumulado_B", "Diferenca_abs", "Razao_B_sobre_A"]
    : ["Ciclo", "Incidencia_A", "Incidencia_B", "Diferenca_abs", "Razao_B_sobre_A"];

  const rows = dados.linhas.map((l) => [
    l.ciclo,
    tipo === "acum" ? l.acumA : l.incA,
    tipo === "acum" ? l.acumB : l.incB,
    l.difAbs,
    l.razao,
  ]);

  const csv = toCSV(headers, rows, fmt, 2);
  const serie = tipo === "acum" ? "acumulado" : "incidencia";
  downloadTexto(`tabela_${serie}_R0A_${p.R0_A}_R0B_${p.R0_B}.csv`, csv);
}

// ----------------------------------------------------------------------------
// Ligação dos controles (wiring) — chamada uma vez no main.js
// ----------------------------------------------------------------------------
export function initSim() {
  // ---- Nível 1 ----
  const cCiclos = document.getElementById("ctl-ciclos");
  cCiclos.addEventListener("input", () => { state.n1.ciclos = +cCiclos.value; setVal("v-ciclos", cCiclos.value); atualizarN1(); });

  const cI0 = document.getElementById("ctl-i0");
  cI0.addEventListener("input", () => { state.n1.i0 = Math.max(0, num("ctl-i0", 1)); atualizarN1(); });

  const cR0a = document.getElementById("ctl-r0a");
  cR0a.addEventListener("input", () => { state.n1.R0_A = +cR0a.value; setVal("v-r0a", fmtNum(+cR0a.value, 1)); atualizarN1(); });

  const cR0b = document.getElementById("ctl-r0b");
  cR0b.addEventListener("input", () => { state.n1.R0_B = +cR0b.value; setVal("v-r0b", fmtNum(+cR0b.value, 1)); atualizarN1(); });

  segmented("ctl-tipo", "tipo", (v) => { state.n1.tipoSerie = v; atualizarN1(); });

  document.getElementById("ctl-logy").addEventListener("change", (e) => { state.n1.logY = e.target.checked; atualizarN1(); });

  segmented("ctl-csvfmt", "fmt", (v) => { state._csvFmt = v; });
  state._csvFmt = "bruto";
  document.getElementById("btn-csv").addEventListener("click", baixarCSV);

  // ---- Nível 2 ----
  const cR0 = document.getElementById("ctl-r0");
  cR0.addEventListener("input", () => { state.n2.R0 = +cR0.value; setVal("v-r0", fmtNum(+cR0.value, 1)); atualizarN2(); });

  const cD = document.getElementById("ctl-d");
  cD.addEventListener("input", () => { state.n2.D = +cD.value; setVal("v-d", cD.value); atualizarN2(); });

  const cN = document.getElementById("ctl-n");
  cN.addEventListener("input", () => { state.n2.N = Math.max(100, num("ctl-n", 100000)); atualizarN2(); });

  const cI0sir = document.getElementById("ctl-i0sir");
  cI0sir.addEventListener("input", () => { state.n2.I0 = Math.max(1, num("ctl-i0sir", 10)); atualizarN2(); });

  const cDias = document.getElementById("ctl-dias");
  cDias.addEventListener("input", () => { state.n2.dias = +cDias.value; setVal("v-dias", cDias.value); atualizarN2(); });

  document.getElementById("ctl-exp").addEventListener("change", (e) => { state.n2.mostrarExp = e.target.checked; atualizarN2(); });

  // desenho inicial
  atualizarN1();
  atualizarN2();
}

// Liga um grupo de botões "segmented"; chama cb(valorDoDataAttr) e marca ativo.
function segmented(id, attr, cb) {
  const grupo = document.getElementById(id);
  grupo.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      grupo.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      cb(b.dataset[attr]);
    });
  });
}
