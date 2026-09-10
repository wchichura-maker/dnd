import type { Combatant } from "./entities/Combatant";

import {
  rollD20,
  rollDice
} from "./Dice";

import {
  getMeleeAttackBonus
} from "./rules/AttackRules";

import {
  getStrengthModifier
} from "./rules/DndRules";

import {
  getArmorClass
} from "./rules/DefenseRules";

export type AttackResult = {
  roll: number;

  attackBonus: number;

  total: number;

  targetArmorClass: number;

  hit: boolean;

  criticalThreat: boolean;

  criticalConfirmed: boolean;

  critical: boolean;

  damage: number;

  damageMultiplier: number;
};

export function attack(
  attacker: Combatant,
  target: Combatant
): AttackResult {
  const weapon =
    attacker.dnd.equipment.weapon;

  if (!weapon) {
    return {
      roll: 0,

      attackBonus: 0,

      total: 0,

      targetArmorClass:
        getArmorClass(target),

      hit: false,

      criticalThreat: false,

      criticalConfirmed: false,

      critical: false,

      damage: 0,

      damageMultiplier: 1
    };
  }

  const roll =
    rollD20();

  const attackBonus =
    getMeleeAttackBonus(
      attacker
    );

  const total =
    roll +
    attackBonus;

  const targetArmorClass =
    getArmorClass(
      target
    );

  const automaticMiss =
    roll === 1;

  const automaticHit =
    roll === 20;

  const criticalThreat =
    roll >=
    weapon.criticalRange;

  const normalHit =
    !automaticMiss &&
    (
      automaticHit ||
      total >= targetArmorClass
    );

  let criticalConfirmed =
    false;

  let critical =
    false;

  if (
    criticalThreat &&
    normalHit
  ) {
    const confirmationRoll =
      rollD20();

    const confirmationTotal =
      confirmationRoll +
      attackBonus;

    criticalConfirmed =
      confirmationTotal >=
      targetArmorClass;

    critical =
      criticalConfirmed;
  }

  const hit =
    normalHit;

  let damage = 0;

  let damageMultiplier = 1;

  if (hit) {
    const strengthModifier =
      getStrengthModifier(
        attacker
      );

    damage =
      rollDice(
        weapon.damageDice.count,
        weapon.damageDice.sides
      );

    damage +=
      strengthModifier;

    damage =
      Math.max(
        1,
        damage
      );

    if (critical) {
      damageMultiplier =
        weapon.criticalMultiplier;

      damage *=
        damageMultiplier;
    }
  }

  return {
    roll,

    attackBonus,

    total,

    targetArmorClass,

    hit,

    criticalThreat,

    criticalConfirmed,

    critical,

    damage,

    damageMultiplier
  };
}