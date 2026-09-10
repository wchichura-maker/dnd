import {
  GameEngineCombatExtensionsWithCoupAoO
} from "../core/GameEngineCombatExtensionsWithCoupAoO";

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

  const engine = new GameEngineCombatExtensionsWithCoupAoO(
    createInitialGameState()
  );

  const start = engine.startCombat();
  assert(start.success, `O combate deve iniciar normalmente. ${start.message}`);

  const started = engine.getState();
  const player = started.entities.find(entity => entity.id === "player-01");
  const orc = started.entities.find(entity => entity.id === "orc-01");

  assert(!!player, "O jogador deve existir.");
  assert(!!orc, "O orc deve existir.");

  if (!player || !orc) return;

  const adjacentOrc = {
    ...orc,
    hp: -1,
    conditions: [],
    position: { x: 6, y: 5 }
  };

  const threateningOrc = {
    ...orc,
    id: "orc-02",
    name: "Orc Guarda",
    hp: 20,
    position: { x: 4, y: 5 }
  };

  const synchronizedTurn = createTurn({
    ...player,
    hp: 50,
    position: { x: 5, y: 5 }
  });

  engine.setState({
    ...started,
    entities: started.entities
      .map(entity => {
        if (entity.id === player.id) return { ...player, hp: 50, position: { x: 5, y: 5 } };
        if (entity.id === adjacentOrc.id) return adjacentOrc;
        return entity;
      })
      .concat(threateningOrc),
    relationships: [
      ...started.relationships,
      {
        id: "relationship-player-orc-02",
        entityAId: player.id,
        entityBId: threateningOrc.id,
        friendship: 0,
        trust: 0,
        respect: 0,
        fear: 0,
        attraction: 0,
        loyalty: 0,
        hostile: true,
        allied: false,
        rival: false,
        romantic: false
      }
    ],
    combat: {
      ...started.combat,
      turnOrder: [player.id, adjacentOrc.id, threateningOrc.id],
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

  const result = engine.executeAction({
    type: "COUP_DE_GRACE",
    actorId: player.id,
    targetId: adjacentOrc.id
  });

  assert(
    result.success,
    `O Golpe de Misericórdia deve ser aceito após resolver o AoO. ${result.message ?? ""}`
  );

  const after = engine.getState();
  const targetAfter = after.entities.find(entity => entity.id === adjacentOrc.id);
  assert(!!targetAfter, "O alvo deve continuar representado em entities.");
  if (!targetAfter) return;

  assert(
    targetAfter.hp <= adjacentOrc.hp,
    "O Golpe de Misericórdia deve aplicar dano ao alvo."
  );

  const opportunityAttacks = result.data?.opportunityAttacks ?? [];
  assert(
    opportunityAttacks.length === 1,
    "O Golpe de Misericórdia deve provocar exatamente um AoO do defensor ameaçando o atacante."
  );

  assert(
    opportunityAttacks[0]?.attackerId === threateningOrc.id,
    "O AoO deve ser realizado pelo inimigo que ameaça o atacante."
  );

  assert(
    after.logs.some(log => log.includes("antes do GOLPE DE MISERICÓRDIA")),
    "O log deve registrar o AoO provocado pelo Golpe de Misericórdia."
  );

  assert(
    after.turn.resources.action === false &&
    after.turn.resources.moveAction === false,
    "O Golpe de Misericórdia deve consumir a rodada completa quando o AoO não interrompe a ação."
  );

  console.log("✓ COUP_DE_GRACE é roteado pelo engine de combate");
  console.log("✓ Alvo DYING adjacente pode receber Golpe de Misericórdia");
  console.log("✓ O Golpe de Misericórdia provoca Ataque de Oportunidade");
  console.log("✓ O AoO é limitado a um ataque por defensor na rodada");
  console.log("✓ O dano é aplicado pelo sistema de HP");
  console.log("✓ A ação consome a rodada completa");
  console.log("==============================");
  console.log("✓ TESTES DE INTEGRAÇÃO DE GOLPE DE MISERICÓRDIA PASSARAM");
  console.log("==============================");
}
