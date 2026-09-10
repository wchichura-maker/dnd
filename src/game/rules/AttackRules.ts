import type { Combatant } from "../entities/Combatant";

import {
  getStrengthModifier
} from "./DndRules";

export function getBaseAttackBonus(
  entity: Combatant
): number {
  return entity.dnd.classData
    .baseAttackBonus;
}

export function getMeleeAttackBonus(
  entity: Combatant
): number {
  return (
    getBaseAttackBonus(entity) +
    getStrengthModifier(entity)
  );
}

export function getWeaponDamage(
  entity: Combatant
): string {
  const weapon =
    entity.dnd.equipment.weapon;

  if (!weapon) {
    return "SEM ARMA";
  }

  return `${weapon.damageDice.count}d${weapon.damageDice.sides}`;
}