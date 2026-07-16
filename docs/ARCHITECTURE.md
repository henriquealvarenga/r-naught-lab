# ARCHITECTURE — mapa de módulos e fluxo de dados

## Visão em camadas

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (src/ui + src/main.js)                                        │
│   controls · interventions-ui · charts · panels · styles          │
│        │ lê/escreve                                    ▲ desenha   │
│        ▼                                                │          │
│  STORE (src/state/store.js)  ── estado único observável ─┘         │
│        │ config                                                    │
│        ▼                                                           │
│  ENGINE (src/engine/simulation.js)  ── porta única do motor        │
│   ├─ model.js       (derivadas dy/dt)                              │
│   ├─ integrator.js  (RK4)                                          │
│   ├─ metapopulation (mobilidade + contato)                        │
│   ├─ interventions  (modificadores temporais)                     │
│   ├─ metrics        (Rt, final size, herd)                        │
│   └─ compartments   (acesso ao vetor de estado)                   │
│        ▲ consome                                                   │
│  DATA (src/data/*)  cities · pathogens · scenarios                │
│  CONFIG (src/config/constants.js)                                 │
│  I18N (src/i18n/*)                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Regra de dependência: **as setas apontam sempre para baixo/para dentro.** A UI
depende do motor; o motor NÃO depende da UI. `data` e `config` são folhas.

## Contrato do motor (a única API que a UI precisa)

```js
import { runSimulation } from './engine/simulation.js';

const result = runSimulation(config);
// config = { cities[], pathogen, interventions[], seed, horizonDays, dt?, baseCoupling?, coupling?, overflowMortality? }

// result = {
//   perCity:   [{ id, name, series: [{day,S,E,I,H,R,D,N,Rt,hospOccupancy,capacity}] }],
//   aggregate: [{day,S,E,I,H,R,D,N}],
//   summary:   { peakInfectious, peakInfectiousDay, peakHospitalized, peakHospitalizedDay, totalDeaths },
//   meta:      { rates, herdThreshold, finalSizeTheory, route },
// }
```

Enquanto esse contrato for respeitado, motor e UI evoluem independentemente
(inclusive trocar a UI por React, ou rodar o motor num Web Worker / backend).

## Responsabilidade de cada módulo do motor

| Módulo | Responsabilidade | Puro? |
|--------|------------------|-------|
| `compartments.js` | Ler/escrever o vetor de estado plano; população viva, prevalência | sim |
| `model.js` | Calcular dy/dt do SEIHRD com metapopulação | sim |
| `integrator.js` | Avançar o estado no tempo (RK4 genérico) | sim |
| `metapopulation.js` | Fator de contato (densidade) e matriz de mobilidade | sim |
| `interventions.js` | Traduzir políticas em modificadores(t) de β/mobilidade/vacinação | sim |
| `metrics.js` | Rt, tamanho final teórico, limiar de imunidade de rebanho | sim |
| `simulation.js` | Montar contexto, rodar o loop, produzir séries + métricas | sim |

Todos são testáveis em Node sem DOM (ver `tests/engine.test.mjs`).

## Estado e reatividade

`store.js` é um pub/sub minimalista. As ações (`updateCityParam`,
`updatePathogenParam`, `setInterventions`, `loadScenarioConfig`, …) mutam o
`config` e emitem. `main.js` assina e re-renderiza o necessário. Não há framework
reativo — a intenção é manter o grafo de dependências óbvio para debug.

## Build

`scripts/build.mjs` usa esbuild para bundlar `src/main.js` (IIFE), inlina o CSS e
injeta tudo em `index.html`, gerando `dist/epidemic-sim-preview.html` — um único
arquivo que abre via `file://`. O código-fonte permanece modular; o preview é só
um artefato de distribuição.

## Decisões de projeto e trade-offs

- **Determinístico (EDO) na Fase 1.** Simples, rápido, reproduzível e didático. O
  custo é não capturar extinção estocástica em populações pequenas — previsto para
  a Fase 2 (ver ROADMAP).
- **Canvas próprio em vez de lib de gráficos.** Evita CDN e mantém o preview
  autocontido; o custo é reimplementar recursos de charting conforme necessário.
- **Densidade urbana efetiva, não municipal.** Ver MODEL_MATH e o doc interno de
  dados: usar densidade municipal bruta distorceria cidades com grande área rural.
