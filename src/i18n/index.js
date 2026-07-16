/**
 * i18n/index.js
 * -----------------------------------------------------------------------------
 * Micro-framework de internacionalizacao. Sem dependencias. Fornece um
 * tradutor `t(key)` com idioma corrente e notificacao de troca de idioma para
 * a UI se re-renderizar.
 */

import pt from './pt.js';
import en from './en.js';

const DICTS = { pt, en };
let current = 'pt';
const listeners = new Set();

/** Traduz uma chave; se faltar, devolve a propria chave (facil de detectar). */
export function t(key) {
  const dict = DICTS[current] || DICTS.pt;
  return dict[key] ?? key;
}

/** Idioma atual ('pt' | 'en'). */
export function getLanguage() {
  return current;
}

/** Troca o idioma e notifica ouvintes. */
export function setLanguage(lang) {
  if (!DICTS[lang]) return;
  current = lang;
  for (const fn of listeners) fn(lang);
}

/** Registra callback chamado quando o idioma muda. Retorna unsubscribe. */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
