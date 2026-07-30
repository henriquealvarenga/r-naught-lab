/**
 * data/quiz.js
 * -----------------------------------------------------------------------------
 * Quiz conceitual mostrado no relatorio de FIM do Modo Jogo. Uma pergunta e
 * sorteada de forma DETERMINISTICA (por uma metrica da partida — ver
 * src/game/screens.js), nunca via Math.random. So chaves de i18n: os textos
 * vivem em pt.js/en.js.
 *
 * Cada questao: { qKey, optKeys:[...], correct:index, whyKey }.
 */

export const QUIZZES = [
  {
    qKey: 'quiz.rt.q',
    optKeys: ['quiz.rt.o0', 'quiz.rt.o1', 'quiz.rt.o2'],
    correct: 1,
    whyKey: 'quiz.rt.why',
  },
  {
    qKey: 'quiz.sanitation.q',
    optKeys: ['quiz.sanitation.o0', 'quiz.sanitation.o1', 'quiz.sanitation.o2'],
    correct: 1,
    whyKey: 'quiz.sanitation.why',
  },
  {
    qKey: 'quiz.flatten.q',
    optKeys: ['quiz.flatten.o0', 'quiz.flatten.o1', 'quiz.flatten.o2'],
    correct: 1,
    whyKey: 'quiz.flatten.why',
  },
];
