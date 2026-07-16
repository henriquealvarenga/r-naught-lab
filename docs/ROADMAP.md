# ROADMAP

## Fase 1 — MVP jogável ✅ (este protótipo)
- Motor SEIHRD determinístico + metapopulação (3 cidades A/B/C).
- Sliders demográficos e virais; intervenções (distanciamento, máscaras,
  saneamento emergencial, restrição de mobilidade, vacinação).
- Gráficos: curva epidêmica, Rt (com Rt=1), ocupação hospitalar (com 100%);
  mapa das cidades; painel interpretativo.
- Modo livre + cenários 1 (achatar a curva), 2 (saneamento importa),
  5 (transmissibilidade vs severidade).
- Bilíngue PT/EN. 11 testes de sanidade científica passando.

## Fase 2 — Profundidade epidemiológica
- **Estocasticidade** (tau-leaping / Markov) para mostrar variabilidade e
  extinção em populações pequenas — injetar RNG semeado via `config` para manter
  testes determinísticos.
- **Estrutura etária** (crianças/adultos/idosos): matriz de contato por faixa e
  IFR dependente de idade.
- **Assintomáticos (A)** e **reinfecção** (R→S) para ondas recorrentes.
- Cenários **3** (vacina tardia) e **4** (fechar aeroporto) — já especificados no
  DESIGN_SPEC; implementação = 2 objetos em `data/scenarios.js`.
- **Heterogeneidade intra-cidade** (bolsões sem saneamento nas cidades B/C).
- **Animação temporal do mapa** (propagação espaço-temporal).
- Mini-quizzes conceituais ao fim de cada cenário.

## Fase 3 — Produto educacional
- Migração para app hospedado (contas de aluno/professor, salvar cenários).
- **Editor de cenários** para professores.
- Painel de turma e exportação de relatórios de desempenho.
- Biblioteca de "patógenos" parametrizados e trilha de aprendizagem.

## Dívidas técnicas / notas
- Restrição de mobilidade é global no protótipo; tornar por-cidade na Fase 2.
- Gráficos em canvas próprios: adicionar tooltips/hover e comparação "run A vs B".
- Considerar Web Worker para o motor quando o nº de cidades/estocástico crescer.
