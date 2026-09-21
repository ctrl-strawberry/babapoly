import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTACKS, createBattle, getAvailableAttacks, getLoadout, getAttackRange,
  getPlayerStats, getVictoryReward, resolveTurn,
} from "../js/jimbo-combat.js";

const stable = () => 0.5;
const attack = (id) => ({ type: "attack", attackId: id });
const fixture = (intent = "strike", moves) => {
  const battle = createBattle(4, moves, stable);
  battle.intent = intent;
  battle.enemyHp = battle.enemyMaxHp = 200;
  return battle;
};

test("las partidas antiguas reciben tres ataques válidos sin duplicados", () => {
  assert.deepEqual(getLoadout(1), ["scratch", "counter", "bite"]);
  assert.deepEqual(getLoadout(2, ["wave", "kick", "kick", "invalid"]), ["kick", "scratch", "counter"]);
  assert.deepEqual(getLoadout(4, null), ["scratch", "counter", "bite"]);
});

test("todos los movimientos están desbloqueados en nivel 4", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((level) => getAvailableAttacks(level).length), [3, 4, 5, 6, 6]);
});

test("nivel mejora vida, daño y premio, también después del 4", () => {
  for (const level of [1, 2, 3, 4, 5, 10]) {
    assert.ok(getPlayerStats(level + 1).hp > getPlayerStats(level).hp);
    assert.ok(getPlayerStats(level + 1).damage >= getPlayerStats(level).damage);
    assert.ok(getVictoryReward(level + 1) > getVictoryReward(level));
  }
});

test("mordisco supera a arañazo ante defensa, pero no ante ataque normal", () => {
  const b = fixture("guard");
  const bite = ATTACKS.find((a) => a.id === "bite");
  const scratch = ATTACKS.find((a) => a.id === "scratch");
  assert.ok(getAttackRange(b, bite).min > getAttackRange(b, scratch).max);
  b.intent = "strike";
  assert.ok(getAttackRange(b, scratch).max > getAttackRange(b, bite).max);
});

test("contraataque bloquea más ante golpe fuerte", () => {
  const heavy = fixture("heavy");
  const result = resolveTurn(heavy, attack("counter"), stable);
  const unblocked = fixture("heavy");
  const normal = resolveTurn(unblocked, attack("scratch"), stable);
  assert.ok(result.enemyDamage < normal.enemyDamage / 2);
});

test("repetir provoca fatiga y alternar la elimina", () => {
  const b = fixture();
  b.lastAttack = "scratch";
  const move = ATTACKS[0];
  const fatigued = getAttackRange(b, move);
  b.lastAttack = "bite";
  assert.ok(fatigued.max < getAttackRange(b, move).min);
});

test("onda interrumpe golpe fuerte y curación, pero no ataque rápido", () => {
  for (const intent of ["heavy", "recover", "strike"]) {
    const b = fixture(intent, ["wave", "bite", "counter"]);
    const before = b.enemyHp;
    const result = resolveTurn(b, attack("wave"), stable);
    assert.equal(b.enemyHp, before - result.playerDamage);
    assert.equal(result.enemyDamage === 0, intent !== "strike");
  }
});

test("descansos impiden reutilizar e intercambiar no los reinicia", () => {
  const b = fixture("heavy", ["wave", "bite", "counter"]);
  resolveTurn(b, attack("wave"), stable);
  assert.equal(b.cooldowns.wave, 2);
  const turn = b.turn;
  assert.equal(resolveTurn(b, attack("wave"), stable), null);
  assert.equal(b.turn, turn);
  resolveTurn(b, { type: "swap", slot: 0, attackId: "scratch" }, stable);
  assert.equal(b.cooldowns.wave, 1);
  resolveTurn(b, { type: "swap", slot: 0, attackId: "wave" }, stable);
  assert.equal(b.cooldowns.wave, 0);
  assert.equal(b.turn, turn + 2);
});

test("cambiar cuesta turno, no hace daño y el enemigo responde", () => {
  const b = fixture();
  const enemyHp = b.enemyHp;
  const playerHp = b.playerHp;
  const result = resolveTurn(b, { type: "swap", slot: 0, attackId: "kick" }, stable);
  assert.equal(b.turn, 2);
  assert.equal(b.enemyHp, enemyHp);
  assert.ok(b.playerHp < playerHp);
  assert.equal(result.playerDamage, 0);
  assert.equal(b.moves[0], "kick");
});

test("ataques bloqueados, duplicados y huecos inválidos no consumen turno", () => {
  const b = createBattle(1, undefined, stable);
  for (const action of [attack("wave"), attack("missing"),
    { type: "swap", slot: 0, attackId: "wave" },
    { type: "swap", slot: 0, attackId: "bite" },
    { type: "swap", slot: -1, attackId: "kick" }]) {
    const before = JSON.stringify(b);
    assert.equal(resolveTurn(b, action, stable), null);
    assert.equal(JSON.stringify(b), before);
  }
});

test("la curación no supera el máximo y la defensa la reduce", () => {
  const full = fixture("recover", ["drain", "bite", "counter"]);
  resolveTurn(full, attack("drain"), stable);
  assert.equal(full.playerHp, full.playerMaxHp);
  const guarded = fixture("guard", ["drain", "bite", "counter"]);
  guarded.playerHp = 50;
  const result = resolveTurn(guarded, attack("drain"), stable);
  assert.equal(guarded.playerHp, 56 - result.enemyDamage);
});

test("golpe mortal termina sin respuesta enemiga ni acciones posteriores", () => {
  const b = fixture("heavy");
  b.enemyHp = 1;
  const result = resolveTurn(b, attack("scratch"), stable);
  assert.equal(result.outcome, "win");
  assert.equal(result.enemyDamage, 0);
  assert.equal(resolveTurn(b, attack("scratch"), stable), null);
});

test("un rival puede ganar y la vida nunca es negativa", () => {
  const b = fixture("heavy");
  b.playerHp = 1;
  const result = resolveTurn(b, attack("scratch"), stable);
  assert.equal(result.outcome, "lose");
  assert.equal(b.playerHp, 0);
});

// Adaptadores de navegador mínimos para comprobar la persistencia real del proyecto.
let saved = null;
globalThis.localStorage = {
  getItem: () => saved,
  setItem: (_key, value) => { saved = value; },
};
globalThis.window = { addEventListener() {} };
const { loadState, gainPetXp, state, saveState, resetGame } = await import("../js/state.js");

test("XP sobrante se conserva y cada nivel da su bonus", () => {
  const pet = { level: 1, xp: 7 };
  const result = gainPetXp(pet, 4);
  assert.deepEqual(pet, { level: 2, xp: 3 });
  assert.equal(result.levelBonus, 160);
  const multi = { level: 1, xp: 0 };
  assert.equal(gainPetXp(multi, 20).levelBonus, 400);
  assert.deepEqual(multi, { level: 3, xp: 1 });
});

test("carga legacy conserva progreso proporcional, nivel y saldo", () => {
  saved = JSON.stringify({ players: [{ id: "legacy", name: "Old", money: 500, pet: { level: 2, xp: 1 } }] });
  const p = loadState().players[0];
  assert.equal(p.pet.level, 2);
  assert.equal(p.pet.xp, 6);
  assert.equal(p.money, 500);
  assert.deepEqual(p.pet.moves, ["scratch", "counter", "bite"]);
});

test("equipo y XP sobreviven a guardar/cargar; reiniciar elimina progresión", async () => {
  state.players = [{ id: "test", name: "Test", money: 500, pet: { level: 4, xp: 9, moves: ["wave", "bite", "drain"] } }];
  saveState();
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(loadState().players[0].pet, state.players[0].pet);
  resetGame(700);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const p = loadState().players[0];
  assert.equal(p.money, 700);
  assert.deepEqual(p.pet, { level: 1, xp: 0, moves: ["scratch", "counter", "bite"] });
});
