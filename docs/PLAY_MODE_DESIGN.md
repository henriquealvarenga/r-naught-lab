# Modo Jogo — Registro de Design (Play Mode)

> **Log vivo** das decisões de UX/produto do **Modo Jogo** (fluxo progressivo
> estilo *Plague Inc.*, mas com objetivo inverso: conter, não exterminar).
> Sempre que decidirmos algo sobre o jogo, registrar aqui **com data**. Serve
> para o Claude Code e para nós retomarmos o raciocínio em sessões futuras.
>
> Status geral: **migração executada (2026-07-17).** O Modo Jogo agora roda
> **sobre o motor real** (`src/engine/*`) via `src/game/*` — ver §8. O protótipo
> `game-mockup.html` (§4) permanece só como referência de design.

---

## 1. Visão

Substituir a antiga tela-painel única (densa demais — todas as cidades + todos os
controles + todos os gráficos de uma vez) por um **fluxo em 3 telas**:

1. **Território** — escolher **uma** cidade (perfil muda a dificuldade).
2. **Patógeno** — definir os parâmetros do vírus (presets + sliders).
3. **Surto** — timer contando em **dias**; contadores de população total,
   infecciosos, hospitalizados, óbitos e recuperados evoluindo ao vivo; o aluno
   decide **quando** e **o que** intervir.

O painel-dashboard atual **não morre**: vira o **Modo Análise** (sandbox
secundário), acessível por um seletor no topo (Jogo ↔ Análise).

---

## 2. Decisões consolidadas

### Rodada 1 — estrutura do repo + o que aproveitar do app clássico (2026-07-13)
| Decisão | Detalhe |
|---|---|
| Estrutura de pastas | App novo (SEIHRD) promovido à **raiz**; app clássico movido para **`/classic/`** (histórico preservado via `git mv`). *No working tree, ainda não commitado.* |
| Aproveitar do clássico | **Sons** (Web Audio, `classic/js/audio/sfx.js`), **quiz conceitual** (precisa de i18n EN), **easter-egg** (R₀ de doenças reais) + **níveis básicos** (exponencial/SIR como on-ramp). |
| **Não** aproveitar | O loop arcade com timer/placar do clássico — o jogo novo terá sua própria dinâmica. |
| Cidades no jogo | **Uma cidade por partida** (não o mapa metapopulacional inteiro). |
| Intervenções | **Com custo/orçamento** (o aluno prioriza dentro de um budget). |
| Painel atual | Vira **Modo Análise** secundário. |

### Rodada 2 — ritmo e gráficos (2026-07-14)
| Decisão | Detalhe / Racional |
|---|---|
| **Velocidade** | Seletor discreto **⏸ · 0.5× · 1× · 2× · 4×** (em vez de um único ritmo fixo). Resolve "devagar pra ver o crescimento exponencial" **e** "rápido pra pular a cauda longa" de uma vez. Base: **1 tick = 1 dia**, passo-base **360 ms** → 1× ≈ 2,8 dias/s, 0.5× ≈ 1,4 dias/s, 4× ≈ 11 dias/s. |
| **Rótulos no eixo Y** | O gráfico antigo não tinha valores no eixo — corrigido (rótulos em notação humana: `0 · 1.5M · 3M …`). |
| **Dois gráficos, eixo Y ESTÁTICO** | Nunca reescalar automaticamente. **Por quê:** reescala dinâmica destrói a noção de magnitude — uma curva que "disparava" volta a parecer plana quando a escala cresce — e impede (a) sentir o tamanho real, (b) comparar antes/depois de uma intervenção, (c) comparar partidas. |
| → Gráfico **Macro** ("A epidemia") | Eixo Y fixo = **½N** (metade da população). Curvas: **S, I (onda, preenchida), R, D**. *Trade-off aceito pelo usuário:* S e R passam boa parte "grudados" no teto (clampados) — escolhemos ½N em vez de N inteiro para a **onda de infecciosos encher mais a tela**, priorizando o drama da onda sobre a honestidade estrita de escala. |
| → Gráfico **Zoom** ("Pressão no hospital") | Eixo Y fixo = **2,5× a capacidade INICIAL** de leitos. Curvas: **H (preenchida) + linha de capacidade + D acumulado**. A linha de capacidade fica ~40% da altura (folga pra ver o estouro). Comprar leitos **move a LINHA pra cima** — o eixo continua fixo, então o ganho fica visível. É aqui que mora a decisão clínica (achatar a curva = manter H sob a linha). |
| Escala **log** | **Rejeitada** para o público de medicina (menos intuitiva). Fica como possível *toggle* avançado no futuro. |

### Rodada 3 — cockpit, viagem no tempo e notícias (2026-07-14)
| Decisão | Detalhe / Racional |
|---|---|
| **Layout "cockpit" (3 colunas)** | Tela 3 reorganizada: **info à esquerda** (Rₜ, Ocupação, + TV de notícias), **gráficos no centro** (macro + zoom empilhados), **intervenções à direita** (lista vertical compacta). Resolve dois problemas: as intervenções ficam visíveis **sem rolar** e o espaço vazio da coluna esquerda é aproveitado. |
| **Topo limpo na Tela 3** | Marca+toggle, aviso "esboço navegável" e o stepper (Território→Patógeno→Surto) ficam **ocultos durante o jogo** (classe `body.game-active`), reaparecendo nas Telas 1 e 2. Ganha ~250px de altura útil. |
| **Velocidade 0.5×** | Adicionado ao seletor: **⏸ · 0.5× · 1× · 2× · 4×**. |
| **Viagem no tempo (rewind)** | Botões **⏪ (−10 dias)** e **◀ (−1 dia)**. Guarda um *snapshot* completo por dia (compartimentos, orçamento, intervenções ativas, capacidade, picos, dia do Rₜ=1). Ao voltar, intervenções compradas **depois** daquele dia são **desfeitas e o orçamento devolvido** — semântica de "desfazer a decisão e reassistir". Pausa ao voltar; trava no dia 1. Verificado com teste headless (8 invariantes ✓). |

### Rodada 4 — ritmo, botões e fim automático (2026-07-15)
| Decisão | Detalhe / Racional |
|---|---|
| **Ritmo 5× mais lento** | Passo-base 360→**1800 ms/dia** (`TICK_MS`). O default (1×) ficou calmo (~1 dia/1,8 s); ainda dá pra acelerar até 4×. |
| **Botões de transporte** | O antigo `◀` parecia "play pra trás". Agora: **dois rewinds idênticos e agrupados** (`⏪10` e `⏪1`, estilo neutro, desabilitados no dia 1) + **um play destacado** (botão cheio, cor de destaque). Acaba a confusão play↔rewind. |
| **Bug corrigido (2 plantões)** | Quando dois plantões disparavam no mesmo dia, o jogo não retomava sozinho após fechar ambos — `resumePlay` era recapturado como `false`. Agora é capturado **só no 1º plantão da leva** (em `fireNews`). |
| **Fim automático da epidemia** | Não precisa arrastar até 360. `isEpidemicOver()` encerra quando os **ativos (E+I+H) caem a < 0,4% do pico** (`END_FRAC`), passado o pico e um mínimo de dias — ou no limite `HORIZON`. Ex.: Cidade A sem intervir encerra no **dia 148** (não 360). |
| **Relatório de FIM** | O card final virou **relatório**: título "🏁 FIM — colapsou / contido", subtítulo com o motivo (encerrada no dia X vs limite) + % recuperados, e métricas incl. **dias em colapso** e **duração do surto**. |

---

## 3. Parâmetros do protótipo (`game-mockup.html`)

Constantes: `HORIZON = 360` dias · `START_BUDGET = 100` pts ·
`OVERFLOW_MORT = 0,12` · `DENS_REF = 5000` · `TICK_MS = 1800` (ms/dia no 1×) ·
`END_FRAC = 0,004` (fim quando ativos < 0,4% do pico).

- **Integração no protótipo:** Euler `dt = 0,125` × 8 subpassos = **1 dia/tick**.
  (O motor **real** usa RK4 `dt = 0,25` — o protótipo simplifica de propósito.)
- **Semente:** `I0 = 20` infecciosos; o resto suscetível.
- **Fator de contato** = `(densidade / DENS_REF) ^ 0,4`.
- **Rₜ** = `(βeff / γ) · (S/N)`; cruzamento de 1 registrado após o dia 5.

### Baralho de intervenções (custo → efeito)
| Intervenção | Custo | Efeito |
|---|---|---|
| Distanciamento social | 35 | β × 0,55 |
| Máscaras / ventilação | 15 | β × 0,78 |
| Isolar casos | 25 | γ × 1,40 (encurta período infeccioso) |
| Saneamento emergencial | 20 | saneamento + 0,40 (só pesa em rotas de `k` alto) |
| Campanha de vacinação | 40 | move 1,2%/dia de S → imunes |
| Expandir leitos (UTI) | 30 | capacidade × 1,5 |

Intervenções valem **a partir do dia** em que são clicadas — mesma semântica do
`startDay` do motor real.

---

## 4. Estado atual × implementação real

- **Protótipo:** persistido no repo em **`docs/prototypes/game-mockup.html`**
  (standalone, com `<meta charset>` — abre direto no navegador; também publicado
  como **Artifact** de preview). Esboço navegável com um modelo SEIHRD de **uma
  cidade** embutido. É material de **design**, não o app final. O modelo embutido é
  uma **cópia simplificada**; a fonte de verdade continua sendo `src/engine/*`
  (puro, com testes). *Nota:* editar direto esse arquivo — o `<script>` interno tem
  toda a lógica (dados, motor, notícias, UI); ver `js` inline.
- **Implementação real (planejada):**
  1. Nova UI "Modo Jogo" (as 3 telas) consumindo o **motor real**.
  2. Um **stepper** fino e *stateful* por cima do motor puro para avançar
     dia-a-dia **sem violar a pureza** do engine (aleatoriedade, se entrar,
     via RNG semeado no `config`).
  3. Portar **sons** (`classic/js/audio/sfx.js`), **quiz** (i18n EN),
     **easter-egg**.
  4. **Link para `/classic`** no cabeçalho.
  5. Dashboard atual vira **Modo Análise**.
- **Regras invioláveis continuam valendo** (ver `CLAUDE.md` / `ONBOARDING.md`):
  motor puro; nenhuma string hardcoded (tudo via `t()` em `pt.js` **e** `en.js`);
  `hospRate ≥ ifr`; nomes reais de cidades (`DATA_REFERENCE_INTERNAL.md`) **nunca**
  na UI.

---

## 5. Sistema de notícias — "SNN" (implementado no protótipo · v1)

**Metáfora:** uma **TV de notícias** — a *SNN · Saúde News Network* — no canto
inferior-esquerdo do cockpit. Transforma número em narrativa e ensina sem parecer
aula. Duas camadas:

- **Feed (a TV "no ar"):** manchete curta que troca com o passar dos dias;
  **não** pausa o jogo. Recebe as notícias menores (marcos, cor local, eco das
  intervenções, conjuntura social).
- **Plantão (modal que pausa):** só os **momentos-pivô**. Título grande + um
  parágrafo que **explica o conceito**. Só **✕ / Continuar** (ação embutida no
  card = fase futura). Pausa automática; se dois disparam juntos, entram em
  **fila**; ao reavançar depois de um rewind, o plantão **reaparece**.

**Plantões implementados (v1) — 4 momentos-pivô** (IDs no código):
`detect` 🔬 Detecção (dia ≥ 2, abertura) · `firstdeath` ⚰️ Primeiro óbito (D ≥ 1) ·
`collapse` 🏥 Colapso hospitalar (ocupação ≥ 100%) · `turnaround` 📉 Rₜ < 1 / "a maré
virou" (rt < 1, dia > 8, casos > 10 mil). *Nota:* "imunidade de rebanho" e "Rₜ<1" são o
**mesmo momento** matemático (S/N < 1/R₀) — fundidos no `turnaround`. "Vacina disponível"
virou eco de intervenção (feed); o **Fim** segue como card de encerramento à parte.

**Categorias do Feed** (manchete curta + gatilho ligado ao estado do motor):
A. Detecção/vigilância · B. Epidemiologia/marcos (duplicação, Rₜ, pico) ·
C. Mortalidade (marcos de óbitos) · D. Sistema de saúde (ocupação de UTI) ·
E. Conjuntura social / revoltas (com medidas ativas) · F. Política/comunicação
(inclui desinformação) · G. Ciência/descobertas (tratamento, testes, vacina) ·
H. Eco das intervenções do jogador · I. Cor humana/local · J. Encerramento.

**Regras:** seleção **determinística** (sem `Math.random` — por dia/índice, como
o motor exige); **nunca** vazar nomes reais das cidades (usar A/B/C).

**Como está implementado no protótipo** (`game-mockup.html`):
- `NEWS_RULES[]` — lista declarativa `{id, tier, cat, e, when(c), head, detail?}`.
  `tier` = `"feed"` (não pausa) ou `"plantao"` (pausa). `head`/`detail` podem ser string
  ou `fn(c)` (p/ inserir números). Contexto `c = {day, y, N, occ, rt, deaths, casos, active}`.
- `evaluateNews(mt)` roda **todo dia** dentro de `advance()` (o novo caminho "forward":
  `stepDay → evaluateNews → snapshot → HUD`). Cada regra dispara **uma vez** (`G.newsSeen`).
- `fireNews` empurra o item pra `G.feed` (histórico completo, inclui plantões) e, se for
  plantão, pra `G.plantaoQueue` + `showPlantao()`.
- **TV** mostra sempre o último item do feed (`updateTV`, chamado no `updateHUD`).
- **Plantão** = overlay `#plantao-overlay`: pausa (`showPlantao` guarda `resumePlay`),
  `dismissPlantao` mostra o próximo da fila ou retoma. Só ✕/Continuar.
- **Histórico** = overlay `#feed-overlay` (clique na TV) — feed em ordem reversa.
- **Rewind coerente:** o snapshot guarda `newsSeen`+`feed`; `restoreSnapshot` os restaura e
  `rewind` limpa plantão pendente. Ao reavançar, os eventos re-disparam.

**Verificado** (partida cheia Cidade A, sem intervir, via script headless): 4 plantões na
ordem Detecção(d2)→Óbito(d22)→Colapso(d67)→Rₜ<1(d88) + 19 manchetes de feed coerentes.

**Catálogo do feed implementado (v1)** — `id` · gatilho · manchete:
| id | gatilho | manchete |
|---|---|---|
| `growth` | rt>1,3 e casos>500 | Casos em aceleração; curva em ascensão |
| `peak` | I < 90% do pico (pico>2 mil) | Pico de casos pode ter passado |
| `d100`/`d1k`/`d10k`/`d100k` | óbitos ≥ 100 / 1 mil / 10 mil / 100 mil | marcos de mortes |
| `occ70`/`occ90` | ocupação ≥ 70% / 90% | UTIs a 70% / à beira da lotação |
| `relief` | pico de ocupação ≥100% e agora <80% | Ocupação recua; hospitais respiram |
| `emergency` | casos>3 mil | Prefeitura decreta emergência sanitária |
| `misinfo` | dia≥40 e casos>5 mil | Boatos de 'cura milagrosa' viralizam |
| `tests` | dia≥25 | Testes rápidos ampliam o diagnóstico |
| `vtrial` | dia≥60 | Ensaios de vacina entram na fase 3 |
| `applause` | dia≥12 | Aplausos aos profissionais às janelas |
| `solidarity` | dia≥22 e casos>800 | Voluntários criam rede de apoio a idosos |
| `protests` | distanciamento ativo e dia≥70 | Protestos contra o lockdown |
| `fatigue` | distanciamento ativo e dia≥100 | Fadiga pandêmica: adesão cai |
| `echo-*` | intervenção ativa | eco: distanciamento / máscara / isolar / saneamento / vacinação / leitos |

**A fazer nas notícias:** ampliar o catálogo (60-80 manchetes) e variar tom/cena; ao migrar
pro app real, mover as regras pra `src/data/` (declarativo) + i18n `t()` (pt/en).

---

## 6. Questões em aberto / próximos passos

- [x] Ritmo/velocidade — seletor 0.5×–4× e base 5× mais lenta (1× = 1,8 s/dia);
      botões ⏪10 / ⏪1 + play destacado (fim da confusão play↔rewind).
- [x] Layout — cockpit de 3 colunas + topo limpo na Tela 3.
- [x] Viagem no tempo (rewind) — implementada e testada.
- [x] **Sistema de notícias SNN v1** — feed na TV + plantão modal (fila, pausa/retoma) +
      histórico + gatilhos ligados ao motor. Implementado e verificado no protótipo.
- [ ] Ampliar o **catálogo de manchetes** (rumo a 60-80) e variar tom/cena.
- [ ] Confirmar, vendo rodar, se **½N** e **2,5× cap** seguem bons — podem virar
      ¼N / 3× cap.
- [x] **Fim automático + relatório de FIM** — encerra quando a epidemia realmente
      acaba (ativos < 0,4% do pico), não só no dia 360; card final com óbitos, dias
      em colapso, pico de infecciosos, duração e % recuperados.
- [x] **Modo Análise** como aba funcional no topo — toggle Jogo↔Análise no
      `index.html`, roteado por `src/main.js`.
- [x] Migrar do protótipo para a implementação real sobre `src/engine/*` —
      **feito (Opção A), ver §8.**

---

## 7. Migração para o motor real — plano de execução (2026-07-16)

Decisão desta sessão: **como o jogo interativo vai dirigir o motor, que é batch.**
É por aqui que a próxima sessão começa a migração.

### O problema: motor *batch* × jogo *interativo*
`runSimulation(config)` roda os N dias **de uma vez** e devolve a série inteira
(`aggregate[]` + `perCity[]`; ver `src/engine/simulation.js:84`). O jogo precisa do
oposto: avançar **1 dia**, pausar, o aluno **comprar no meio**, **voltar no tempo**.
Reconciliar esses dois mundos é o **primeiro passo** — telas, notícias e sons sentam
todos em cima dessa decisão.

### Decisão: **Opção A** — re-simular até o fim a cada jogada (dirigido por `config`)
Escolhida em vez de extrair um *stepper* do motor (Opção B). O jogo guarda **um
`config` + um índice de dia**:
- **Avançar / ler** o dia D = ler `result.aggregate[D]` (a série já está calculada).
- **Comprar** intervenção no dia D = *append* de
  `{type, value, startDay: D, cities: 'all'}` em `config.interventions` e chamar
  `runSimulation(config)` de novo.
- **Rewind** para o dia D = índice ← D e **descartar** de `config.interventions` tudo
  com `startDay > D` (orçamento devolvido). Fica **de graça** — sem pilha de snapshots.

**Por que A e não B (stepper):**
- O motor é **puro e determinístico** → re-rodar reproduz exatamente o mesmo passado
  + o novo futuro. Sem divergência.
- Intervenção **já é linha do tempo** resolvida por dia (`resolveAt(t)` checa
  `t < startDay`; `src/engine/interventions.js:46`). Nada a inventar.
- Motor fica **intocado e testado**; zero estado mutável novo pra gerenciar; rewind
  trivial.
- Custo (re-simular ~360 dias por compra, 1 cidade) = microssegundos. Irrelevante.

### O que JÁ funciona para a Opção A (verificado nesta sessão)
`createInterventions` aceita `startDay`/`endDay`/`cities` e `applies()` respeita
`t < startDay` — a **mecânica de timeline** funciona **sem tocar no motor**. Tipos do
baralho que casam direto com o `CATALOG`: `distancing` (distanciamento), `masks`
(máscaras), `sanitation` (saneamento), `vaccination` (vacinação).

### Lacunas a resolver (2 das 6 intervenções do baralho)
O `CATALOG` do motor **não cobre** duas intervenções do protótipo. Ambas pedem adição
**limpa** (o padrão aberto/fechado do próprio arquivo) **+ teste de conservação**
(regra do `CLAUDE.md`, rodar `npm test`):

| Intervenção do jogo | Efeito no protótipo | Estado no motor | O que fazer |
|---|---|---|---|
| **Isolar casos** | γ × 1,40 (encurta período infeccioso) | **não existe** no `CATALOG` (não há multiplicador de γ) | Adicionar `isolation: (v)=>({ gamma: 1+v })` ao `CATALOG` e consumir esse fator em `model.js`. |
| **Expandir leitos (UTI)** | capacidade × 1,5 | capacidade é **fixa** em `buildContext` (`capacity[i]`) e intervenções não a tocam | Tornar a capacidade **variável no tempo** (modificador estilo intervenção) **ou** aplicar o upgrade na leitura do `record()`. |

Enquanto essas duas não entram, dá pra migrar o jogo já com as **4 intervenções que
casam** e deixar `isolar`/`leitos` por último.

### Ordem sugerida para a próxima sessão
1. **Fumaça:** telinha mínima que chama `runSimulation(config)` p/ **1 cidade** e
   plota `aggregate[]` — provar o encaixe *batch → leitura por índice*.
2. **Loop de jogo:** índice de dia + play/pausa/velocidade lendo a série pronta;
   comprar = *append* em `config.interventions` + re-run.
3. **Rewind:** índice ← D + truncar `config.interventions` (grátis, sem snapshot).
4. **Lacunas do motor:** `isolation` (γ) + capacidade variável, **com** testes de
   conservação.
5. **Resto:** portar SNN p/ `src/data/` + `t()` (pt/en), telas, sons, quiz — ver §4.

**Regra que não muda:** o motor continua **puro**. Índice de dia, histórico de compras
e estado do jogo vivem na **UI/store** — **nunca** em `src/engine/*`.

---

## 8. Migração executada (2026-07-17) — como ficou

A Opção A do §7 foi implementada. O Modo Jogo agora roda **sobre o motor real**,
sem nenhuma cópia simplificada do modelo. Mapa dos arquivos novos/alterados:

**Motor (lacunas do §7, com testes de conservação):**
- `src/engine/interventions.js` — `CATALOG` ganhou `isolation: v→{gamma:1+v}`
  (encurta o período infeccioso) e `beds: v→{capacity:1+v}` (capacidade
  variável no tempo). `resolveAt` agora devolve `gammaMult` e `capacityMult`.
- `src/engine/model.js` — consome `gammaMult` (γ efetivo no fluxo de I) e
  `capacityMult` (capacidade efetiva no cálculo de colapso/overflow).
- `src/engine/simulation.js` — `record()` reflete γ efetivo no Rₜ e a
  capacidade efetiva em `hospOccupancy`/`capacity`.
- `tests/engine.test.mjs` — 2 checagens novas ([8] isolation, [9] beds).
  **Total: 15 testes** (eram 11), todos verdes.

**Opção A (re-simular + ler por índice):**
- `src/game/store.js` — guarda `config` + `dayIndex`. Avançar = ler
  `series[dayIndex]`; comprar = *append* em `interventions` (com `startDay =
  dayIndex`) + `runSimulation`; rewind = índice ← D e descarta compras com
  `startDay > D` (orçamento devolvido). **Sem pilha de snapshots.** As notícias
  são recomputadas de forma determinística por `computeTimeline()` sobre
  `series[0..dayIndex]` — por isso o rewind é coerente por construção.

**Dados declarativos + i18n (portados do protótipo):**
- `src/data/deck.js` (baralho de 6 cartas → tipos do `CATALOG`),
  `src/data/news.js` (regras SNN com `when(c)` + chaves i18n),
  `src/data/quiz.js`. Strings em `src/i18n/pt.js` **e** `en.js`; helper novo
  `tf(key, params)` interpola `{placeholders}` das manchetes.

**UI do jogo:** `src/game/screens.js` (3 telas + cockpit + SNN + relatório),
`src/game/charts.js` (2 gráficos de eixo Y fixo), `src/game/sfx.js` (sons Web
Audio). CSS escopado em **`.game-app`** (não interfere no Modo Análise); ids do
jogo usam prefixo `g-`.

**Roteamento:** `src/main.js` virou o roteador **Jogo ↔ Análise**; o antigo
painel-dashboard virou `src/analysis/index.js` (`initAnalysis`). `index.html`
tem o toggle no topo.

**App clássico removido (2026-07-17):** decidiu-se manter **um único app** (o da
raiz, com os dois modos). A pasta `/classic/` e o link "Clássico ↗" do cabeçalho
foram removidos. O que valia do clássico já estava portado (sons, quiz); a única
peça insubstituível — a **tabela de R₀ de doenças reais** (easter-egg futuro) —
foi salva em **`src/data/real-diseases.js`** (bilíngue). *Revoga a decisão de
manter `/classic/` registrada nas rodadas 1 e 4 acima.*

**Verificado nesta sessão:** `npm test` (15/15); `npm run build` (bundle OK,
146 KB); store headless (Cidade A encerra no dia 148 — mesma dinâmica do
protótipo —, plantões `detect→firstdeath→collapse→turnaround`, rewind devolve
orçamento e trunca compras); paridade pt/en de todas as chaves i18n.

**Gráficos: painel 2×2 com zoom automático (2026-07-17).** Notou-se que, com o
eixo fixo, a onda de infecciosos fica rente ao zero (172k contra ½N ≈ 5,95M) e
"demora a subir". Em vez de trocar o eixo fixo (que a rodada 2 escolheu de
propósito, pela magnitude/comparação), **acrescentou-se ao lado** uma versão com
**zoom automático**: o cockpit virou 2×2 — coluna esquerda = escala fixa (macro
½N; zoom clínico 2,5× cap), coluna direita = zoom "catraca". O eixo do zoom é
`niceMax(máximo da série até o dia atual)`: sobe em degraus redondos, trava no
pico e re-aperta no rewind — função pura do `dayIndex`, **sem estado novo**
(coerente com a Opção A). Cima-direita foca em I; baixo-direita foca em H com a
linha de capacidade (desenhada só quando cabe no quadro). Só camada de desenho —
motor e store intocados. Cockpit alargado (`.game-app .wrap` → 1320px).

**Pendências herdadas do §6** (não bloqueiam a migração): ampliar o catálogo de
manchetes (rumo a 60–80); ligar o easter-egg de R₀ de doenças reais na UI
(dados já em `src/data/real-diseases.js`).

---

## 9. Modo Jogo é a porta de entrada (2026-07-30)

**Decisão:** abrir o app **no Modo Jogo**, não no Modo Análise. Na migração do §8
o roteador nasceu com `mode = 'analysis'` — herança de quando o dashboard era o
único app —, então quem chegava na landing page caía no painel de exploração
livre. Para o público-alvo (estudante de medicina, primeira visita) o jogo é o
gancho; a Análise é o aprofundamento de quem já entendeu a dinâmica.

- `index.html` — aba **Jogo** nasce `active`; `#analysis-root` nasce
  `display:none` (antes era o `#game-root`).
- `src/main.js` — `mode = 'game'` e `setMode('game')` no `init()`.
- **Montagem preguiçosa dos dois modos.** `initAnalysis()` saiu do `init()` e
  agora roda na primeira vez que o modo Análise é aberto (espelhando o
  `gameMounted` que o jogo já tinha), com um `analysisMounted`. Evita rodar uma
  `runSimulation` + desenhar 4 gráficos que ninguém vai ver na abertura.
  `onLanguageChange` só chama `rerenderAnalysis()` se o dashboard existir.
  Ordem importa: no `setMode`, o `display` é ajustado **antes** do init, porque
  `drawLineChart` mede `canvas.clientWidth` — com o container escondido daria 0.

---

## 10. Abertura de plantão e identidade da marca (2026-07-30)

**Bug de fundo — o plantão de abertura nunca era exibido.** O usuário reportou
que a partida começava "muito silenciosa". A causa não era falta de conteúdo:
`store.initOutbreak()` posiciona `dayIndex` no dia da detecção e chama
`computeTimeline()` direto, mas o único produtor de plantões-modal era
`advanceDay()`, que filtra `f.day === state.dayIndex` **depois** do `dayIndex++`.
No primeiro tick o índice já valia `startDay + 1`, então o lote do dia da
detecção nunca casava — e, como cada regra fica registrada em `seen`, não podia
redisparar depois. O plantão `detect` (com o texto que explica que o vírus já
circulava há ~41 dias) e o `firstdeath` eram computados e engolidos.

- `store.js` ganhou `openingPlantoes()` (lote do `startDay`), consumido pela UI.
- `latestHeadline()` passou a preferir, dentro do dia mais recente, um item de
  tier `plantao`. Antes a TV abria em "Casos em aceleração" — o último item
  empurrado —, e não na manchete de detecção que acabara de acontecer.

**Abertura (`playIntro`).** O momento virou uma vinheta de telejornal em 4 fases
(`.p1`–`.p4` agendadas por `setTimeout`, animação toda em `@keyframes`): ruído de
vídeo + varredura → wipe vermelho → carimbo "PLANTÃO" com "AO VIVO" → manchete,
detalhe e botão. Overlay `#g-intro` em `z-index:130` (acima da capa, que é 100).
Pulável por clique, `Esc`, `Enter` ou espaço; sob `prefers-reduced-motion` salta
para o quadro final. Ao encerrar, os plantões restantes do mesmo dia entram na
fila normal e só então o relógio parte (`resumePlay` é forçado, porque
`enqueuePlantoes` memorizaria `playing === false`).

**Som — `newsSting()`.** Vinheta de ~2,2 s em quatro gestos: impacto grave
(90→45 Hz), três notas urgentes staccato, swell ascendente com o lowpass
abrindo, e acorde final de três saws desafinados. Exigiu um **barramento mestre**
(`gain → DynamicsCompressor → destination`): enquanto cada som era 1 oscilador
não havia problema, mas a vinheta sobrepõe até 4 vozes e a soma estourava.
`beep()` ganhou `detune`, `attack` e um lowpass opcional.

**Decisão de mídia:** descartados narração falada (Web Speech soa robótica e
varia por navegador) e vídeo (0,5–2 MB inviabilizam o `dist` autocontido, que
não tem loader de binários). A animação em CSS entrega o efeito com zero bytes
e é bilíngue por construção. *Se um dia entrar áudio gravado, será preciso
mexer em `scripts/build.mjs` — hoje ele só inline JS e CSS.*

**Identidade da marca.** Descobriu-se que o repo já tinha o ícone oficial
(`images/icons/`): carvão quente, anéis concêntricos laranja/verde. A capa
criada horas antes ignorava isso (vírus genérico, gradiente azul→vermelho). Os
anéis foram redesenhados como **SVG inline** (são círculos; ~6 linhas) — usar o
PNG quebraria o dist autocontido e o `rnaught_icon_embedded.svg` tem 149 KB por
causa da fonte embutida. A capa foi repaletizada para a marca.
*Custo assumido:* o gradiente azul→vermelho ecoava a paleta suscetível→infeccioso
dos gráficos; essa leitura se perdeu em troca de coerência com o ícone.

**Verificado:** `npm test` 15/15; build 180 KB e **sem nenhuma referência
externa a arquivos** (dist segue autocontido); i18n 269/269 em paridade;
capturas headless confirmando a manchete de detecção na tela (antes ausente), o
caminho de movimento reduzido e o jogo seguindo normalmente após a abertura.
