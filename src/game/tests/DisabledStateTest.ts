import {
  createTurn
} from "../Turn";

import {
  playerCharacter
} from "../Character";

import {
  canUseMoveAction,
  canUseStandardAction,
  registerMovement
} from "../rules/TurnRules";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`TESTE FALHOU: ${message}`);
  }
}

export function runDisabledStateTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE DISABLED");
  console.log("==============================");

  const normal = createTurn({
    ...playerCharacter,
    id: "disabled-test-normal",
    hp: 10
  });

  assert(
    normal.resources.movement === playerCharacter.movement,
    "Personagem normal deve manter deslocamento completo."
  );
  assert(
    normal.resources.disabled === false,
    "Personagem normal não deve ser marcado como disabled."
  );

  const disabled = createTurn({
    ...playerCharacter,
    id: "disabled-test-disabled",
    hp: 0
  });

  assert(
    disabled.resources.movement === Math.floor(playerCharacter.movement / 2),
    "Disabled deve se mover à metade do deslocamento."
  );
  assert(
    disabled.resources.disabled === true,
    "Turno de personagem a 0 HP deve ser marcado como disabled."
  );
  assert(
    canUseStandardAction(disabled),
    "Disabled deve poder realizar uma ação padrão antes de se mover."
  );
  assert(
    canUseMoveAction(disabled),
    "Disabled deve poder realizar uma ação de movimento antes da ação padrão."
  );

  const afterMovement = registerMovement(disabled);

  assert(
    !canUseStandardAction(afterMovement),
    "Disabled que já se moveu não pode realizar uma ação padrão no mesmo turno."
  );
  assert(
    !canUseMoveAction(afterMovement),
    "Disabled que já se moveu não pode realizar uma segunda ação de movimento."
  );

  const standardFirst = {
    ...disabled,
    resources: {
      ...disabled.resources,
      action: false
    }
  };

  assert(
    !canUseMoveAction(standardFirst),
    "Disabled que já gastou a ação padrão não pode transformar a ação em movimento adicional."
  );

  console.log("✓ Disabled move à metade da velocidade");
  console.log("✓ Disabled pode escolher movimento OU ação padrão");
  console.log("✓ Disabled não pode executar a segunda ação após a primeira");
  console.log("==============================");
  console.log("✓ TODOS OS TESTES DE DISABLED PASSARAM");
  console.log("==============================");
}
