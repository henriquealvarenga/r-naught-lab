# Guia para o Claude Code

Este repositório é um simulador epidemiológico educacional (SEIHRD +
metapopulação) para estudantes de medicina. Antes de qualquer tarefa:

1. **Leia `docs/ONBOARDING.md`** — mapa mental, convenções e "receitas" de
   extensão. É o ponto de partida.
2. **Leia `docs/MODEL_MATH.md`** antes de tocar em `src/engine/model.js`.
3. **Rode `npm test`** depois de qualquer mudança no motor. São 11 checagens de
   sanidade científica; todas devem passar.
4. **Mexendo no Modo Jogo?** Leia `docs/PLAY_MODE_DESIGN.md` — log vivo das
   decisões de UX/produto do jogo (fluxo em 3 telas, ritmo, gráficos de eixo fixo).

## Regras invioláveis
- O motor (`src/engine/*`) é **puro**: sem DOM, sem `window`, sem `localStorage`,
  sem `Date.now()`/`Math.random()`. Aleatoriedade (Fase 2) entra por RNG semeado
  via `config`.
- Nenhuma string hardcoded na UI — tudo via `t('chave')` (adicione em `pt.js` e
  `en.js`).
- Patógenos devem respeitar `hospRate >= ifr`.
- `docs/DATA_REFERENCE_INTERNAL.md` é **interno**: nunca exponha na UI os nomes
  das cidades reais por trás dos perfis A/B/C.

## Comandos
- `npm test` — testes do motor
- `npm run build` — gera `dist/epidemic-sim-preview.html` (autocontido)
- `npm run serve` — servidor local para desenvolvimento

## Onde adicionar coisas (resumo)
- Cidade/patógeno/cenário/intervenção → `src/data/*` (+ i18n). Ver ONBOARDING §3.
- Compartimento novo → mexe no motor; siga a ordem em ONBOARDING §3 e adicione
  teste de conservação.
