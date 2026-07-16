/**
 * ui/interventions-ui.js
 * -----------------------------------------------------------------------------
 * Painel de intervencoes: toggles + intensidade + dia de inicio. Constroi a
 * lista declarativa de intervencoes que o motor consome. Mantido separado dos
 * demais controles porque a "jogabilidade" (o que o aluno decide) mora aqui.
 */

import { t } from '../i18n/index.js';
import { setInterventions, getState } from '../state/store.js';

const TYPES = [
  { type: 'distancing', max: 0.9, step: 0.05 },
  { type: 'masks', max: 0.9, step: 0.05 },
  { type: 'sanitation', max: 1.0, step: 0.05 },
  { type: 'mobility_restriction', max: 0.95, step: 0.05 },
  { type: 'vaccination', max: 0.03, step: 0.001 },
];

export function renderInterventions(container, allowed = null) {
  container.innerHTML = '';
  const current = getState().config.interventions;

  for (const spec of TYPES) {
    if (allowed && !allowed.includes(spec.type)) continue;
    const existing = current.find((i) => i.type === spec.type);

    const row = document.createElement('div');
    row.className = 'interv-row';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = !!existing;

    const label = document.createElement('span');
    label.className = 'interv-label';
    label.textContent = t('interv.' + spec.type);

    const range = document.createElement('input');
    range.type = 'range';
    range.min = 0; range.max = spec.max; range.step = spec.step;
    range.value = existing ? existing.value : spec.max / 2;
    range.disabled = !existing;

    const startWrap = document.createElement('label');
    startWrap.className = 'interv-start';
    startWrap.textContent = 'dia ';
    const start = document.createElement('input');
    start.type = 'number'; start.min = 0; start.max = 240;
    start.value = existing ? existing.startDay : 0;
    start.disabled = !existing;
    startWrap.append(start);

    const commit = () => {
      const list = getState().config.interventions.filter((i) => i.type !== spec.type);
      if (toggle.checked) {
        list.push({
          type: spec.type,
          value: parseFloat(range.value),
          startDay: parseInt(start.value, 10) || 0,
          cities: 'all',
        });
      }
      range.disabled = !toggle.checked;
      start.disabled = !toggle.checked;
      setInterventions(list);
    };

    toggle.addEventListener('change', commit);
    range.addEventListener('input', commit);
    start.addEventListener('input', commit);

    row.append(toggle, label, range, startWrap);
    container.append(row);
  }
}
