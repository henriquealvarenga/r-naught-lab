# ONBOARDING — para o analista técnico / Claude Code

> Leia este arquivo **primeiro**. Ele explica como o projeto está pensado, as
> convenções, e traz "receitas" prontas para as extensões mais comuns. O objetivo
> é que quem pegar este código (humano ou Claude Code) entenda em minutos onde
> mexer — sem quebrar o motor validado.

## 1. Mapa mental em 30 segundos

O app tem três camadas que NÃO se misturam:

```
   DADOS (declarativos)        MOTOR (puro)              UI (apresentação)
   src/data/*  +  config   →   src/engine/simulation  →  src/ui/* + store
   cities, pathogens,          runSimulation(config)      controls, charts,
   scenarios                   -> {perCity, aggregate,    panels, i18n
                                   summary, meta}
```

Fluxo de uma simulação:
1. O usuário mexe em sliders → `store` atualiza o `config`.
2. `main.js` chama `runSimulation(config)` (engine).
3. O resultado volta pro `store`; a UI redesenha gráficos e painéis.

## 2. Convenções

- **JavaScript puro + ES Modules.** Sem framework, sem TypeScript, sem build para
  desenvolver (só para gerar o preview). Imports relativos com extensão `.js`.
- **O motor é sagrado.** `src/engine/*` é puro: nada de DOM, `window`,
  `localStorage`, `Date.now()` ou `Math.random()`. Se precisar de aleatoriedade
  (Fase 2, estocástico), injete um RNG semeado via `config`. Isso mantém os
  testes determinísticos.
- **Nada de string hardcoded na UI.** Toda label passa por `t('chave')`. Chave
  nova → adicione em `src/i18n/pt.js` E `en.js`. Se `t()` devolver a própria
  chave na tela, é sinal de tradução faltando.
- **Dados ≠ código.** Cidade, patógeno e cenário são objetos. Regras novas de
  jogabilidade viram dados sempre que possível.
- **Buffers no loop quente.** `model.js` e `integrator.js` reutilizam
  Float64Arrays para não alocar lixo por passo. Mantenha esse padrão em código de
  performance.

## 3. Receitas (as extensões mais comuns)

### Adicionar uma cidade (ex.: Cidade D)
Edite `src/data/cities.js` e acrescente um objeto ao array `CITIES` com
`id, population, density, sanitation, connectivity, hospitalCapacity` e as chaves
`labelKey/descKey`. Adicione as traduções em `i18n/pt.js` e `en.js`. **Nada mais.**
O motor lida com N cidades automaticamente (a matriz de mobilidade é gerada a
partir de `connectivity`). Se a cidade for derivada de dados reais, registre a
fonte em `DATA_REFERENCE_INTERNAL.md` (nunca exponha o nome real na UI).

### Adicionar um patógeno
Acrescente um preset em `src/data/pathogens.js`. **Invariante obrigatória:**
`hospRate >= ifr` (a letalidade vem do compartimento H). Rode `npm test` para
garantir que não quebrou nada.

### Adicionar um cenário/missão
Acrescente um objeto a `SCENARIOS` em `src/data/scenarios.js` com `buildConfig()`
e `evaluate(result)`. O `evaluate` recebe o resultado da simulação e devolve
`{passed, metricKey, value}`. Os cenários 3 (vacinação tardia) e 4 (fechar
aeroporto) já estão especCIFicados no `DESIGN_SPEC.md` — implementá-los é só
escrever esses dois objetos.

### Adicionar uma intervenção
Adicione a entrada no `CATALOG` de `src/engine/interventions.js` (define como ela
modifica beta/mobilidade/vacinação) e liste-a em `TYPES` de
`src/ui/interventions-ui.js`. Traduza a label.

### Adicionar um compartimento (ex.: A = assintomáticos)
Aqui SIM se mexe no motor. Ordem: (1) `config/constants.js` — adicione o índice em
`COMPARTMENTS` e ajuste `N_COMPARTMENTS`; (2) `model.js` — adicione os fluxos e as
derivadas; (3) `compartments.js` — inclua no cálculo de população viva se
aplicável; (4) `simulation.js` — registre na série se a UI precisar; (5) adicione
um teste de conservação em `tests/`. Rode `npm test`.

## 4. Onde está cada decisão de modelagem
Todas as equações, o significado de cada parâmetro e como os dados reais viram
números do modelo estão em `MODEL_MATH.md`. Leia antes de mexer em `model.js`.

## 5. Como saber se você quebrou algo
`npm test` roda 11 checagens científicas (tamanho final, Rt=1 no pico, conservação
de população, efeito de saneamento por via, atraso metapopulacional). Se qualquer
uma falhar após sua mudança, o modelo está inconsistente com a teoria — reveja.

## 6. Débitos técnicos conhecidos / próximos passos
Ver `ROADMAP.md`. Resumo: modelo estocástico, estrutura etária, heterogeneidade
intra-cidade (favelas), animação temporal do mapa, editor de cenários para
professores, e migração para app hospedado (contas/turmas).
