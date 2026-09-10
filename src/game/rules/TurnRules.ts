import type { Turn } from "../types/Turn";

/**
 * Verifica se ainda existe uma ação padrão.
 *
 * D&D 3.5: uma criatura disabled pode realizar
 * somente uma ação de movimento OU uma ação padrão.
 */
export function canUseStandardAction(
  turn: Turn
): boolean {
  if (!turn.resources.action) {
    return false;
  }

  if (
    turn.resources.disabled &&
    turn.resources.hasMoved
  ) {
    return false;
  }

  return true;
}

/**
 * Verifica se ainda existe uma ação de movimento.
 *
 * A ação padrão pode ser convertida em uma
 * segunda ação de movimento para personagens normais.
 *
 * Depois de realizar um 5-foot step,
 * movimento normal não é mais permitido
 * neste turno.
 *
 * Personagens disabled só podem realizar
 * uma ação de movimento OU uma ação padrão.
 */
export function canUseMoveAction(
  turn: Turn
): boolean {
  if (
    turn.resources.hasTakenFiveFootStep
  ) {
    return false;
  }

  if (
    turn.resources.disabled &&
    turn.resources.hasMoved
  ) {
    return false;
  }

  // Ataque/outra ação padrão antes de qualquer
  // movimento: somente 5-foot step é permitido.
  if (
    !turn.resources.action &&
    !turn.resources.hasMoved
  ) {
    return false;
  }

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
 *
 * O passo:
 * - não consome ação padrão;
 * - não consome ação de movimento;
 * - não consome movimento;
 * - só pode ocorrer uma vez;
 * - não pode ocorrer depois de movimento normal.
 */
export function canTakeFiveFootStep(
  turn: Turn
): boolean {
  return (
    turn.resources.fiveFootStepAvailable &&
    !turn.resources.hasMoved &&
    !turn.resources.hasTakenFiveFootStep
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
 * usa a ação de movimento.
 *
 * Segunda movimentação:
 * usa a ação padrão.
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
 * Registra que houve movimento normal.
 *
 * Depois de movimento normal, o 5-foot step
 * não pode mais ser realizado.
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
 * Consome o 5-foot step.
 *
 * O passo não consome:
 * - ação padrão;
 * - ação de movimento;
 * - movimento restante.
 *
 * Porém, impede movimento normal posterior
 * no mesmo turno.
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
      fiveFootStepAvailable: false,
      hasTakenFiveFootStep: true
    }
  };
}

/**
 * Cria os recursos de um novo turno.
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
      hasTakenFiveFootStep: false,
      movement,
      disabled: turn.resources.disabled
    }
  };
}