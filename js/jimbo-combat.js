// Reglas de combate sin DOM: la interfaz y las simulaciones usan el mismo motor.
export const ATTACKS = [
  { id: "scratch", level: 1, name: "Arañazo", min: 15, max: 19, cooldown: 0,
    description: "Daño estable. Ideal cuando el rival queda expuesto." },
  { id: "counter", level: 1, name: "Contraataque", min: 8, max: 12, cooldown: 0,
    description: "Bloquea un 30%. Ante golpe fuerte: +8 daño y bloquea un 60%." },
  { id: "bite", level: 1, name: "Mordisco", min: 11, max: 15, cooldown: 0,
    description: "Atraviesa la defensa. +12 daño si el rival se protege." },
  { id: "kick", level: 2, name: "Patada estelar", min: 18, max: 24, cooldown: 1,
    description: "+8 daño si prepara un golpe fuerte o se cura. Descansa 1 turno." },
  { id: "drain", level: 3, name: "Baba vital", min: 10, max: 14, cooldown: 2,
    description: "Recupera 12 PS (6 contra defensa). Descansa 2 turnos." },
  { id: "wave", level: 4, name: "Onda disruptora", min: 12, max: 16, cooldown: 2,
    description: "Cancela el golpe fuerte o la curación del rival. Descansa 2 turnos." },
];

export const INTENTS = {
  strike: { name: "Ataque rápido", min: 16, max: 21,
    hint: "Atacará con normalidad. Alterna ataques para evitar la fatiga." },
  heavy: { name: "Golpe fuerte", min: 29, max: 36,
    hint: "Prepara un golpe fuerte: contraataca para protegerte o interrúmpelo con Onda." },
  guard: { name: "Defensa", min: 9, max: 13,
    hint: "Reduce un 55% tu daño y devuelve un golpe suave. Mordisco rompe su defensa." },
  recover: { name: "Curación", min: 0, max: 0,
    hint: "Recuperará 16 PS sin atacar. Aprovecha para golpear, cambiar o interrumpir con Onda." },
};

export const getAvailableAttacks = (level) => ATTACKS.filter((attack) => attack.level <= level);
export const getLoadout = (level, moves = []) => {
  const available = getAvailableAttacks(level).map((attack) => attack.id);
  return [...new Set([...(Array.isArray(moves) ? moves : []), ...available])]
    .filter((id) => available.includes(id)).slice(0, 3);
};

// Después del nivel 4 la mejora continúa, pero se suaviza para conservar el riesgo.
const mastery = (level) => Math.min(3, level - 1) + Math.log2(1 + Math.max(0, level - 4)) * 0.6;
export const getPlayerStats = (level) => ({
  hp: Math.round(82 + mastery(level) * 8),
  damage: Math.round(mastery(level) * 2),
});
export const getVictoryReward = (level) => 100 + level * 60;
export const getDefeatPenalty = (level) => 50 + level * 15;
const roll = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));

export const chooseIntent = (battle, rng = Math.random) => {
  // Sin golpes fuertes consecutivos; la curación solo aparece con vida perdida.
  const pool = ["strike", "strike", "guard", "heavy"];
  if (battle.enemyHp < battle.enemyMaxHp * 0.7 && battle.intent !== "recover") pool.push("recover");
  const choices = pool.filter((intent) => intent !== "heavy" || battle.intent !== "heavy");
  return choices[Math.floor(rng() * choices.length)];
};

export const createBattle = (level, moves, rng = Math.random) => {
  const stats = getPlayerStats(level);
  const elite = rng() < 0.22;
  const enemyMaxHp = Math.round((elite ? 110 : 84) + mastery(level) * (elite ? 8 : 3) + roll(-6, 6, rng));
  const battle = {
    level, playerHp: stats.hp, playerMaxHp: stats.hp, damageBonus: stats.damage,
    enemyHp: enemyMaxHp, enemyMaxHp, elite,
    enemyPower: (elite ? 1.2 : 1) + mastery(level) * (elite ? 0.075 : 0.025),
    moves: getLoadout(level, moves), cooldowns: {}, lastAttack: null,
    turn: 1, outcome: null, intent: null,
  };
  battle.intent = chooseIntent(battle, rng);
  return battle;
};

export const getAttackRange = (battle, attack) => {
  let bonus = battle.damageBonus;
  if (attack.id === "bite" && battle.intent === "guard") bonus += 12;
  if (attack.id === "counter" && battle.intent === "heavy") bonus += 8;
  if (attack.id === "kick" && ["heavy", "recover"].includes(battle.intent)) bonus += 8;
  const fatigue = battle.lastAttack === attack.id ? 0.65 : 1;
  const defense = battle.intent === "guard" && attack.id !== "bite" ? 0.45 : 1;
  return {
    min: Math.max(1, Math.round((attack.min + bonus) * fatigue * defense)),
    max: Math.max(1, Math.round((attack.max + bonus) * fatigue * defense)),
    fatigued: fatigue < 1,
  };
};

export const getEnemyRange = (battle) => ({
  min: Math.round(INTENTS[battle.intent].min * battle.enemyPower),
  max: Math.round(INTENTS[battle.intent].max * battle.enemyPower),
});

// Una acción válida siempre consume el turno, incluido cambiar un ataque.
export const resolveTurn = (battle, action, rng = Math.random) => {
  if (battle.outcome) return null;
  const attack = ATTACKS.find((move) => move.id === action.attackId);
  const swapping = action.type === "swap";
  if (swapping) {
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= 3 ||
        !attack || attack.level > battle.level || battle.moves.includes(attack.id)) return null;
  } else if (action.type !== "attack" || !attack || !battle.moves.includes(attack.id) ||
             battle.cooldowns[attack.id] > 0) return null;

  const messages = [];
  let playerDamage = 0;
  let enemyDamage = 0;
  let interrupted = false;
  let block = 0;
  if (swapping) {
    battle.moves[action.slot] = attack.id;
    battle.lastAttack = null;
    messages.push(`Equipas ${attack.name}. Cedes tu ataque de este turno.`);
  } else {
    const range = getAttackRange(battle, attack);
    playerDamage = roll(range.min, range.max, rng);
    battle.enemyHp = Math.max(0, battle.enemyHp - playerDamage);
    messages.push(`${attack.name}: ${playerDamage} de daño${range.fatigued ? " (fatiga por repetir)" : ""}.`);
    if (attack.id === "counter") block = battle.intent === "heavy" ? 0.6 : 0.3;
    if (attack.id === "drain") {
      const healing = Math.min(battle.playerMaxHp - battle.playerHp,
        Math.round((battle.intent === "guard" ? 6 : 12) * (range.fatigued ? 0.65 : 1)));
      battle.playerHp += healing;
      messages.push(`Recuperas ${healing} PS.`);
    }
    interrupted = attack.id === "wave" && ["heavy", "recover"].includes(battle.intent);
    battle.cooldowns[attack.id] = attack.cooldown + 1;
    battle.lastAttack = attack.id;
  }

  if (battle.enemyHp === 0) {
    battle.outcome = "win";
  } else if (interrupted) {
    messages.push(`¡Interrumpes ${INTENTS[battle.intent].name.toLowerCase()}! El rival pierde su acción.`);
  } else if (battle.intent === "recover") {
    const healing = Math.min(16, battle.enemyMaxHp - battle.enemyHp);
    battle.enemyHp += healing;
    messages.push(`El rival recupera ${healing} PS.`);
  } else {
    const range = getEnemyRange(battle);
    enemyDamage = Math.round(roll(range.min, range.max, rng) * (1 - block));
    battle.playerHp = Math.max(0, battle.playerHp - enemyDamage);
    messages.push(`${INTENTS[battle.intent].name}: recibes ${enemyDamage} de daño${block ? " tras bloquear" : ""}.`);
    if (battle.playerHp === 0) battle.outcome = "lose";
  }
  Object.keys(battle.cooldowns).forEach((id) => {
    battle.cooldowns[id] = Math.max(0, battle.cooldowns[id] - 1);
  });
  if (!battle.outcome) {
    battle.turn += 1;
    battle.intent = chooseIntent(battle, rng);
  }
  return { messages, playerDamage, enemyDamage, outcome: battle.outcome };
};
