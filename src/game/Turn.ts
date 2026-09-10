import type { Combatant } from "./entities/Combatant";

import type {
  Turn
} from "./types/Turn";

import {
  getAvailableMovement
} from "./rules/ConditionRules";

export function createTurn(
  character: Combatant
): Turn {
  const movement =
    getAvailableMovement(character);

  return {
    characterId:
      character.id,

    resources: {
      action: true,

      moveAction: true,

      freeActions: true,

      fiveFootStepAvailable: true,

      hasMoved: false,

      hasTakenFiveFootStep: false,

      movement,

      disabled:
        movement !== character.movement
    }
  };
}