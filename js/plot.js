// ============================================================================
// plot.js  ·  [ ~ camada de gráficos (ggplot -> D3) ]
// Desenha os gráficos com D3 v7. Funções puras de renderização: recebem dados
// já calculados (por epi.js via sim.js) e (re)desenham dentro dos <svg>.
// SVG responsivo via viewBox; a largura é medida do contêiner .chart-box.
// ============================================================================

const CORES = {
  a: getVar("--cenario-a", "#4f46e5"),
  b: getVar("--cenario-b", "#ec4899"),
  s: getVar("--sir-s", "#2563eb"),
  i: getVar("--sir-i", "#dc2626"),
  r: getVar("--sir-r", "#059669"),
  exp: getVar("--texto-3", "#64748b"),
};

function getVar(nome, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}

// Cria escala Y linear ou log conforme flag, com folga no topo.
function escalaY(valores, altura, m, logY) {
  const positivos = valores.filter((v) => v > 0);
  if (logY) {
    // sem positivos (tudo zero), cai para uma faixa segura [0.5, 10]
    const minV = positivos.length ? d3.min(positivos) : 1;
    const maxV = Math.max(positivos.length ? d3.max(positivos) : 1, 1);
    return d3.scaleLog().domain([Math.max(minV, 0.5) / 2, maxV * 1.3])
      .range([altura - m.bottom, m.top]).clamp(true);
  }
  const maxV = d3.max(valores) || 1;
  return d3.scaleLinear().domain([0, maxV * 1.08 || 1])
    .range([altura - m.bottom, m.top]).nice();
}

// ----------------------------------------------------------------------------
// NÍVEL 1 — duas linhas (A e B)
// ----------------------------------------------------------------------------
function desenharN1(dados, cfg) {
  const svg = d3.select("#n1-chart");
  const tip = d3.select("#n1-tip");
  const box = svg.node().parentNode;
  const W = Math.max(320, box.clientWidth || 640);
  const H = 420;
  const m = { top: 18, right: 20, bottom: 42, left: 64 };
  svg.attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
  svg.selectAll("*").remove();

  const key = cfg.tipo === "acum" ? ["acumA", "acumB"] : ["incA", "incB"];
  const serieA = dados.linhas.map((l) => ({ x: l.ciclo, y: l[key[0]] }));
  const serieB = dados.linhas.map((l) => ({ x: l.ciclo, y: l[key[1]] }));
  const todos = serieA.concat(serieB).map((d) => d.y);

  const x = d3.scaleLinear()
    .domain([0, d3.max(dados.linhas, (l) => l.ciclo) || 1])
    .range([m.left, W - m.right]);
  const y = escalaY(todos, H, m, cfg.logY);

  // gridlines horizontais
  const yTicks = cfg.logY ? y.ticks(4, "~s") : y.ticks(5);
  svg.append("g").attr("class", "gridline").selectAll("line").data(yTicks).join("line")
    .attr("x1", m.left).attr("x2", W - m.right).attr("y1", y).attr("y2", y);

  // eixos
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x).ticks(Math.min(dados.linhas.length, 12)).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => fmtCompacto(d)));

  // rótulos de eixo
  svg.append("text").attr("x", (W + m.left) / 2).attr("y", H - 6)
    .attr("text-anchor", "middle").attr("fill", CORES.exp).attr("font-size", 12).text("Ciclo");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(H - m.bottom) / 2)
    .attr("y", 16).attr("text-anchor", "middle").attr("fill", CORES.exp).attr("font-size", 12)
    .text(cfg.tipo === "acum" ? "Casos (acumulado)" : "Casos (no ciclo)");

  const linha = (s) => d3.line().defined((d) => !cfg.logY || d.y > 0)
    .x((d) => x(d.x)).y((d) => y(Math.max(d.y, cfg.logY ? 1e-9 : 0)))(s);

  // linhas + pontos
  drawSerie(svg, serieA, x, y, CORES.a, linha, cfg);
  drawSerie(svg, serieB, x, y, CORES.b, linha, cfg);

  // camada de interação (hover -> ciclo mais próximo)
  hoverN1(svg, tip, box, dados, x, y, W, H, m, cfg, key);
}

function drawSerie(svg, serie, x, y, cor, linha, cfg) {
  svg.append("path").attr("fill", "none").attr("stroke", cor).attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round").attr("d", linha(serie));
  svg.append("g").selectAll("circle")
    .data(serie.filter((d) => !cfg.logY || d.y > 0)).join("circle")
    .attr("cx", (d) => x(d.x)).attr("cy", (d) => y(Math.max(d.y, cfg.logY ? 1e-9 : 0)))
    .attr("r", 3.2).attr("fill", cor);
}

function hoverN1(svg, tip, box, dados, x, y, W, H, m, cfg, key) {
  const guia = svg.append("line").attr("stroke", "#94a3b8").attr("stroke-dasharray", "3 3")
    .attr("y1", m.top).attr("y2", H - m.bottom).style("opacity", 0);
  svg.append("rect").attr("x", m.left).attr("y", m.top)
    .attr("width", W - m.left - m.right).attr("height", H - m.top - m.bottom)
    .attr("fill", "transparent")
    .on("mousemove", function (ev) {
      const [mx] = d3.pointer(ev);
      const ciclo = Math.round(x.invert(mx));
      const l = dados.linhas[ciclo];
      if (!l) return;
      guia.attr("x1", x(ciclo)).attr("x2", x(ciclo)).style("opacity", 1);
      tip.style("opacity", 1)
        .style("left", x(ciclo) + 12 + "px")
        .style("top", m.top + 6 + "px")
        .html(`<strong>Ciclo ${ciclo}</strong><br>` +
          `<span style="color:${CORES.a}">A:</span> ${fmtBR(l[key[0]])}<br>` +
          `<span style="color:${CORES.b}">B:</span> ${fmtBR(l[key[1]])}`);
    })
    .on("mouseleave", () => { tip.style("opacity", 0); guia.style("opacity", 0); });
}

// ----------------------------------------------------------------------------
// NÍVEL 2 — SIR (S, I, R + overlay exponencial)
// ----------------------------------------------------------------------------
function desenharN2(sir, cfg) {
  const svg = d3.select("#n2-chart");
  const tip = d3.select("#n2-tip");
  const box = svg.node().parentNode;
  const W = Math.max(320, box.clientWidth || 640);
  const H = 420;
  const m = { top: 18, right: 20, bottom: 42, left: 64 };
  svg.attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
  svg.selectAll("*").remove();

  const N = sir.metricas.N;
  const x = d3.scaleLinear().domain([0, d3.max(sir.t)]).range([m.left, W - m.right]);
  const y = d3.scaleLinear().domain([0, N]).range([H - m.bottom, m.top]).nice();

  // clip para o overlay exponencial não estourar a área
  svg.append("clipPath").attr("id", "clip-n2").append("rect")
    .attr("x", m.left).attr("y", m.top)
    .attr("width", W - m.left - m.right).attr("height", H - m.top - m.bottom);

  svg.append("g").attr("class", "gridline").selectAll("line").data(y.ticks(5)).join("line")
    .attr("x1", m.left).attr("x2", W - m.right).attr("y1", y).attr("y2", y);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => fmtCompacto(d)));

  svg.append("text").attr("x", (W + m.left) / 2).attr("y", H - 6)
    .attr("text-anchor", "middle").attr("fill", CORES.exp).attr("font-size", 12).text("Dias");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(H - m.bottom) / 2)
    .attr("y", 16).attr("text-anchor", "middle").attr("fill", CORES.exp).attr("font-size", 12)
    .text("Pessoas");

  const mkLine = (arr) => d3.line().x((_, i) => x(sir.t[i])).y((v) => y(v))(arr);

  // overlay exponencial (tracejado), clipado
  if (cfg.mostrarExp) {
    svg.append("path").attr("clip-path", "url(#clip-n2)").attr("fill", "none")
      .attr("stroke", CORES.exp).attr("stroke-width", 1.8).attr("stroke-dasharray", "5 4")
      .attr("opacity", .8).attr("d", mkLine(sir.expOverlay));
  }

  // curvas S / I / R
  svg.append("path").attr("fill", "none").attr("stroke", CORES.s).attr("stroke-width", 2.5).attr("d", mkLine(sir.S));
  svg.append("path").attr("fill", "none").attr("stroke", CORES.r).attr("stroke-width", 2.5).attr("d", mkLine(sir.R));
  svg.append("path").attr("fill", "none").attr("stroke", CORES.i).attr("stroke-width", 3).attr("d", mkLine(sir.I));

  // marcador do pico de infectados
  const iPico = sir.I.indexOf(d3.max(sir.I));
  svg.append("circle").attr("cx", x(sir.t[iPico])).attr("cy", y(sir.I[iPico]))
    .attr("r", 4.5).attr("fill", CORES.i).attr("stroke", "#fff").attr("stroke-width", 1.5);

  hoverN2(svg, tip, sir, x, y, W, H, m);
}

function hoverN2(svg, tip, sir, x, y, W, H, m) {
  const guia = svg.append("line").attr("stroke", "#94a3b8").attr("stroke-dasharray", "3 3")
    .attr("y1", m.top).attr("y2", H - m.bottom).style("opacity", 0);
  const bisect = d3.bisector((d) => d).left;
  svg.append("rect").attr("x", m.left).attr("y", m.top)
    .attr("width", W - m.left - m.right).attr("height", H - m.top - m.bottom).attr("fill", "transparent")
    .on("mousemove", function (ev) {
      const [mx] = d3.pointer(ev);
      const dia = x.invert(mx);
      let i = bisect(sir.t, dia);
      i = Math.max(0, Math.min(sir.t.length - 1, i));
      guia.attr("x1", x(sir.t[i])).attr("x2", x(sir.t[i])).style("opacity", 1);
      const lado = x(sir.t[i]) > (W / 2) ? -150 : 12;
      tip.style("opacity", 1)
        .style("left", x(sir.t[i]) + lado + "px").style("top", m.top + 6 + "px")
        .html(`<strong>Dia ${Math.round(sir.t[i])}</strong><br>` +
          `<span style="color:${CORES.s}">S:</span> ${fmtInt(sir.S[i])}<br>` +
          `<span style="color:${CORES.i}">I:</span> ${fmtInt(sir.I[i])}<br>` +
          `<span style="color:${CORES.r}">R:</span> ${fmtInt(sir.R[i])}<br>` +
          `R<sub>t</sub>: ${fmtNum(sir.Rt[i], 2)}`);
    })
    .on("mouseleave", () => { tip.style("opacity", 0); guia.style("opacity", 0); });
}

// ----------------------------------------------------------------------------
// Gráfico mini para os desafios (uma única curva, sem eixos pesados)
// ----------------------------------------------------------------------------
function desenharMini(svgSel, serie, cor) {
  const svg = d3.select(svgSel);
  const box = svg.node().parentNode;
  const W = Math.max(280, box.clientWidth || 480);
  const H = 260;
  const m = { top: 14, right: 16, bottom: 30, left: 44 };
  svg.attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
  svg.selectAll("*").remove();

  const x = d3.scaleLinear().domain([0, serie.length - 1]).range([m.left, W - m.right]);
  const y = d3.scaleLinear().domain([0, d3.max(serie) * 1.08 || 1]).range([H - m.bottom, m.top]).nice();

  svg.append("g").attr("class", "gridline").selectAll("line").data(y.ticks(4)).join("line")
    .attr("x1", m.left).attr("x2", W - m.right).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat((d) => fmtCompacto(d)));

  svg.append("path").attr("fill", "none").attr("stroke", cor || CORES.a).attr("stroke-width", 2.5)
    .attr("d", d3.line().x((_, i) => x(i)).y((v) => y(v))(serie));
  svg.append("g").selectAll("circle").data(serie).join("circle")
    .attr("cx", (_, i) => x(i)).attr("cy", (v) => y(v)).attr("r", 3).attr("fill", cor || CORES.a);
}
