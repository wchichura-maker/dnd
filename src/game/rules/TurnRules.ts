import type { Turn } from "../types/Turn";

/**
 * Verifica se ainda existe uma ação padrão.
 */
export function canUseStandardAction(
  turn: Turn
): boolean {
  return turn.resources.action;
}

/**
 * Verifica se ainda existe uma ação de movimento.
 *
 * A ação padrão pode ser convertida em uma
 * segunda ação de movimento.
 */
export function canUseMoveAction(
  turn: Turn
): boolean {
  return (
    turn.resources.moveAction ||
    turn.resources.action
  );
}

/**
 * Verifica se o personagem possui os dois
 * recursos necessários para uma ação de
 * rodada completa.
 */
export function canUseFullRoundAction(
  turn: Turn
): boolean {
  return (
    turn.resources.action &&
    turn.resources.moveAction
  );
}

/**
 * Verifica se o passo de ajuste de 1,5 m
 * está disponível.
 */
export function canTakeFiveFootStep(
  turn: Turn
): boolean {
  return (
    turn.resources.fiveFootStepAvailable &&
    !turn.resources.hasMoved
  );
}

/**
 * Consome a ação padrão.
 */
export function consumeStandardAction(
  turn: Turn
): Turn {
  return {
    ...turn,
    resources: {
      ...turn.resources,
      action: false
    }
  };
}

/**
 * Consome uma ação de movimento.
 *
 * Primeira movimentação:
 *   usa a ação de movimento.
 *
 * Segunda movimentação:
 *   usa a ação padrão.
 */
export function consumeMoveAction(
  turn: Turn
): Turn {
  if (
    turn.resources.moveAction
  ) {
    return {
      ...turn,
      resources: {
        ...turn.resources,
        moveAction: false
      }
    };
  }

  if (
    turn.resources.action
  ) {
    return {
      ...turn,
      resources: {
        ...turn.resources,
        action: false
      }
    };
  }

  return turn;
}

/**
 * Consome uma ação de rodada completa.
 */
export function consumeFullRoundAction(
  turn: Turn
): Turn {
  return {
    ...turn,
    resources: {
      ...turn.resources,
      action: false,
      moveAction: false
    }
  };
}

/**
 * Registra que houve deslocamento real.
 *
 * Depois que o personagem se deslocou,
 * o passo de ajuste deixa de estar disponível.
 */
export function registerMovement(
  turn: Turn
): Turn {
  return {
    ...turn,
    resources: {
      ...turn.resources,
      hasMoved: true,
      fiveFootStepAvailable: false
    }
  };
}

/**
 * Consome o passo de ajuste.
 *
 * O passo não consome ação padrão nem
 * ação de movimento.
 */
export function consumeFiveFootStep(
  turn: Turn
): Turn {
  if (
    !canTakeFiveFootStep(turn)
  ) {
    return turn;
  }

  return {
    ...turn,
    resources: {
      ...turn.resources,
      fiveFootStepAvailable: false
    }
  };
}
/**
 * Cria os recursos de um novo turno.
 *
 * O personagem recebe novamente:
 * - ação padrão
 * - ação de movimento
 * - ações livres
 * - passo de ajuste
 * - deslocamento completo
 */
export function resetTurn(
  turn: Turn,
  movement: number
): Turn {
  return {
    characterId:
      turn.characterId,

    resources: {
      action: true,
      moveAction: true,
      freeActions: true,
      fiveFootStepAvailable: true,
      hasMoved: false,
      movement
    }
  };
}