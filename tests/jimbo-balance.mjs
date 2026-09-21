import { ATTACKS, createBattle, getAvailableAttacks, getAttackRange, getEnemyRange, resolveTurn } from "../js/jimbo-combat.js";
import assert from "node:assert/strict";

// Semillas fijas: permite comparar ajustes sin confundirlos con cambios de azar.
const seeded = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
export const chooseAttack = (b) => {
  const enemy = getEnemyRange(b);
  return ATTACKS.filter((a) => b.moves.includes(a.id) && !b.cooldowns[a.id]).map((a) => {
    const range = getAttackRange(b, a);
    let score = (range.min + range.max) / 2;
    if (range.min >= b.enemyHp) score += 100;
    if (a.id === "counter") score += (enemy.min + enemy.max) / 2 * (b.intent === "heavy" ? 0.6 : 0.3);
    if (a.id === "drain") score += Math.min(b.playerMaxHp - b.playerHp, b.intent === "guard" ? 6 : 12);
    if (a.id === "wave") score += b.intent === "heavy" ? (enemy.min + enemy.max) / 2 : b.intent === "recover" ? 16 : 0;
    return { id: a.id, score };
  }).sort((a, c) => c.score - a.score)[0].id;
};

const rate = (level, moves, spam, count = 2500) => {
  let wins = 0;
  let eliteWins = 0;
  let elites = 0;
  for (let i = 1; i <= count; i++) {
    const rng = seeded(i * 7919);
    const b = createBattle(level, moves, rng);
    if (b.elite) elites++;
    while (!b.outcome && b.turn < 100) {
      const id = spam && !b.cooldowns[spam] ? spam : chooseAttack(b);
      resolveTurn(b, { type: "attack", attackId: id }, rng);
    }
    if (b.outcome === "win") { wins++; if (b.elite) eliteWins++; }
  }
  return { win: +(wins / count * 100).toFixed(1), eliteWin: +(eliteWins / elites * 100).toFixed(1) };
};

let previousWinRate = 0;
for (const level of [1, 2, 3, 4, 8]) {
  const available = getAvailableAttacks(level).map((a) => a.id);
  const options = [];
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      for (let k = j + 1; k < available.length; k++) {
        const moves = [available[i], available[j], available[k]];
        options.push({ moves, ...rate(level, moves) });
      }
    }
  }
  options.sort((a, b) => b.win - a.win);
  const report = { level, best: options[0], default: rate(level), scratchSpam: rate(level, undefined, "scratch"), latestPriority: rate(level, [available.at(-1), "scratch", "bite"], available.at(-1)) };
  assert.ok(report.best.win > previousWinRate, `El nivel ${level} debe mejorar las probabilidades`);
  assert.ok(report.best.win > report.latestPriority.win, "Leer la intención debe superar priorizar el último ataque");
  assert.ok(report.default.win > report.scratchSpam.win, "Alternar debe superar repetir");
  if (level === 4) assert.ok(report.best.win < 98 && report.best.eliteWin < 90, "Los élites deben conservar un riesgo real en nivel 4");
  previousWinRate = report.best.win;
  console.log(JSON.stringify(report));
}
