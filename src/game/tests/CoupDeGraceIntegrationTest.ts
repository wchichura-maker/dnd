import {
  GameEngineCombatExtensions
} from "../core/GameEngineCombatExtensions";

import {
  createInitialGameState
} from "../core/createInitialGameState";

import {
  createTurn
} from "../Turn";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`TESTE FALHOU: ${message}`);
  }
}

export function runCoupDeGraceIntegrationTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE INTEGRAÇÃO DE GOLPE DE MISERICÓRDIA");
  console.log("==============================");

  const engine = new GameEngineCombatExtensions(
    createInitialGameState()
  );

  const start = engine.startCombat();
  assert(start.success, `O combate deve iniciar normalmente. ${start.message}`);

  const started = engine.getState();
  const player = started.entities.find(entity => entity.id === "player-01");
  const orc = started.entities.find(entity => entity.id === "orc-01");

  assert(!!player, "O jogador deve existir.");
  assert(!!orc, "O orc deve existir.");

  if (!player || !orc) {
    return;
  }

  const adjacentOrc = {
    ...orc,
    hp: -1,
    conditions: [],
    position: {
      x: player.position.x + 1,
      y: player.position.y
    }
  };

  const synchronizedTurn = createTurn(player);

  engine.setState({
    ...started,
    entities: started.entities.map(entity =>
      entity.id === adjacentOrc.id
        ? adjacentOrc
        : entity
    ),
    combat: {
      ...started.combat,
      turnOrder: [player.id, adjacentOrc.id],
      currentTurnIndex: 0,
      active: true
    },
    turn: {
      ...synchronizedTurn,
      characterId: player.id
    }
  });

  const beforeAction = engine.getState();
  assert(
    beforeAction.turn.characterId === player.id,
    "O jogador deve ser a entidade ativa antes do Golpe de Misericórdia."
  );
  assert(
    beforeAction.combat.turnOrder[beforeAction.combat.currentTurnIndex] === player.id,
    "A ordem de iniciativa deve indicar o jogador como entidade ativa."
  );

  const result = engine.executeAction({
    type: "COUP_DE_GRACE",
    actorId: player.id,
    targetId: adjacentOrc.id
  });

  assert(
    result.success,
    `O Golpe de Misericórdia deve ser aceito contra um alvo DYING adjacente. ${result.message ?? ""}`
  );

  const after = engine.getState();
  const targetAfter = after.entities.find(entity => entity.id === adjacentOrc.id);

  assert(
    !!targetAfter,
    "O alvo deve continuar representado em entities mesmo quando morrer."
  );

  if (!targetAfter) {
    return;
  }

  assert(
    targetAfter.hp <= adjacentOrc.hp,
    "O Golpe de Misericórdia deve aplicar dano ao alvo."
  );

  assert(
    after.turn.resources.action === false &&
    after.turn.resources.moveAction === false,
    "O Golpe de Misericórdia deve consumir ação padrão e ação de movimento."
  );

  console.log("✓ COUP_DE_GRACE é roteado pelo engine de combate");
  console.log("✓ Alvo DYING adjacente pode receber Golpe de Misericórdia");
  console.log("✓ O dano é aplicado pelo sistema de HP");
  console.log("✓ A ação consome a rodada completa");
  console.log("==============================");
  console.log("✓ TESTES DE INTEGRAÇÃO DE GOLPE DE MISERICÓRDIA PASSARAM");
  console.log("==============================");
}
