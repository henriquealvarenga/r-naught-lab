/**
 * ui/controls.js
 * -----------------------------------------------------------------------------
 * Constroi os controles (sliders, selects, toggles) e os liga ao store. Cada
 * controle e descrito de forma declarativa (nome da chave, faixa, passo, se e
 * de patogeno ou de cidade). Adicionar um novo parametro = uma linha na tabela.
 */

import { t } from '../i18n/index.js';
import { updatePathogenParam, updateCityParam, setPathogen } from '../state/store.js';
import { PATHOGENS } from '../data/pathogens.js';

/** Descricao declarativa dos sliders do patogeno. */
const PATHOGEN_SLIDERS = [
  { key: 'R0', min: 0.5, max: 8, step: 0.1 },
  { key: 'latentPeriod', min: 1, max: 14, step: 1 },
  { key: 'infectiousPeriod', min: 1, max: 21, step: 1 },
  { key: 'hospRate', min: 0.005, max: 0.5, step: 0.005, pct: true },
  { key: 'ifr', min: 0.0, max: 0.3, step: 0.001, pct: true },
];

/** Descricao declarativa dos sliders por cidade. */
const CITY_SLIDERS = [
  { key: 'density', min: 500, max: 12000, step: 100 },
  { key: 'sanitation', min: 0, max: 1, step: 0.01, pct: true },
  { key: 'connectivity', min: 0, max: 1, step: 0.01, pct: true },
  { key: 'hospitalCapacity', min: 200, max: 30000, step: 100 },
];

function slider({ labelText, value, min, max, step, pct, onInput }) {
  const wrap = document.createElement('label');
  wrap.className = 'ctrl';
  const head = document.createElement('div');
  head.className = 'ctrl-head';
  const name = document.createElement('span');
  name.textContent = labelText;
  const val = document.createElement('span');
  val.className = 'ctrl-val';
  const show = (v) => (val.textContent = pct ? (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%' : v);
  show(value);
  head.append(name, val);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.step = step; input.value = value;
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    show(v);
    onInput(v);
  });
  wrap.append(head, input);
  return wrap;
}

/** Renderiza o painel de controles do patogeno dentro de `container`. */
export function renderPathogenControls(container, config) {
  container.innerHTML = '';

  // Seletor de preset
  const sel = document.createElement('select');
  sel.className = 'preset-select';
  for (const p of PATHOGENS) {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = t(p.labelKey);
    if (p.id === config.pathogen.id) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener('change', () => setPathogen(sel.value));
  container.append(sel);

  // Via de transmissao (afeta o peso do saneamento)
  const routeRow = document.createElement('div');
  routeRow.className = 'ctrl';
  const routeLabel = document.createElement('div');
  routeLabel.className = 'ctrl-head';
  routeLabel.innerHTML = `<span>${t('param.route')}</span><span class="ctrl-val">${t('route.' + config.pathogen.route)}</span>`;
  routeRow.append(routeLabel);
  container.append(routeRow);

  for (const s of PATHOGEN_SLIDERS) {
    container.append(slider({
      labelText: t('param.' + s.key),
      value: config.pathogen[s.key],
      min: s.min, max: s.max, step: s.step, pct: s.pct,
      onInput: (v) => updatePathogenParam(s.key, v),
    }));
  }
}

/** Renderiza os controles por cidade. */
export function renderCityControls(container, config) {
  container.innerHTML = '';
  for (const city of config.cities) {
    const card = document.createElement('div');
    card.className = 'city-card';
    const title = document.createElement('h4');
    title.textContent = t(city.labelKey);
    const desc = document.createElement('p');
    desc.className = 'city-desc';
    desc.textContent = t(city.descKey);
    card.append(title, desc);
    for (const s of CITY_SLIDERS) {
      card.append(slider({
        labelText: t('param.' + s.key),
        value: city[s.key],
        min: s.min, max: s.max, step: s.step, pct: s.pct,
        onInput: (v) => updateCityParam(city.id, s.key, v),
      }));
    }
    container.append(card);
  }
}
