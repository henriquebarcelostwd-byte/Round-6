/* ROUND 6 — vote.js : vote configurations per season (the voting itself runs inside the dorm hub) and the outcome rules */
'use strict';
(function () {
  R6.VOTES = {
    v1: { id: 'v1', bias: -0.03, tie: 'X', text: 'Cláusula 3: o jogo pode ser encerrado se a maioria concordar. Se encerrarem, o prêmio acumulado será enviado às famílias dos eliminados. O para continuar. X para encerrar.', keyVotes: { oldman: 'X', gangster: 'O', schemer: 'O', wild: 'X' } },
    v2_1: { id: 'v2_1', bias: 0.02, tie: 'O', rig: true, text: 'Votação. Quem votar X e vencer divide o prêmio atual entre os sobreviventes e vai para casa. O para continuar, X para encerrar.', keyVotes: { fm001: 'X', buddy: 'X', elder: 'O', crypto: 'X', rapper: 'O' } },
    v2_2: { id: 'v2_2', bias: 0.05, tie: 'O', rig: true, text: 'Nova votação. O prêmio aumentou. O ou X?', keyVotes: { fm001: 'X', buddy: 'X', elder: 'O', rapper: 'O' } },
    v2_3: { id: 'v2_3', bias: 0.08, tie: 'O', rig: true, text: 'Última votação antes do próximo jogo. O ou X?', keyVotes: { fm001: 'X', buddy: 'X', elder: 'O' } },
    v3: { id: 'v3', bias: 0.2, tie: 'O', text: 'Votação. Os que ainda estão aqui decidem.', keyVotes: {} },
  };
  // how many returned after the first vote when the game stopped (the rest stayed outside for good)
  R6.returnAfterLeave = function () {
    const S = R6.State; let left = 0;
    for (const p of S.aliveBots()) { if (p.key) continue; if (Math.random() < 0.08) { p.alive = false; p.cause = 'left'; S.alive--; left++; } }
    return left;
  };
})();
