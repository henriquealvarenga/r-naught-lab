// ============================================================================
// core/format.js  ·  [ ~ utils.R ]
// Formatação numérica no padrão brasileiro (milhar = ".", decimal = ",")
// e utilidades de exportação CSV. Sem dependências — apenas Intl nativo.
// ----------------------------------------------------------------------------
// Porte direto do helper `fmt_br()` do app.R original:
//   inteiros  -> sem casas decimais, com ponto de milhar
//   decimais  -> `digits` casas, vírgula decimal, ponto de milhar
// ============================================================================

// ---- Formatação BR ---------------------------------------------------------

// Porte de fmt_br(x, digits): trata "quase-inteiros" como inteiros.
export function fmtBR(x, digits = 2, tol = 1e-9) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  const ehInteiro = Math.abs(x - Math.round(x)) < tol;
  if (ehInteiro) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(x));
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x);
}

// Inteiro puro com ponto de milhar (ex.: 12.345).
export function fmtInt(x) {
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(x));
}

// Percentual BR (ex.: 66,7%).
export function fmtPct(frac, digits = 1) {
  if (!Number.isFinite(frac)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(frac * 100) + "%";
}

// Número com N casas fixas (vírgula decimal), sem forçar milhar.
export function fmtNum(x, digits = 2) {
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x);
}

// ---- Exportação CSV --------------------------------------------------------
// Dois formatos, iguais aos do downloadHandler do app.R:
//   "bruto" (internacional): separador vírgula, decimal ponto  -> write.csv
//   "ptbr"  (BR)           : separador ";", decimal vírgula     -> write.table(dec=",")

export function toCSV(headers, rows, formato = "bruto", digits = 2) {
  const sep = formato === "ptbr" ? ";" : ",";

  const cell = (v) => {
    if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) {
      return ""; // NA -> vazio
    }
    if (typeof v === "number") {
      const r = round(v, digits);
      return formato === "ptbr" ? String(r).replace(".", ",") : String(r);
    }
    // texto: envolve em aspas se contiver o separador
    const s = String(v);
    return s.includes(sep) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const linhas = [headers.join(sep)];
  for (const row of rows) linhas.push(row.map(cell).join(sep));
  return linhas.join("\r\n");
}

// Dispara o download de um texto como arquivo (Blob + <a download>).
export function downloadTexto(nomeArquivo, conteudo, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["﻿" + conteudo], { type: mime }); // BOM para Excel/pt-BR
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Numérico auxiliar -----------------------------------------------------

// Privado ao módulo (só toCSV usa). Arredonda para `digits` casas.
function round(x, digits = 2) {
  const f = Math.pow(10, digits);
  return Math.round((x + Number.EPSILON) * f) / f;
}

// Interpola rótulo curto de magnitude (para eixos): 1.2k, 3,4M...
export function fmtCompacto(x) {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1e9) return fmtNum(x / 1e9, 1) + "B";
  if (abs >= 1e6) return fmtNum(x / 1e6, 1) + "M";
  if (abs >= 1e3) return fmtNum(x / 1e3, 1) + "k";
  return fmtBR(x, Math.abs(x - Math.round(x)) < 1e-9 ? 0 : 1);
}
