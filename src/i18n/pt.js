/**
 * pt.js — dicionario de strings em Portugues (BR).
 * Toda string visivel ao usuario passa por aqui (nunca hardcode na UI).
 */
export default {
  'app.title': 'Simulador Epidemiologico — Educacional',
  'app.subtitle': 'Entenda como parametros demograficos e virais moldam uma epidemia',
  'app.mode.sandbox': 'Modo Livre',
  'app.mode.scenarios': 'Cenarios',
  'app.run': 'Simular',
  'app.reset': 'Reiniciar',
  'app.language': 'Idioma',
  'section.pathogen': 'Patogeno',
  'section.cities': 'Cidades',
  'section.interventions': 'Intervencoes',

  // Cidades (anonimizadas)
  'city.A.name': 'Cidade A',
  'city.A.desc': 'Megacidade densa, transporte intenso, saneamento alto. Epidemia rapida.',
  'city.B.name': 'Cidade B',
  'city.B.desc': 'Litoranea e desigual: boa cobertura media, grandes bolsoes sem saneamento.',
  'city.C.name': 'Cidade C',
  'city.C.desc': 'Saneamento baixo e geograficamente isolada. Chegada tardia, alto risco hidrico.',

  // Parametros demograficos
  'param.population': 'Populacao',
  'param.density': 'Densidade urbana (hab/km2)',
  'param.sanitation': 'Cobertura de saneamento',
  'param.connectivity': 'Mobilidade / transporte',
  'param.hospitalCapacity': 'Capacidade hospitalar (leitos)',

  // Parametros do virus
  'param.R0': 'R0 (transmissibilidade)',
  'param.latentPeriod': 'Periodo de latencia (dias)',
  'param.infectiousPeriod': 'Periodo infeccioso (dias)',
  'param.hospRate': 'Taxa de hospitalizacao',
  'param.ifr': 'Letalidade por infeccao (IFR)',
  'param.route': 'Via de transmissao',
  'route.respiratory': 'Respiratoria',
  'route.fecal_oral': 'Fecal-oral / hidrica',
  'route.contact': 'Contato / fomite',
  'route.vector': 'Vetorial',

  // Patogenos
  'pathogen.resp_moderate': 'Respiratorio moderado',
  'pathogen.resp_high_transmission': 'Respiratorio muito transmissivel (baixa letalidade)',
  'pathogen.severe_low_transmission': 'Grave e pouco transmissivel (alta letalidade)',
  'pathogen.waterborne': 'Hidrico (sensivel a saneamento)',

  // Intervencoes
  'interv.distancing': 'Distanciamento social',
  'interv.masks': 'Mascaras / ventilacao',
  'interv.sanitation': 'Saneamento emergencial',
  'interv.mobility_restriction': 'Restricao de mobilidade',
  'interv.vaccination': 'Vacinacao',

  // Metricas
  'metric.peakOccupancy': 'Pico de ocupacao hospitalar',
  'metric.attackRate': 'Taxa de ataque (% infectados)',
  'metric.attackRateGap': 'Diferenca de taxa de ataque (C - A)',
  'metric.totalDeaths': 'Obitos totais',
  'metric.peakInfectious': 'Pico de infecciosos',
  'metric.peakDay': 'Dia do pico',
  'metric.Rt': 'R efetivo (Rt)',
  'metric.herdThreshold': 'Limiar de imunidade de rebanho',

  // Graficos
  'chart.epidemicCurve': 'Curva epidemica',
  'chart.rt': 'R efetivo ao longo do tempo',
  'chart.hospital': 'Ocupacao hospitalar vs capacidade',
  'chart.axis.days': 'Dias',
  'chart.axis.people': 'Pessoas',
  'chart.legend.S': 'Suscetiveis',
  'chart.legend.E': 'Expostos',
  'chart.legend.I': 'Infecciosos',
  'chart.legend.H': 'Hospitalizados',
  'chart.legend.R': 'Recuperados',
  'chart.legend.D': 'Obitos',

  // Cenarios
  'scenario.flatten.title': '1 · Achate a curva',
  'scenario.flatten.desc': 'Um virus respiratorio moderado chega a Cidade A.',
  'scenario.flatten.objective': 'Impeca que a ocupacao hospitalar ultrapasse 100% usando apenas distanciamento e mascaras.',
  'scenario.sanitation.title': '2 · Saneamento importa?',
  'scenario.sanitation.desc': 'O mesmo virus hidrico em cidades com saneamento diferente.',
  'scenario.sanitation.objective': 'Compare a Cidade A (saneamento alto) com a Cidade C (baixo). Observe por que a rota de transmissao muda tudo.',
  'scenario.tradeoff.title': '5 · Transmissibilidade vs severidade',
  'scenario.tradeoff.desc': 'R0 alto com letalidade baixa, ou o oposto?',
  'scenario.tradeoff.objective': 'Compare um virus muito transmissivel e pouco letal com um pouco transmissivel e muito letal. Qual causa mais mortes?',
  'scenario.success': 'Objetivo atingido!',
  'scenario.fail': 'Ainda nao — ajuste os parametros e tente de novo.',

  // Avisos
  'disclaimer': 'Modelo simplificado para ensino. Nao e ferramenta de previsao nem de decisao de saude publica.',
};
