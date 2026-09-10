import {
  chooseAction
} from "../AI";

import {
  playerCharacter
} from "../Character";

import {
  orc
} from "../Combat";

import {
  createMap
} from "../Map";

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

export function runAITests(): void {
  console.log(
    "INICIANDO TESTES DE IA"
  );

  const map = createMap(
    26,
    16
  );

  const helplessPlayer = {
    ...playerCharacter,
    position: {
      ...orc.position
    },
    hp: -1
  };

  const coupAction = chooseAction(
    orc,
    [helplessPlayer, orc],
    [],
    map
  );

  assert(
    coupAction.type === "COUP_DE_GRACE",
    "IA prioriza Golpe de Misericórdia contra alvo helpless ao alcance"
  );

  assert(
    coupAction.targetId === helplessPlayer.id,
    "IA escolhe o alvo helpless correto"
  );

  const healthyPlayer = {
    ...playerCharacter,
    position: {
      ...orc.position
    },
    hp: playerCharacter.maxHp
  };

  const attackAction = chooseAction(
    orc,
    [healthyPlayer, orc],
    [],
    map
  );

  assert(
    attackAction.type === "ATTACK",
    "IA mantém Ataque normal contra alvo não helpless"
  );

  console.log(
    "✓ IA prioriza Golpe de Misericórdia"
  );

  console.log(
    "✓ IA mantém Ataque normal para alvo funcional"
  );

  console.log(
    "✓ TESTES DE IA PASSARAM"
  );
}
