// ============================================================================
// game/game.js  ·  [ ~ gamificação ]
// Rodadas curtas com cronômetro + pontuação e quiz conceitual entre rodadas.
// Placar final salvo em localStorage.
//
// Parte 2 (sons): tique do relógio + acerto/erro (js/audio/sfx.js).
// Parte 3 (feedback): "acertou/errou" unificado por uma margem relativa
//   (MARGEM_ACERTO, em config.js), com banner ✅/❌ e barra visual da faixa.
// ============================================================================

import { state } from "../core/state.js";
import { RODADAS } from "./datasets.js";
import { QUIZ, sorteiaQuiz } from "./quiz.js";
import { fmtNum, fmtInt, fmtPct } from "../core/format.js";
import { desenharMini, getVar } from "../ui/plot.js";
import { setVal } from "../ui/sim.js";
import { showScreen } from "../ui/screens.js";
import * as sfx from "../audio/sfx.js";
import {
  STORAGE_BEST_KEY, SCORING, TIMER_TICK_MS, TIMER_LOW_S,
  MARGEM_ACERTO, PONTOS_ACERTO_MAX, PONTOS_ACERTO_MIN, FATOR_ERRO_ZERO,
} from "../config.js";

export function initGame() {
  // lista de rodadas na home
  const lista = document.getElementById("round-list");
  lista.innerHTML = RODADAS.map((r, i) =>
    `<div class="round-item" data-idx="${i}">
       <div class="stars">${r.estrelas}</div>
       <h4>${r.titulo}</h4><p>${r.desc}</p>
     </div>`).join("");
  lista.querySelectorAll(".round-item").forEach((el) =>
    el.addEventListener("click", () => iniciarJogo(+el.dataset.idx, false)));

  document.getElementById("btn-play-all").addEventListener("click", () => iniciarJogo(0, true));

  document.getElementById("best-score").textContent = melhorPontuacao();
}

function melhorPontuacao() {
  try { return parseInt(localStorage.getItem(STORAGE_BEST_KEY) || "0", 10) || 0; } catch (e) { return 0; }
}
function salvarMelhor(p) {
  try { if (p > melhorPontuacao()) localStorage.setItem(STORAGE_BEST_KEY, String(p)); } catch (e) {}
}

function iniciarJogo(idx, sequencia) {
  pararTimer();
  state.jogo.sequencia = sequencia;
  state.jogo.rodada = idx;
  state.jogo.pontos = sequencia ? 0 : state.jogo.pontos; // avulsa acumula na sessão
  if (!sequencia) state.jogo.pontos = 0;
  state.jogo.respostas = [];
  state.jogo.usadasQuiz = state.jogo.usadasQuiz || [];
  briefing(idx);
}

// ---- Briefing -------------------------------------------------------------
function briefing(idx) {
  const r = RODADAS[idx];
  showScreen("briefing");
  document.getElementById("briefing-card").innerHTML = `
    <div class="scorebar">
      <span class="badge">${r.estrelas} ${r.titulo}</span>
      <span class="badge pts">${state.jogo.pontos} pts</span>
    </div>
    <h3>${r.titulo}</h3>
    <p class="muted">${r.desc}</p>
    <p>Você terá <strong>${r.tempo} segundos</strong>. Pontos por acerto + bônus por rapidez.</p>
    <div class="center mt"><button class="btn btn-primary" id="b-go">▶ Jogar</button></div>`;
  document.getElementById("b-go").addEventListener("click", () => jogar(idx));
}

// ---- Play ----------------------------------------------------------------
function jogar(idx) {
  sfx.despertar(); // retoma o AudioContext dentro do gesto (clique em "Jogar")
  const r = RODADAS[idx];
  const dados = r.gera();
  state.jogo.atual = dados;
  state.jogo.palpite = null;
  showScreen("play");

  const card = document.getElementById("play-card");
  card.innerHTML = `
    <div class="scorebar">
      <span class="badge">${r.titulo}</span>
      <span class="timer" id="timer">${r.tempo}s</span>
    </div>
    <div class="progress"><i id="timebar" style="width:100%"></i></div>
    <div id="play-body"></div>
    <div class="center mt"><button class="btn btn-primary" id="b-confirm">🎯 Confirmar</button></div>`;

  renderCorpo(r.id, dados);
  document.getElementById("b-confirm").addEventListener("click", () => avaliar(idx));
  iniciarTimer(r.tempo, () => avaliar(idx));
}

function renderCorpo(tipo, d) {
  const body = document.getElementById("play-body");
  if (tipo === "guessR0") {
    body.innerHTML = `
      <p>Esta curva mostra os <strong>casos por ciclo</strong> a partir de 1 caso. Qual o R₀?</p>
      <div class="chart-box"><svg id="mini-chart"></svg></div>
      <div class="control mt">
        <label>Seu palpite de R₀ <span class="val" id="v-guess">2,5</span></label>
        <input type="range" id="guess" min="0.5" max="6" step="0.1" value="2.5" />
      </div>`;
    desenharMini("#mini-chart", d.serie, getVar("--cenario-a"));
    const g = document.getElementById("guess");
    state.jogo.palpite = 2.5;
    g.addEventListener("input", () => { state.jogo.palpite = +g.value; setVal("v-guess", fmtNum(+g.value, 1)); });
  }
  else if (tipo === "predictCases") {
    body.innerHTML = `
      <p>Começando com <strong>${fmtInt(d.i0)}</strong> caso(s) e <strong>R₀ = ${fmtInt(d.R0)}</strong>,
         quantos casos <em>no ciclo ${d.alvo}</em>? <span class="muted">(dica: i₀ · R₀ᵏ)</span></p>
      <div class="control">
        <label>Sua resposta</label>
        <input type="number" id="guess-num" min="0" step="1" placeholder="digite o número de casos" />
      </div>`;
    const g = document.getElementById("guess-num");
    g.addEventListener("input", () => { state.jogo.palpite = parseFloat(g.value); });
  }
  else if (tipo === "herd") {
    body.innerHTML = `
      <p>A doença <strong>${d.doenca}</strong> tem R₀ ≈ <strong>${fmtNum(d.R0, 1)}</strong>.
         Que <em>porcentagem</em> da população precisa estar imune para conter a transmissão?</p>
      <div class="control mt">
        <label>Sua estimativa <span class="val" id="v-herd">50%</span></label>
        <input type="range" id="guess-herd" min="0" max="100" step="1" value="50" />
      </div>`;
    const g = document.getElementById("guess-herd");
    state.jogo.palpite = 50;
    g.addEventListener("input", () => { state.jogo.palpite = +g.value; setVal("v-herd", g.value + "%"); });
  }
  else if (tipo === "peak") {
    body.innerHTML = `
      <p>Dois surtos (modelo SIR, mesma população e período infeccioso). Qual atinge o
         <strong>pico de infectados mais alto</strong>?</p>
      <div class="round-list mt">
        <button class="round-item" data-op="A"><h4>Cenário A</h4><p>R₀ = ${fmtNum(d.a, 1)}</p></button>
        <button class="round-item" data-op="B"><h4>Cenário B</h4><p>R₀ = ${fmtNum(d.b, 1)}</p></button>
      </div>`;
    body.querySelectorAll("[data-op]").forEach((b) => b.addEventListener("click", () => {
      state.jogo.palpite = b.dataset.op;
      body.querySelectorAll("[data-op]").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    }));
  }
}

// ---- Pontuação por estimativa ---------------------------------------------
// erroRel = |palpite − alvo| / alvo. Dentro da margem: PONTOS_ACERTO_MAX →
// PONTOS_ACERTO_MIN. Fora: decai de PONTOS_ACERTO_MIN até 0 em MARGEM×FATOR.
function pontosEstimativa(erroRel) {
  if (!Number.isFinite(erroRel)) return 0;
  if (erroRel <= MARGEM_ACERTO) {
    const t = erroRel / MARGEM_ACERTO;                 // 0 (alvo) .. 1 (borda)
    return Math.round(PONTOS_ACERTO_MAX - t * (PONTOS_ACERTO_MAX - PONTOS_ACERTO_MIN));
  }
  const zero = MARGEM_ACERTO * FATOR_ERRO_ZERO;
  if (erroRel >= zero) return 0;
  const t = (erroRel - MARGEM_ACERTO) / (zero - MARGEM_ACERTO); // 0 (borda) .. 1 (zero)
  return Math.round(PONTOS_ACERTO_MIN * (1 - t));
}

// Barra visual da faixa de acerto: banda verde = intervalo aceito, traço =
// valor certo, bolinha = palpite (verde se dentro, vermelho se fora).
function mkFaixa(x0, x1, alvo, palpite, lo, hi, fmt, acertou) {
  const pos = (v) => Math.max(0, Math.min(100, ((v - x0) / (x1 - x0)) * 100));
  const bLo = pos(lo), bHi = pos(hi);
  const temP = palpite != null && Number.isFinite(palpite);
  const cls = acertou ? "ok" : "no";
  return `
    <div class="faixa">
      <div class="faixa-bar">
        <div class="faixa-track"><div class="faixa-banda" style="left:${bLo}%;width:${Math.max(0, bHi - bLo)}%"></div></div>
        <div class="faixa-alvo" style="left:${pos(alvo)}%"></div>
        ${temP ? `<div class="faixa-palpite ${cls}" style="left:${pos(palpite)}%"></div>` : ""}
      </div>
      <div class="faixa-ends"><span>${fmt(x0)}</span><span>${fmt(x1)}</span></div>
      <div class="faixa-legenda">
        <span><i class="fx-banda"></i> faixa aceita</span>
        <span><i class="fx-alvo"></i> valor certo</span>
        <span><i class="fx-palpite ${cls}"></i> seu palpite</span>
      </div>
    </div>`;
}

// ---- Avaliação ------------------------------------------------------------
function avaliar(idx) {
  pararTimer();
  const r = RODADAS[idx];
  const d = state.jogo.atual;
  const p = state.jogo.palpite;
  const margemPct = Math.round(MARGEM_ACERTO * 100);
  let pontos = 0, acertou = false, correto = "", detalhe = "", faixa = null;

  if (r.id === "guessR0") {
    const alvo = d.R0;
    const erroRel = (p == null || !Number.isFinite(p)) ? Infinity : Math.abs(p - alvo) / alvo;
    acertou = erroRel <= MARGEM_ACERTO;
    pontos = pontosEstimativa(erroRel);
    const lo = alvo * (1 - MARGEM_ACERTO), hi = alvo * (1 + MARGEM_ACERTO);
    correto = `R₀ real = ${fmtNum(alvo, 1)}`;
    detalhe = `Faixa aceita (±${margemPct}%): ${fmtNum(lo, 1)}–${fmtNum(hi, 1)}. ` +
      `Seu palpite: ${p == null ? "—" : fmtNum(p, 1)}.`;
    faixa = mkFaixa(0.5, 6, alvo, p, lo, hi, (v) => fmtNum(v, 1), acertou);
  }
  else if (r.id === "predictCases") {
    const alvo = d.resposta;
    const erroRel = (p == null || !Number.isFinite(p)) ? Infinity : Math.abs(p - alvo) / Math.max(1, alvo);
    acertou = erroRel <= MARGEM_ACERTO;
    pontos = pontosEstimativa(erroRel);
    const lo = alvo * (1 - MARGEM_ACERTO), hi = alvo * (1 + MARGEM_ACERTO);
    correto = `Resposta certa = ${fmtInt(alvo)} casos`;
    detalhe = `${fmtInt(d.i0)} · ${fmtInt(d.R0)}<sup>${d.alvo}</sup> = ${fmtInt(alvo)}. ` +
      `Faixa aceita (±${margemPct}%): ${fmtInt(lo)}–${fmtInt(hi)}. ` +
      `Você: ${p == null || !Number.isFinite(p) ? "—" : fmtInt(p)}.`;
    const escalaMax = Math.max(alvo * 2, Number.isFinite(p) ? p * 1.1 : 0, 1);
    faixa = mkFaixa(0, escalaMax, alvo, p, lo, hi, (v) => fmtInt(v), acertou);
  }
  else if (r.id === "herd") {
    const alvoPct = d.resposta * 100;
    const erroRel = (p == null || !Number.isFinite(p)) ? Infinity : Math.abs(p - alvoPct) / alvoPct;
    acertou = erroRel <= MARGEM_ACERTO;
    pontos = pontosEstimativa(erroRel);
    const lo = alvoPct * (1 - MARGEM_ACERTO), hi = alvoPct * (1 + MARGEM_ACERTO);
    correto = `Correto ≈ ${fmtPct(d.resposta)}`;
    detalhe = `1 − 1/${fmtNum(d.R0, 1)} = ${fmtPct(d.resposta)}. ` +
      `Faixa aceita (±${margemPct}%): ${Math.round(lo)}%–${Math.round(hi)}%. ` +
      `Sua estimativa: ${p == null ? "—" : p + "%"}.`;
    faixa = mkFaixa(0, 100, alvoPct, p, lo, hi, (v) => Math.round(v) + "%", acertou);
  }
  else if (r.id === "peak") {
    acertou = p === d.correta; // escolha binária: sem margem
    pontos = acertou ? PONTOS_ACERTO_MAX : 0;
    correto = `Pico maior: Cenário ${d.correta} (R₀ maior → mais infectados no pico)`;
    detalhe = `Pico A ≈ ${fmtInt(d.picoA)} · Pico B ≈ ${fmtInt(d.picoB)}.`;
  }

  // bônus de tempo — só para quem acertou (rapidez não recompensa erro)
  const bonus = acertou
    ? Math.round((state.jogo.tempoRestante / r.tempo) * SCORING.bonusTempoMax)
    : 0;
  const total = pontos + bonus;
  state.jogo.pontos += total;
  state.jogo.respostas.push({ rodada: r.titulo, pontos: total, acertou });

  if (acertou) sfx.acerto(); else sfx.erro();

  resultado(idx, { pontos, bonus, total, acertou, correto, detalhe, faixa });
}

function resultado(idx, res) {
  showScreen("result");
  const cls = res.acertou ? "acerto" : "erro";
  const icone = res.acertou ? "✅" : "❌";
  const titulo = res.acertou ? "Acertou!" : "Não foi dessa vez";
  document.getElementById("result-card").innerHTML = `
    <div class="scorebar">
      <span class="badge">${RODADAS[idx].titulo}</span>
      <span class="badge pts">${state.jogo.pontos} pts</span>
    </div>
    <div class="result-banner ${cls}">
      <span class="rb-ico">${icone}</span><span class="rb-txt">${titulo}</span>
    </div>
    <div class="big-score ${cls}">+${res.total}</div>
    <p class="center muted">${res.pontos} de acerto${res.bonus ? ` + ${res.bonus} de bônus por tempo` : ""}</p>
    ${res.faixa || ""}
    <div class="quiz-explain"><strong>${res.correto}</strong><br>${res.detalhe}</div>
    <div class="center mt"><button class="btn btn-primary" id="b-next">Continuar →</button></div>`;
  document.getElementById("b-next").addEventListener("click", () => quizIntermediario(idx));
}

// ---- Quiz entre rodadas ---------------------------------------------------
function quizIntermediario(idx) {
  const qi = sorteiaQuiz(state.jogo.usadasQuiz);
  state.jogo.usadasQuiz.push(qi);
  const item = QUIZ[qi];
  showScreen("quiz");
  const card = document.getElementById("quiz-card");
  card.innerHTML = `
    <div class="scorebar"><span class="badge">💡 Quiz</span><span class="badge pts">${state.jogo.pontos} pts</span></div>
    <h3>${item.q}</h3>
    <div id="quiz-opts">${item.opcoes.map((o, i) =>
      `<button class="quiz-opt" data-i="${i}">${o}</button>`).join("")}</div>
    <div id="quiz-feedback"></div>
    <div class="center mt hidden" id="quiz-next-wrap"><button class="btn btn-primary" id="b-quiz-next">Próxima →</button></div>`;

  let respondido = false;
  card.querySelectorAll(".quiz-opt").forEach((b) => b.addEventListener("click", () => {
    if (respondido) return; respondido = true;
    const i = +b.dataset.i;
    const acertou = i === item.correta;
    if (acertou) state.jogo.pontos += SCORING.quizAcerto;
    card.querySelectorAll(".quiz-opt").forEach((x, j) => {
      if (j === item.correta) x.classList.add("correct");
      else if (j === i) x.classList.add("wrong");
      x.disabled = true;
    });
    document.getElementById("quiz-feedback").innerHTML =
      `<div class="quiz-explain">${acertou ? `✅ +${SCORING.quizAcerto} pts! ` : "❌ "}${item.explica}</div>`;
    document.getElementById("quiz-next-wrap").classList.remove("hidden");
    if (acertou) sfx.acerto(); else sfx.erro();
  }));

  document.getElementById("b-quiz-next").addEventListener("click", () => avancar(idx));
}

function avancar(idx) {
  if (state.jogo.sequencia && idx + 1 < RODADAS.length) {
    briefing(idx + 1);
  } else {
    final();
  }
}

// ---- Final ----------------------------------------------------------------
function final() {
  salvarMelhor(state.jogo.pontos);
  document.getElementById("best-score").textContent = melhorPontuacao();
  showScreen("final");
  const linhas = state.jogo.respostas.map((r) =>
    `<div class="disease-row"><span>${r.acertou ? "✅" : "❌"} ${r.rodada}</span><strong>${r.pontos} pts</strong></div>`).join("");
  document.getElementById("final-card").innerHTML = `
    <h3 class="center">🏁 Fim!</h3>
    <div class="big-score">${state.jogo.pontos}</div>
    <p class="center muted">pontos nesta partida · recorde: ${melhorPontuacao()}</p>
    ${linhas ? `<div class="mt">${linhas}</div>` : ""}
    <div class="center mt">
      <button class="btn btn-primary" id="b-again">🔁 Jogar tudo de novo</button>
      <button class="btn btn-ghost" id="b-home">Voltar ao início</button>
    </div>`;
  document.getElementById("b-again").addEventListener("click", () => iniciarJogo(0, true));
  document.getElementById("b-home").addEventListener("click", () => showScreen("home"));
}

// ---- Timer ----------------------------------------------------------------
function iniciarTimer(segundos, aoZerar) {
  pararTimer();
  state.jogo.tempoRestante = segundos;
  let ultimoSeg = Math.ceil(segundos); // para tocar o tique só quando o segundo muda
  const elT = document.getElementById("timer");
  const elBar = document.getElementById("timebar");
  state.jogo.timer = setInterval(() => {
    state.jogo.tempoRestante -= TIMER_TICK_MS / 1000;
    const t = Math.max(0, state.jogo.tempoRestante);
    if (elT) { elT.textContent = t.toFixed(1) + "s"; elT.classList.toggle("low", t <= TIMER_LOW_S); }
    if (elBar) elBar.style.width = (t / segundos * 100) + "%";
    // tique a cada segundo inteiro que passa; urgente nos últimos segundos
    const seg = Math.ceil(t);
    if (seg !== ultimoSeg && t > 0) { ultimoSeg = seg; sfx.tick(t <= TIMER_LOW_S); }
    if (t <= 0) { pararTimer(); aoZerar(); }
  }, TIMER_TICK_MS);
}
function pararTimer() {
  if (state.jogo.timer) { clearInterval(state.jogo.timer); state.jogo.timer = null; }
}
