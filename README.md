# Simulador Epidemiológico Educacional (SEIHRD + Metapopulação)

Um "anti-Plague" para estudantes de medicina: o objetivo **não** é exterminar a
população, e sim **entender causalidade epidemiológica** — como parâmetros
demográficos (população, densidade, mobilidade, saneamento, transporte) e virais
(R₀, letalidade, período infeccioso, via de transmissão) moldam a curva de uma
epidemia, o pico hospitalar e o número de mortes.

Protótipo funcional (Fase 1). Motor de simulação validado por testes de sanidade
científica. Interface bilíngue (PT/EN) com dois modos: **Modo Jogo** (fluxo em 3
telas, estilo *anti-Plague*, dirigido pelo motor real) e **Modo Análise** (o
painel-dashboard de exploração livre + cenários guiados).

---

## Como rodar

### Opção 1 — Preview instantâneo (sem instalar nada)
Abra `dist/epidemic-sim-preview.html` no navegador. É um arquivo único,
autocontido, gerado a partir do código-fonte modular.

### Opção 2 — Desenvolvimento (código modular)
Os módulos usam ES Modules, então precisam ser servidos por HTTP (não `file://`):

```bash
npm install          # instala esbuild (só para o build)
npm run serve        # python3 -m http.server 8080
# abra http://localhost:8080
```

### Rodar os testes do motor
```bash
npm test             # node tests/engine.test.mjs
```

### Gerar o preview autocontido
```bash
npm run build        # node scripts/build.mjs -> dist/epidemic-sim-preview.html
```

---

## Estrutura do projeto

```
r-naught-lab/
├── index.html                 # app (dev, carrega src/main.js como módulo)
├── package.json
├── src/
│   ├── config/
│   │   └── constants.js        # constantes de calibração e enums (sem lógica)
│   ├── engine/                 # MOTOR — puro, sem DOM, testável isoladamente
│   │   ├── compartments.js     # leitura/escrita do vetor de estado SEIHRD
│   │   ├── model.js            # derivadas dy/dt (o coração matemático)
│   │   ├── integrator.js       # Runge-Kutta 4 genérico
│   │   ├── metapopulation.js   # matriz de mobilidade + fator de contato
│   │   ├── interventions.js    # políticas de saúde pública (modificadores)
│   │   ├── metrics.js          # Rt, tamanho final, imunidade de rebanho
│   │   └── simulation.js       # ORQUESTRADOR (única porta de entrada do motor)
│   ├── data/                   # DADOS como configuração (não código)
│   │   ├── cities.js           # perfis A/B/C anonimizados
│   │   ├── pathogens.js        # presets de patógenos
│   │   ├── scenarios.js        # cenários guiados (missões)
│   │   ├── deck.js             # baralho de intervenções do Modo Jogo
│   │   ├── news.js             # regras do noticiário SNN (declarativas)
│   │   ├── quiz.js             # quiz do relatório de fim
│   │   └── real-diseases.js    # tabela de R₀ de doenças reais (bilíngue)
│   ├── i18n/                   # internacionalização PT/EN
│   │   └── pt.js  en.js  index.js
│   ├── state/
│   │   └── store.js            # estado único observável (pub/sub) — Modo Análise
│   ├── game/                   # MODO JOGO — sobre o motor real (Opção A)
│   │   ├── store.js            # config + índice de dia; re-simula a cada jogada
│   │   ├── screens.js          # 3 telas + cockpit + SNN + relatório
│   │   ├── charts.js           # 2 gráficos de eixo Y fixo
│   │   └── sfx.js              # sons sintetizados (Web Audio)
│   ├── analysis/
│   │   └── index.js            # MODO ANÁLISE — o painel-dashboard
│   ├── ui/                     # camada de apresentação (Modo Análise)
│   │   ├── controls.js  interventions-ui.js
│   │   ├── charts.js           # gráficos em canvas, sem dependências
│   │   ├── panels.js           # KPIs, mapa, explicação
│   │   └── styles.css          # inclui o cockpit do jogo, escopado em .game-app
│   └── main.js                 # roteador Jogo ↔ Análise
├── tests/
│   └── engine.test.mjs         # testes de sanidade científica
├── scripts/
│   └── build.mjs               # bundler -> dist autocontido
├── dist/
│   └── epidemic-sim-preview.html
└── docs/                       # DOCUMENTAÇÃO (leia ONBOARDING.md primeiro)
    ├── ONBOARDING.md           # ⭐ comece aqui (para analista técnico / Claude Code)
    ├── ARCHITECTURE.md         # mapa de módulos, fluxo de dados, extensão
    ├── MODEL_MATH.md           # equações, mapeamento de parâmetros, referências
    ├── DESIGN_SPEC.md          # especificação de produto e pedagogia
    ├── DATA_REFERENCE_INTERNAL.md  # 🔒 INTERNO: cidades reais por trás de A/B/C
    └── ROADMAP.md              # fases futuras
```

---

## Princípios de arquitetura (por que está assim)

1. **Motor puro e isolado.** `src/engine/*` não conhece o DOM, não guarda estado
   global e não usa aleatoriedade — por isso é testável em Node e reutilizável
   (poderia virar backend, worker, ou biblioteca npm sem mudar uma linha).
2. **Dados como configuração.** Cidades, patógenos e cenários são objetos
   declarativos em `src/data/`. Adicionar uma cidade ou cenário **não** exige
   tocar no motor nem na UI.
3. **Estado único (store).** Toda a UI lê de `src/state/store.js` e reage a
   mudanças. Um só ponto de verdade = debug simples.
4. **i18n desacoplado.** Nenhuma string fica hardcoded na UI; tudo passa por
   `t(chave)`.
5. **Sem dependências de runtime.** Gráficos em canvas próprios; nenhum CDN. O
   único dev-dependency é o esbuild (apenas para gerar o preview).

Para estender o sistema, veja `docs/ONBOARDING.md` → "Receitas".

---

## Status científico

O modelo é um SEIHRD determinístico com acoplamento de metapopulação. Passa em 15
testes de sanidade (tamanho final vs teoria, Rt=1 no pico exato do SEIR,
conservação de população, efeito do saneamento por via de transmissão, atraso
metapopulacional, e conservação sob as intervenções `isolation`/`beds` do jogo).
**É uma ferramenta de ensino, não de previsão ou decisão de saúde pública.**
