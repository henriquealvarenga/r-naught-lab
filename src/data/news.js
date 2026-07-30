/**
 * data/news.js
 * -----------------------------------------------------------------------------
 * Sistema de noticias "SNN" (Saude News Network) do Modo Jogo, portado do
 * prototipo (docs/prototypes/game-mockup.html) para dados declarativos + i18n.
 *
 * Cada regra dispara UMA vez por partida (id em `seen`). Duas camadas:
 *   tier: 'feed'    -> troca a manchete na TV, NAO pausa.
 *   tier: 'plantao' -> modal que PAUSA o jogo e explica um conceito-pivô.
 *
 * Selecao 100% DETERMINISTICA: os gatilhos `when(c)` leem apenas o estado do
 * motor — nada de Math.random. NENHUMA string aqui: `catKey/headKey/detailKey`
 * apontam para i18n (pt/en) e `params(c)` fornece os valores interpolados
 * (ex.: R0, nome da cidade) que a UI injeta nos placeholders `{chave}`.
 *
 * Contexto `c` (montado por src/game/store.js a cada dia):
 *   { day, S,E,I,H,R,D,N, occ, rt, deaths, casos, peakI, peakOcc,
 *     active:Set<engineType>, cityName, r0, routeLabel }
 */

export const NEWS_RULES = [
  // ---- PLANTOES (pausam o jogo; explicam um conceito) ----
  {
    id: 'detect', tier: 'plantao', cat: 'news.cat.breaking', e: '🔬',
    when: (c) => c.day >= 2,
    headKey: 'news.detect.head', detailKey: 'news.detect.detail',
    params: (c) => ({ city: c.cityName, r0: c.r0.toFixed(1), route: c.routeLabel.toLowerCase() }),
  },
  {
    id: 'firstdeath', tier: 'plantao', cat: 'news.cat.mourning', e: '⚰️',
    when: (c) => c.deaths >= 1,
    headKey: 'news.firstdeath.head', detailKey: 'news.firstdeath.detail',
  },
  {
    id: 'collapse', tier: 'plantao', cat: 'news.cat.crisis', e: '🏥',
    when: (c) => c.occ >= 1,
    headKey: 'news.collapse.head', detailKey: 'news.collapse.detail',
  },
  {
    id: 'turnaround', tier: 'plantao', cat: 'news.cat.turnaround', e: '📉',
    when: (c) => c.rt < 1 && c.day > 8 && c.casos > 10000,
    headKey: 'news.turnaround.head', detailKey: 'news.turnaround.detail',
  },

  // ---- FEED (nao pausa) ----
  { id: 'growth', tier: 'feed', cat: 'news.cat.epidemic', e: '📈',
    when: (c) => c.rt > 1.3 && c.casos > 500, headKey: 'news.growth.head' },
  { id: 'peak', tier: 'feed', cat: 'news.cat.epidemic', e: '📊',
    when: (c) => c.peakI > 2000 && c.I < c.peakI * 0.9 && c.day > 15, headKey: 'news.peak.head' },
  { id: 'd100', tier: 'feed', cat: 'news.cat.tally', e: '⚰️',
    when: (c) => c.deaths >= 100, headKey: 'news.d100.head' },
  { id: 'd1k', tier: 'feed', cat: 'news.cat.tally', e: '⚰️',
    when: (c) => c.deaths >= 1000, headKey: 'news.d1k.head' },
  { id: 'd10k', tier: 'feed', cat: 'news.cat.tally', e: '⚰️',
    when: (c) => c.deaths >= 10000, headKey: 'news.d10k.head' },
  { id: 'd100k', tier: 'feed', cat: 'news.cat.tally', e: '🕯️',
    when: (c) => c.deaths >= 100000, headKey: 'news.d100k.head' },
  { id: 'occ70', tier: 'feed', cat: 'news.cat.health', e: '🏥',
    when: (c) => c.occ >= 0.7 && c.occ < 1, headKey: 'news.occ70.head' },
  { id: 'occ90', tier: 'feed', cat: 'news.cat.health', e: '🚨',
    when: (c) => c.occ >= 0.9 && c.occ < 1, headKey: 'news.occ90.head' },
  { id: 'relief', tier: 'feed', cat: 'news.cat.health', e: '🌤️',
    when: (c) => c.peakOcc >= 1 && c.occ < 0.8, headKey: 'news.relief.head' },
  { id: 'emergency', tier: 'feed', cat: 'news.cat.government', e: '📋',
    when: (c) => c.casos > 3000, headKey: 'news.emergency.head' },
  { id: 'misinfo', tier: 'feed', cat: 'news.cat.social_media', e: '📱',
    when: (c) => c.day >= 40 && c.casos > 5000, headKey: 'news.misinfo.head' },
  { id: 'tests', tier: 'feed', cat: 'news.cat.science', e: '🔬',
    when: (c) => c.day >= 25, headKey: 'news.tests.head' },
  { id: 'vtrial', tier: 'feed', cat: 'news.cat.science', e: '💉',
    when: (c) => c.day >= 60, headKey: 'news.vtrial.head' },
  { id: 'applause', tier: 'feed', cat: 'news.cat.city', e: '👏',
    when: (c) => c.day >= 12, headKey: 'news.applause.head' },
  { id: 'solidarity', tier: 'feed', cat: 'news.cat.city', e: '🤝',
    when: (c) => c.day >= 22 && c.casos > 800, headKey: 'news.solidarity.head' },
  { id: 'protests', tier: 'feed', cat: 'news.cat.city', e: '📢',
    when: (c) => c.active.has('distancing') && c.day >= 70,
    headKey: 'news.protests.head', params: (c) => ({ city: c.cityName }) },
  { id: 'fatigue', tier: 'feed', cat: 'news.cat.city', e: '😮‍💨',
    when: (c) => c.active.has('distancing') && c.day >= 100, headKey: 'news.fatigue.head' },

  // ---- ecos das intervencoes do jogador ----
  { id: 'echo-distancing', tier: 'feed', cat: 'news.cat.government', e: '🚧',
    when: (c) => c.active.has('distancing'), headKey: 'news.echo.distancing.head' },
  { id: 'echo-masks', tier: 'feed', cat: 'news.cat.government', e: '😷',
    when: (c) => c.active.has('masks'), headKey: 'news.echo.masks.head' },
  { id: 'echo-isolation', tier: 'feed', cat: 'news.cat.government', e: '🔎',
    when: (c) => c.active.has('isolation'), headKey: 'news.echo.isolation.head' },
  { id: 'echo-sanitation', tier: 'feed', cat: 'news.cat.sanitation', e: '🚰',
    when: (c) => c.active.has('sanitation'), headKey: 'news.echo.sanitation.head' },
  { id: 'echo-vaccination', tier: 'feed', cat: 'news.cat.health', e: '💉',
    when: (c) => c.active.has('vaccination'), headKey: 'news.echo.vaccination.head' },
  { id: 'echo-beds', tier: 'feed', cat: 'news.cat.health', e: '🏥',
    when: (c) => c.active.has('beds'), headKey: 'news.echo.beds.head' },
];
