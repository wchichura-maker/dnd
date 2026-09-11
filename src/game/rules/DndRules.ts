import type { Combatant } from "../entities/Combatant";

import {
  getAbilityModifier
} from "./AbilityRules";

export function getStrengthModifier(
  entity: Combatant
): number {
  const base = getAbilityModifier(entity.dnd.abilities.strength);
  return base - (isFatigued(entity) ? 2 : 0);
}

export function getDexterityModifier(
  entity: Combatant
): number {
  const base = getAbilityModifier(entity.dnd.abilities.dexterity);
  return base - (isFatigued(entity) ? 2 : 0);
}

export function getConstitutionModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.constitution
  );
}

export function getIntelligenceModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.intelligence
  );
}

export function getWisdomModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.wisdom
  );
}

export function getCharismaModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.charisma
  );
}

export function isFatigued(entity: Combatant): boolean {
  return entity.conditions?.some(condition => condition.type === "FATIGUED") ?? false;
}
