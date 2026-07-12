# R-naught Lab — Simulador de R₀ e Dinâmica de Epidemias

Laboratório **interativo e educacional** sobre o **número básico de reprodução (R₀, "R-naught")**.
Escrito em **JavaScript puro + D3.js v7 + CSS puro**, sem etapa de build — basta abrir o `index.html`.
É a adaptação para a web de um simulador originalmente feito em **R Shiny**.

🌐 **Demo:** _(GitHub Pages)_ — habilite Pages apontando para o branch `main` (raiz).

## O que ele faz

Dois níveis, do simples ao realista:

- **Nível 1 — Crescimento exponencial:** compara dois cenários (A e B) com
  `inc[k] = inc[k-1] × R₀` (ou seja, `i₀ · R₀ᵏ`). Alterna entre casos acumulados e por ciclo,
  escala log, tabela em formato brasileiro (vírgula decimal) e **download CSV** (internacional ou BR).
  Mostra ainda **tempo de duplicação** e **limiar de imunidade de rebanho** (`1 − 1/R₀`).
- **Nível 2 — Modelo SIR:** integra `S' = −βSI/N`, `I' = βSI/N − γI`, `R' = γI` (com `β = R₀·γ`,
  `γ = 1/D`). Exibe as curvas S/I/R, o **pico de infectados**, o **tamanho final do surto**,
  o **R efetivo** `R_t = R₀·S/N` e um **overlay exponencial** que evidencia onde a curva real satura.

Além disso: **desafios gamificados** (estime o R₀, preveja casos, imunidade de rebanho), **quiz**
conceitual com correção, e um easter-egg com o R₀ de doenças reais.

## Como rodar localmente

Como é um site estático, qualquer servidor simples serve:

```bash
cd r-naught-lab
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

```
index.html      # estrutura e seções; carrega os scripts em ordem de dependência
styles.css      # design system (tokens em :root) + layout responsivo
js/
  format.js     # formatação pt-BR + exportação CSV        [~ utils.R]
  epi.js        # modelos: exponencial (N1) e SIR (N2)      [~ modelo.R]
  state.js      # estado global mutável
  datasets.js   # presets, R₀ de doenças reais, rodadas
  quiz.js       # banco de perguntas conceituais
  plot.js       # gráficos D3
  sim.js        # camada reativa dos simuladores
  game.js       # gamificação (rodadas, pontuação, timer)
  screens.js    # navegação entre seções e telas
  app.js        # entry point
```

## Limitações

Modelo **simplificado e determinístico**, com finalidade **exclusivamente educacional**. Não considera
heterogeneidade de contatos, dinâmica estocástica, medidas de saúde pública ou variação biológica.
**Não** deve ser usado como previsão de epidemias reais nem como base para decisões clínicas.

## Autor

**Henrique Alvarenga** — Médico Psiquiatra; Professor de Medicina (UNIPTAN e UFSJ).
🌐 [henriquealvarenga.com](https://www.henriquealvarenga.com) ·
📚 [Lattes](http://lattes.cnpq.br/6147640440978297)

## Licença

[MIT](LICENSE).
