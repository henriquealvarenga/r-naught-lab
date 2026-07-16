# MODEL_MATH — equações, parâmetros e mapeamento de dados

Este documento é a fonte de verdade matemática. Leia antes de alterar
`src/engine/model.js`.

## 1. Compartimentos (por cidade i)

`S → E → I → {H, R}` e `H → {R, D}`.

| Símbolo | Significado |
|---------|-------------|
| S | suscetíveis |
| E | expostos (infectados, ainda não infecciosos) — latência |
| I | infecciosos |
| H | hospitalizados |
| R | recuperados/imunes |
| D | óbitos |

`N_i = S+E+I+H+R` (população viva). O total `N_i + D_i` é conservado.

## 2. Equações

```
λ_i(t) = betaEff_i(t) · ( prev_i + coupling · Σ_{j≠i} M_ij · mobMult(t) · prev_j )
prev_i = I_i / N_i

dS/dt = − λ_i S_i − vax_i S_i
dE/dt =   λ_i S_i − σ E_i
dI/dt =   σ E_i − γ I_i
dH/dt =   h γ I_i − ρ H_i − (δ_H H_i + overflow_i)
dR/dt =   (1−h) γ I_i + ρ H_i + vax_i S_i
dD/dt =   δ_H H_i + overflow_i

overflow_i = OVERFLOW_MORTALITY · max(0, H_i − capacidade_i)
```

## 3. β efetivo (onde entram densidade, saneamento e intervenções)

```
betaEff_i(t) = betaBase · contato_i · (1 − k · w_i^eff) · intervBeta_i(t)
betaBase     = R0 · γ
contato_i    = (densidade_i / DENSIDADE_REF)^α          (α = 0.4, sublinear)
w_i^eff      = min(1, saneamento_i + reforçoSaneamento_i(t))
k            = sensibilidade da VIA de transmissão ao saneamento
```

`k` por via (em `config/constants.js → TRANSMISSION_ROUTES`):
respiratória 0.05 · contato/fômite 0.40 · fecal-oral/hídrica 0.80 · vetorial 0.10.
→ É por isso que melhorar saneamento derruba uma epidemia hídrica e quase não
mexe numa respiratória (demonstrado no teste [6]).

## 4. Taxas derivadas dos parâmetros clínicos

Entrada do usuário: `R0, latentPeriod, infectiousPeriod, hospRate (h), ifr, hospStay`.

```
σ      = 1 / latentPeriod
γ      = 1 / infectiousPeriod
betaBase = R0 · γ
fatalidadeNoHospital = ifr / h            (requer h ≥ ifr)
δ_H    = fatalidadeNoHospital · (1/hospStay)
ρ      = (1 − fatalidadeNoHospital) · (1/hospStay)
```

**Invariante:** `h ≥ ifr` — a letalidade não pode exceder a hospitalização, pois
os óbitos saem de H. Presets em `data/pathogens.js` respeitam isso.

## 5. Métricas

```
R0_local_i = betaEff_i / γ                 (R0 efetivo local, com densidade/saneamento/intervenção)
Rt_i       = R0_local_i · (S_i / N_i)       (R efetivo instantâneo)
limiar de imunidade de rebanho = 1 − 1/R0
tamanho final (teoria)         = solução de z = 1 − e^{−R0 z}
```

Identidade usada nos testes: no pico de `P = E + I`, `dP/dt = 0 ⇒ β S/N = γ ⇒
Rt = 1`. (O pico de `I` sozinho fica atrasado pela latência — por isso o teste
usa `E+I`.)

## 6. Metapopulação (mobilidade)

```
M_ij = baseCoupling · conn_i · conn_j        (i≠j; 0 na diagonal)
```

`conn_i ∈ [0,1]` vem de `city.connectivity` (transporte/mobilidade). Cidades com
baixa conectividade importam/exportam menos infecção → pico mais tardio
(demonstrado no teste [7]). `baseCoupling ≈ 0.05`.

## 7. Numérico

- Integração: **RK4** com passo fixo `dt = 0.25 dia` (4 passos/dia).
- Clamp anti-ruído: compartimentos negativos por erro numérico são zerados após
  cada passo.
- Precisão validada: tamanho final bate com a teoria em ±2% para R0 ∈ {1.5, 2.5, 4}.

## 8. Mapeamento dados reais → parâmetros (resumo)

| Dado real | Parâmetro | Como entra |
|-----------|-----------|------------|
| Densidade urbana efetiva | `density` | `contato_i = (dens/5000)^0.4` |
| Cobertura de esgoto | `sanitation` (w) | `(1 − k·w)` em β, com k pela via |
| Transporte/mobilidade | `connectivity` | matriz `M_ij` |
| Leitos de alta complexidade | `hospitalCapacity` | limiar de colapso (overflow) |

Detalhe por cidade e fontes: `DATA_REFERENCE_INTERNAL.md` (uso interno).

## 9. Faixas plausíveis (para ancorar sliders — inspiradas em literatura)

- Latência: 1–7 dias (respiratórios comuns); infeccioso: 4–10 dias.
- R0: sazonais ~1.3; pandêmicos respiratórios 2–3; sarampo 12–18 (fora da faixa
  padrão do slider de propósito).
- IFR: de <0.1% (muitos respiratórios) a 15–50% (doenças graves tipo Ebola).
- hospStay: 7–14 dias.

> Os presets usam rótulos genéricos (não nomeiam vírus reais) por decisão de
> design pedagógico. As faixas são plausíveis, não calibrações de um patógeno
> específico. Este é um modelo de ENSINO.
