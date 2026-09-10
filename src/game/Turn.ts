import type { Combatant } from "./entities/Combatant";

import type {
  Turn
} from "./types/Turn";

export function createTurn(
  character: Combatant
): Turn {
  return {
    characterId:
      character.id,

    resources: {
      /**
       * Ação padrão disponível.
       */
      action: true,

      /**
       * Ação de movimento disponível.
       */
      moveAction: true,

      /**
       * Ações livres podem ser realizadas
       * conforme as regras de cada ação.
       */
      freeActions: true,

      /**
       * O passo de ajuste está disponível
       * no início do turno.
       */
      fiveFootStepAvailable: true,

      /**
       * Nenhum movimento foi realizado ainda.
       */
      hasMoved: false,

      /**
       * Deslocamento disponível.
       */
      movement:
        character.movement
    }
  };
}