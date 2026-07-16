# Design & Especificação — Simulador Epidemiológico Educacional
### "Um anti-Plague para estudantes de medicina"
### (Metapopulação multi-cidade · Sandbox + Cenários guiados · Bilíngue PT-BR / EN)

---

## 1. Visão geral e diferencial

O objetivo **não** é exterminar a humanidade, e sim **entender causalidade epidemiológica**: como cada
parâmetro demográfico e viral altera o formato da curva epidêmica, o pico hospitalar, o número de mortes e
o momento do controle. O jogador ganha não por matar, mas por **compreender e intervir** — por exemplo,
manter a ocupação de UTI abaixo da capacidade, ou minimizar mortes com recursos limitados.

Posicionamento em uma frase: *"O Plague Inc. te faz torcer pelo vírus; este app te faz pensar como
epidemiologista."*

O núcleo é um modelo de **metapopulação**: várias cidades/regiões, cada uma rodando um modelo
compartimental, conectadas por uma matriz de mobilidade (transporte). Isso torna tangíveis exatamente os
parâmetros que você listou: população, mobilidade, contato social, saneamento e transporte.

---

## 2. Público-alvo e objetivos de aprendizagem

**Público:** estudantes de medicina (graduação, ciclo básico e saúde coletiva), residentes de infectologia,
epidemiologia e MFC. Secundariamente, cursos de enfermagem e saúde pública.

Ao final, o estudante deve ser capaz de:

- Explicar intuitivamente R₀, R efetivo (Rₜ) e a condição de limiar (Rₜ = 1) para crescimento vs. declínio.
- Distinguir **transmissibilidade** de **severidade** e entender por que não são a mesma coisa.
- Interpretar uma curva epidêmica (incidência, prevalência, pico, cauda) e o conceito de "achatar a curva".
- Relacionar imunidade de rebanho ao limiar 1 − 1/R₀.
- Descrever o efeito de intervenções não farmacológicas (distanciamento, máscara, isolamento), saneamento
  e vacinação sobre Rₜ.
- Compreender como mobilidade e transporte espalham a doença **entre** regiões (dinâmica espaço-temporal).
- Diferenciar CFR (letalidade de casos) de IFR (letalidade de infecções) e por que a vigilância importa.

---

## 3. Modelo matemático

### 3.1 Compartimentos (por cidade *i*)

Proposta: **SEIHRD com estratificação etária opcional**. É rico o suficiente para ser clinicamente
relevante (hospitalização e morte aparecem explicitamente), sem ser pesado demais para rodar no navegador.

| Sigla | Compartimento | Relevância didática |
|------|----------------|---------------------|
| S | Suscetíveis | base da imunidade de rebanho |
| E | Expostos (infectados, ainda não infecciosos) | período de latência/incubação |
| I | Infecciosos | transmissão ativa |
| H | Hospitalizados | conecta com capacidade do sistema de saúde |
| R | Recuperados/imunes | imunidade acumulada |
| D | Óbitos | desfecho |

Extensões previstas em fases posteriores: compartimento **A** (assintomáticos), **V** (vacinados) e
estratificação por faixa etária (crianças / adultos / idosos), que muda contato e IFR.

### 3.2 Equações (uma cidade, sem estrutura etária)

Com N = S+E+I+H+R (vivos), força de infecção λ:

```
λ_i(t) = β_i(t) · (I_i + Σ_j m_ij · I_j) / N_i

dS/dt = −λ_i S_i
dE/dt =  λ_i S_i − σ E_i
dI/dt =  σ E_i − γ I_i
dH/dt =  h · γ I_i − (ρ + δ_H) H_i
dR/dt =  (1−h) γ I_i + ρ H_i
dD/dt =  δ_H H_i
```

Onde:
- **β_i(t)** = taxa de transmissão efetiva na cidade *i* (depende de contato social, saneamento, modo de
  transmissão e intervenções — ver §4).
- **σ** = 1/período de latência (E→I).
- **γ** = 1/período infeccioso (I→saída).
- **h** = fração dos casos infecciosos que hospitaliza.
- **ρ** = taxa de alta hospitalar; **δ_H** = taxa de óbito hospitalar.
- **m_ij** = termo de mobilidade: contribuição de infecciosos da cidade *j* para a força de infecção em *i*.

Relação-chave exibida ao aluno o tempo todo:  **R₀ = β / γ**  e  **Rₜ = R₀ · S/N · (fatores de
intervenção)**. Mostrar Rₜ cruzando 1 é o "momento eureca" pedagógico.

### 3.3 Integração numérica

- Método: **Runge-Kutta 4ª ordem (RK4)** com passo fixo (ex.: dt = 0,25 dia) — estável e leve em JS.
- Opção estocástica (fase 2): **tau-leaping** ou cadeia de Markov para mostrar variabilidade e extinção
  em populações pequenas (importante para ensinar incerteza).
- Alvo de desempenho: até ~20 cidades × 6–9 compartimentos rodando a 30–60 fps no navegador.

---

## 4. Como cada parâmetro entra no modelo

Esta seção é o coração pedagógico: cada slider precisa ter um **efeito matemático explícito e explicável**,
não um número mágico.

### 4.1 Parâmetros demográficos

- **População (N_i):** escala dos compartimentos; afeta estocasticidade (populações pequenas podem extinguir
  a epidemia por acaso) e magnitude absoluta de mortes.
- **Densidade / contato social (c_i):** entra em β via β = probabilidade de transmissão por contato × número
  de contatos por dia. Mais contato ⇒ maior β ⇒ maior R₀. É o parâmetro que o distanciamento social reduz.
- **Saneamento (w_i ∈ [0,1]):** modula β **apenas para vírus com rota fecal-oral/hídrica ou por fômites**
  (ex.: multiplicador (1 − k·w_i)). Para vírus estritamente respiratórios, o efeito é pequeno — ótimo para
  ensinar que "a mesma medida tem efeitos diferentes conforme o modo de transmissão".
- **Mobilidade intraurbana:** ajusta o contato efetivo c_i dentro da cidade.
- **Transporte / mobilidade interurbana (m_ij):** define a matriz de acoplamento entre cidades — quanto de
  fluxo de pessoas entre *i* e *j*. Controla a **velocidade de propagação espacial** e o atraso entre picos
  de cidades diferentes. É aqui que fechar fronteiras / reduzir voos aparece.

### 4.2 Parâmetros do vírus

- **Modo de transmissão** (respiratório por gotícula/aerossol, contato/fômite, fecal-oral/hídrico,
  vetorial): seletor que **redireciona quais parâmetros demográficos importam** (ex.: saneamento pesa em
  fecal-oral; ventilação/máscara pesa em aerossol; vetorial abre parâmetros de clima/vetor em fase futura).
- **R₀:** definido pelo aluno ou derivado de β e γ. Mostrar as duas direções (calcular β a partir de R₀·γ).
- **Período de latência (1/σ)** e **período infeccioso (1/γ):** deslocam e alargam a curva; ensinam por que
  a incubação afeta a janela de rastreamento de contatos.
- **Letalidade:** distinguir **IFR** (sobre infectados) e **CFR** (sobre casos detectados), ligadas a δ_H,
  h e à taxa de detecção. Ensina o viés de subnotificação.
- **Fração de hospitalização (h):** liga o vírus ao estresse do sistema de saúde.
- **Imunidade / reinfecção (fase 2):** taxa de perda de imunidade (R→S) para mostrar ondas recorrentes.

### 4.3 Intervenções (o que o jogador "joga")

- Distanciamento social / lockdown → reduz c ⇒ reduz β (com custo/fadiga ao longo do tempo).
- Máscaras / ventilação → multiplicador em β para rota respiratória.
- Melhoria de saneamento → aumenta w (rota fecal-oral).
- Isolamento de casos / rastreamento de contatos → reduz o tempo infeccioso efetivo.
- Restrição de transporte → reduz m_ij (com custo econômico).
- **Vacinação** → move S→R a uma taxa (cobertura × eficácia), com logística e hesitação como limitadores.
- Expansão de leitos/UTI → aumenta a capacidade-alvo (não muda a biologia, mas muda o desfecho D quando H
  excede a capacidade — mortalidade por colapso).

Cada intervenção tem **custo** (orçamento, capital político/fadiga) para forçar trade-offs reais — é o que
substitui a mecânica de "pontos de DNA" do Plague por decisões de saúde pública.

---

## 5. Métricas e telas de saída (o que o aluno vê)

- **Curva epidêmica** por cidade e agregada: incidência diária, prevalência de I, H, D acumulado.
- **Rₜ ao longo do tempo** com a linha de referência Rₜ = 1 destacada.
- **Ocupação hospitalar vs. capacidade** — a barra que "estoura" é o gancho dramático (equivalente
  pedagógico do "achatar a curva").
- **Mapa das cidades** com propagação espacial animada (cores por prevalência) e setas de mobilidade.
- **Placar de desfechos:** total de infectados, mortes, pico de UTI, dia do pico, % da população imune,
  custo das intervenções.
- **Painel "por que isso aconteceu"**: texto dinâmico que interpreta o resultado (ex.: "Rₜ caiu abaixo de 1
  no dia 62 porque a cobertura vacinal ultrapassou o limiar de imunidade de rebanho de 1 − 1/R₀ = 67%").

---

## 6. Modos de uso

### 6.1 Sandbox (livre)
Todos os controles abertos; o aluno explora, compara execuções lado a lado ("run A vs. run B") e salva
configurações. Ideal para construir intuição e para o professor demonstrar ao vivo.

### 6.2 Cenários guiados (missões)
Cada cenário = estado inicial + objetivo + restrição + pergunta didática + critério de sucesso + explicação
final. Exemplos de cenários iniciais:

1. **"Achate a curva"** — impeça que a ocupação de UTI ultrapasse 100% mexendo apenas em distanciamento.
2. **"Saneamento importa?"** — mesmo vírus, duas cidades (saneamento alto vs. baixo); compare desfechos por
   rota respiratória e depois por rota fecal-oral.
3. **"A vacina chegou tarde"** — introduza vacinação em momentos diferentes e observe o efeito no pico.
4. **"Fecha ou não fecha o aeroporto?"** — trade-off entre reduzir m_ij (custo econômico) e atrasar a
   chegada da epidemia à segunda cidade.
5. **"R₀ alto, letalidade baixa vs. R₀ baixo, letalidade alta"** — desfaz a confusão transmissibilidade ×
   severidade.

Progressão sugerida: desbloqueio linear no começo, depois livre. Cada missão fecha com o painel explicativo
e um mini-quiz de 1–2 perguntas conceituais.

> **Redução de escopo (se quiser começar menor):** o MVP pode entregar só o **Sandbox** com 2–3 cidades e os
> cenários 1 e 2. Os demais cenários e a estocasticidade entram em fases seguintes.

---

## 7. Arquitetura técnica proposta

- **Frontend/único arquivo (MVP):** HTML + JS puro (ou React via CDN), motor de simulação em JS, gráficos com
  uma lib leve (ex.: Chart.js ou D3), tudo autocontido — roda em qualquer navegador, sem backend.
- **Motor de simulação:** módulo separado (integrador RK4 + definição de compartimentos + matriz de
  mobilidade), testável isoladamente com casos de validação.
- **Estado da UI:** em memória (sem localStorage nas versões em artifact); salvar/exportar cenário como JSON
  para download.
- **Evolução (Base44 ou similar):** contas de aluno/professor, salvar cenários na nuvem, painel de turma,
  criação de missões pelo professor. Migração natural quando o modelo estiver validado.

---

## 8. Internacionalização (bilíngue)

- Todos os textos em um dicionário de strings `{ pt: {...}, en: {...} }`, com alternador PT/EN no cabeçalho.
- Terminologia técnica com o termo em inglês entre parênteses na primeira aparição (ex.: "latência
  (latent period)"), útil para leitura de literatura internacional.
- Unidades e formatação numérica adaptadas ao idioma.

---

## 9. Validação científica e responsabilidade

- **Testes de sanidade do motor:** sem intervenção, verificar que o tamanho final da epidemia bate com a
  equação do *final size* (relação com R₀); que Rₜ = 1 no pico; que imunidade de rebanho ocorre em 1 − 1/R₀.
- **Faixas de parâmetros plausíveis** pré-carregadas a partir de literatura (com fontes), para os alunos
  ancorarem em valores reais (ex.: latência de influenza vs. sarampo).
- **Aviso pedagógico explícito** na abertura: é um modelo simplificado para ensino, não uma ferramenta de
  previsão nem de decisão de saúde pública — na linha do que a própria Ndemic diz sobre o Plague Inc.

---

## 10. Roadmap sugerido

**Fase 1 — MVP jogável (design → protótipo):**
Motor SEIHRD determinístico, 3 cidades com mobilidade, sliders demográficos e virais, curvas + Rₜ +
ocupação hospitalar, sandbox, cenários 1 e 2, bilíngue.

**Fase 2 — Profundidade epidemiológica:**
Estocasticidade, estrutura etária, assintomáticos, vacinação e reinfecção, mapa animado, todos os cenários,
mini-quizzes.

**Fase 3 — Produto educacional:**
Migração para app hospedado, contas e turmas, editor de cenários para professores, exportação de relatórios
de desempenho do aluno, biblioteca de "vírus" reais parametrizados.

---

## 11. Próximas decisões que preciso de você

1. Confirmar o **conjunto de compartimentos** (SEIHRD proposto vs. SEIR mais enxuto para o MVP).
2. Número de **cidades no MVP** (sugiro 3) e se elas representam regiões genéricas ou cidades reais.
3. Quais **cenários** entram primeiro.
4. Se seguimos para o **protótipo em HTML** logo após o design, ou se você quer revisar/ajustar este
   documento antes.
