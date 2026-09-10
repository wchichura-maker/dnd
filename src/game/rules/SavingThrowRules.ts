import type { Combatant } from "../entities/Combatant";

import {
  getAbilityModifier
} from "./AbilityRules";

export type SavingThrowType =
  | "FORTITUDE"
  | "REFLEX"
  | "WILL";

export type SavingThrowResult = {
  type: SavingThrowType;
  roll: number;
  bonus: number;
  total: number;
  dc: number;
  success: boolean;
  automaticFailure: boolean;
  automaticSuccess: boolean;
};

function isGoodSave(
  combatant: Combatant,
  type: SavingThrowType
): boolean {
  const className = combatant.dnd.classData.name;

  if (className === "MONK") {
    return true;
  }

  if (type === "FORTITUDE") {
    return [
      "BARBARIAN",
      "CLERIC",
      "DRUID",
      "FIGHTER",
      "MONK",
      "PALADIN",
      "RANGER"
    ].includes(className);
  }

  if (type === "REFLEX") {
    return [
      "BARD",
      "MONK",
      "RANGER",
      "ROGUE"
    ].includes(className);
  }

  return [
    "BARD",
    "CLERIC",
    "DRUID",
    "MONK",
    "PALADIN",
    "SORCERER",
    "WIZARD"
  ].includes(className);
}

function getAbilityModifierForSave(
  combatant: Combatant,
  type: SavingThrowType
): number {
  const abilities = combatant.dnd.abilities;

  if (type === "FORTITUDE") {
    return getAbilityModifier(abilities.constitution);
  }

  if (type === "REFLEX") {
    return getAbilityModifier(abilities.dexterity);
  }

  return getAbilityModifier(abilities.wisdom);
}

/**
 * D&D 3.5 saving throw bonus:
 *
 * Good save: 2 + floor(level / 2)
 * Poor save: floor(level / 3)
 *
 * Plus the relevant ability modifier.
 */
export function getSavingThrowBonus(
  combatant: Combatant,
  type: SavingThrowType
): number {
  const level = combatant.dnd.classData.level;
  const base = isGoodSave(combatant, type)
    ? 2 + Math.floor(level / 2)
    : Math.floor(level / 3);

  return base + getAbilityModifierForSave(combatant, type);
}

/**
 * Resolves a D&D 3.5 saving throw.
 * Natural 1 always fails and natural 20 always succeeds.
 */
export function resolveSavingThrow(
  combatant: Combatant,
  type: SavingThrowType,
  dc: number,
  roll: number
): SavingThrowResult {
  const bonus = getSavingThrowBonus(combatant, type);
  const automaticFailure = roll === 1;
  const automaticSuccess = roll === 20;
  const total = roll + bonus;

  return {
    type,
    roll,
    bonus,
    total,
    dc,
    success: automaticSuccess || (!automaticFailure && total >= dc),
    automaticFailure,
    automaticSuccess
  };
}
