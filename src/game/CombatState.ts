import type { Combatant } from "./entities/Combatant";
import type { CombatState } from "./types/CombatState";

import {
  rollInitiative,
  sortInitiative
} from "./Initiative";

export type CreatedCombat = {
  combat: CombatState;
  combatants: Combatant[];
};

export function createCombat(
  combatants: Combatant[]
): CreatedCombat {
  const rolledCombatants =
    combatants.map(
      rollInitiative
    );

  const sortedCombatants =
    sortInitiative(
      rolledCombatants
    );

  return {
    combat: {
      turnOrder:
        sortedCombatants.map(
          (combatant) =>
            combatant.id
        ),

      currentTurnIndex: 0,

      active: true
    },

    combatants:
      sortedCombatants
  };
}