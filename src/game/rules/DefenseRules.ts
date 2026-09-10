import type { Combatant } from "../entities/Combatant";

import {
  getDexterityModifier
} from "./DndRules";

export function getEffectiveDexterityModifier(
  entity: Combatant
): number {
  const dexterityModifier =
    getDexterityModifier(
      entity
    );

  const armor =
    entity.dnd.equipment.armor;

  if (!armor) {
    return dexterityModifier;
  }

  return Math.min(
    dexterityModifier,
    armor.maxDexterityBonus
  );
}

export function getArmorBonus(
  entity: Combatant
): number {
  return (
    entity.dnd.equipment.armor
      ?.armorBonus ?? 0
  );
}

export function getShieldBonus(
  entity: Combatant
): number {
  return (
    entity.dnd.equipment.shield
      ?.shieldBonus ?? 0
  );
}

export function getArmorClass(
  entity: Combatant
): number {
  const dexterityModifier =
    getEffectiveDexterityModifier(
      entity
    );

  return (
    10 +
    dexterityModifier +
    getArmorBonus(entity) +
    getShieldBonus(entity) +
    entity.dnd.defense.naturalArmorBonus +
    entity.dnd.defense.deflectionBonus +
    entity.dnd.defense.dodgeBonus +
    entity.dnd.defense.miscBonus +
    entity.dnd.defense.sizeModifier
  );
}

/**
 * CA de toque.
 *
 * A armadura e o escudo não são considerados.
 * A Destreza também NÃO é limitada pelo bônus
 * máximo de Destreza da armadura.
 */
export function getTouchArmorClass(
  entity: Combatant
): number {
  const dexterityModifier =
    getDexterityModifier(
      entity
    );

  return (
    10 +
    dexterityModifier +
    entity.dnd.defense.deflectionBonus +
    entity.dnd.defense.dodgeBonus +
    entity.dnd.defense.miscBonus +
    entity.dnd.defense.sizeModifier
  );
}

export function getFlatFootedArmorClass(
  entity: Combatant
): number {
  return (
    10 +
    getArmorBonus(entity) +
    getShieldBonus(entity) +
    entity.dnd.defense.naturalArmorBonus +
    entity.dnd.defense.deflectionBonus +
    entity.dnd.defense.miscBonus +
    entity.dnd.defense.sizeModifier
  );
}