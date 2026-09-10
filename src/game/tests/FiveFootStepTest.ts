import {
  playerCharacter
} from "../Character";

import {
  createTurn
} from "../Turn";

import {
  canTakeFiveFootStep,
  canUseMoveAction,
  consumeFiveFootStep,
  consumeStandardAction,
  registerMovement
} from "../rules/TurnRules";

import type {
  Turn
} from "../types/Turn";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `TESTE FALHOU: ${message}`
    );
  }
}

export function runFiveFootStepTests(): void {

  console.log(
    "=============================="
  );

  console.log(
    "INICIANDO TESTES DO 5-FOOT STEP"
  );

  console.log(
    "=============================="
  );

  /*
   * ESTADO INICIAL
   */

  const initialTurn =
    createTurn(
      playerCharacter
    );

  assert(
    canTakeFiveFootStep(
      initialTurn
    ),
    "O 5-foot step deveria estar disponível no início do turno."
  );

  assert(
    initialTurn.resources.action,
    "A ação padrão deveria estar disponível."
  );

  assert(
    initialTurn.resources.moveAction,
    "A ação de movimento deveria estar disponível."
  );

  assert(
    initialTurn.resources.movement ===
      playerCharacter.movement,
    "O movimento inicial deveria ser o movimento completo."
  );

  console.log(
    "✓ Estado inicial"
  );

  /*
   * 5-FOOT STEP NÃO CONSOME RECURSOS
   */

  const afterFiveFootStep =
    consumeFiveFootStep(
      initialTurn
    );

  assert(
    !afterFiveFootStep.resources.fiveFootStepAvailable,
    "O 5-foot step deveria ficar indisponível após ser usado."
  );

  assert(
    afterFiveFootStep.resources.hasTakenFiveFootStep,
    "O turno deveria registrar que o 5-foot step foi utilizado."
  );

  assert(
    afterFiveFootStep.resources.action,
    "O 5-foot step não deveria consumir a ação padrão."
  );

  assert(
    afterFiveFootStep.resources.moveAction,
    "O 5-foot step não deveria consumir a ação de movimento."
  );

  assert(
    afterFiveFootStep.resources.movement ===
      initialTurn.resources.movement,
    "O 5-foot step não deveria consumir movimento."
  );

  console.log(
    "✓ 5-foot step não consome recursos"
  );

  /*
   * NÃO PODE REPETIR
   */

  assert(
    !canTakeFiveFootStep(
      afterFiveFootStep
    ),
    "Não deveria ser possível realizar dois 5-foot steps no mesmo turno."
  );

  console.log(
    "✓ 5-foot step só pode ocorrer uma vez"
  );

  /*
   * 5-FOOT STEP → MOVIMENTO
   */

  assert(
    !canUseMoveAction(
      afterFiveFootStep
    ),
    "Depois do 5-foot step não deveria ser possível realizar movimento normal."
  );

  console.log(
    "✓ 5-foot step bloqueia movimento normal"
  );

  /*
   * MOVIMENTO → 5-FOOT STEP
   */

  const afterNormalMovement =
    registerMovement(
      initialTurn
    );

  assert(
    afterNormalMovement.resources.hasMoved,
    "O movimento normal deveria registrar hasMoved."
  );

  assert(
    !canTakeFiveFootStep(
      afterNormalMovement
    ),
    "Depois do movimento normal o 5-foot step deveria estar indisponível."
  );

  console.log(
    "✓ Movimento normal bloqueia 5-foot step"
  );

  /*
   * ATTACK → 5-FOOT STEP
   */

  const afterAttack =
    consumeStandardAction(
      initialTurn
    );

  assert(
    !afterAttack.resources.action,
    "A ação padrão deveria estar consumida após o ataque."
  );

  assert(
    canTakeFiveFootStep(
      afterAttack
    ),
    "Depois do ataque o 5-foot step deveria continuar disponível."
  );

  const attackThenFiveFootStep =
    consumeFiveFootStep(
      afterAttack
    );

  assert(
    attackThenFiveFootStep.resources.hasTakenFiveFootStep,
    "Ataque → 5-foot step deveria registrar o passo."
  );

  assert(
    !canUseMoveAction(
      attackThenFiveFootStep
    ),
    "Ataque → 5-foot step deveria impedir movimento normal."
  );

  console.log(
    "✓ Ataque → 5-foot step"
  );

  /*
   * MOVIMENTO = 0
   */

  const zeroMovementTurn: Turn = {
    ...initialTurn,

    resources: {
      ...initialTurn.resources,
      movement: 0
    }
  };

  assert(
    canTakeFiveFootStep(
      zeroMovementTurn
    ),
    "O 5-foot step deveria continuar disponível com movimento igual a zero."
  );

  const zeroMovementAfterStep =
    consumeFiveFootStep(
      zeroMovementTurn
    );

  assert(
    zeroMovementAfterStep.resources.movement === 0,
    "O 5-foot step deveria preservar movement = 0."
  );

  assert(
    zeroMovementAfterStep.resources.hasTakenFiveFootStep,
    "O 5-foot step deveria funcionar com movimento igual a zero."
  );

  console.log(
    "✓ 5-foot step com movimento zero"
  );

  console.log(
    "=============================="
  );

  console.log(
    "✓ TODOS OS TESTES DO 5-FOOT STEP PASSARAM"
  );

  console.log(
    "=============================="
  );
}