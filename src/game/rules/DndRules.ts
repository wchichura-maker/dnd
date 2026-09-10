import type { Combatant } from "../entities/Combatant";

import {
  getAbilityModifier
} from "./AbilityRules";

export function getStrengthModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.strength
  );
}

export function getDexterityModifier(
  entity: Combatant
): number {
  return getAbilityModifier(
    entity.dnd.abilities.dexterity
  );
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