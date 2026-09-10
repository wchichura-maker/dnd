import type { Combatant } from "./entities/Combatant";

import {
  rollD20
} from "./Dice";

import {
  getDexterityModifier
} from "./rules/DndRules";

export function rollInitiative(
  combatant: Combatant
): Combatant {
  const roll =
    rollD20();

  const dexterityModifier =
    getDexterityModifier(
      combatant
    );

  const initiative =
    roll +
    dexterityModifier;

  return {
    ...combatant,

    initiative
  };
}

export function sortInitiative(
  combatants: Combatant[]
): Combatant[] {
  return [
    ...combatants
  ].sort(
    (a, b) =>
      b.initiative -
      a.initiative
  );
}