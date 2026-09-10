import { GameEngineCombatExtensions } from "../core/GameEngineCombatExtensions";
import { createInitialGameState } from "../core/createInitialGameState";

function createCombatScenario(): GameEngineCombatExtensions {
  const state = createInitialGameState();
  const prepared = {
    ...state,
    entities: state.entities.map(entity => {
      if (entity.id === "player-01") return { ...entity, initiative: 20 };
      if (entity.id === "orc-01") return { ...entity, initiative: 1 };
      return entity;
    })
  };

  const engine = new GameEngineCombatExtensions(prepared);
  const result = engine.startCombat(["player-01", "orc-01"]);
  if (!result.success) throw new Error(`Combate não iniciou: ${result.message}`);
  return engine;
}

function setPositions(engine: GameEngineCombatExtensions, playerPosition: { x: number; y: number }, orcPosition: { x: number; y: number }): void {
  const state = engine.getState();
  engine.setState({
    ...state,
    entities: state.entities.map(entity => {
      if (entity.id === "player-01") return { ...entity, position: playerPosition };
      if (entity.id === "orc-01") return { ...entity, position: orcPosition };
      return entity;
    }),
    turn: {
      ...state.turn,
      characterId: "player-01",
      resources: {
        ...state.turn.resources,
        action: true,
        moveAction: true,
        fiveFootStepAvailable: true,
        hasMoved: false,
        hasTakenFiveFootStep: false,
        movement: 6
      }
    },
    combat: {
      ...state.combat,
      currentTurnIndex: 0
    }
  });
}

export function runCombatMovementIntegrationTests(): void {
  console.log("INICIANDO TESTES DE INTEGRAÇÃO DE MOVIMENTO DE COMBATE");

  const withdraw = createCombatScenario();
  setPositions(withdraw, { x: 5, y: 5 }, { x: 6, y: 5 });
  const withdrawResult = withdraw.executeAction({ type: "WITHDRAW", actorId: "player-01", destination: { x: 3, y: 5 } });
  if (!withdrawResult.success) throw new Error(`Withdraw deveria ser concluído: ${withdrawResult.message}`);
  const withdrawPlayer = withdraw.getState().entities.find(entity => entity.id === "player-01");
  if (!withdrawPlayer || withdrawPlayer.position.x !== 3 || withdrawPlayer.position.y !== 5) throw new Error("Withdraw não levou o personagem ao destino.");
  if (withdraw.getState().turn.resources.action || withdraw.getState().turn.resources.moveAction) throw new Error("Withdraw deveria consumir a rodada completa.");
  if (withdrawResult.data?.opportunityAttacks?.length) throw new Error("O primeiro quadrado de saída do Withdraw não deveria provocar AoO.");

  const run = createCombatScenario();
  setPositions(run, { x: 3, y: 5 }, { x: 4, y: 5 });
  const runResult = run.executeAction({ type: "RUN", actorId: "player-01", destination: { x: 9, y: 5 } });
  if (!runResult.success) throw new Error(`Run deveria ser concluído: ${runResult.message}`);
  const runPlayer = run.getState().entities.find(entity => entity.id === "player-01");
  if (!runPlayer || runPlayer.position.x !== 9 || runPlayer.position.y !== 5) throw new Error("Run não levou o personagem ao destino.");
  if (run.getState().turn.resources.action || run.getState().turn.resources.moveAction) throw new Error("Run deveria consumir a rodada completa.");
  if (!runResult.data?.opportunityAttacks?.length) throw new Error("Run deveria provocar AoO ao sair de uma casa ameaçada.");

  const charge = createCombatScenario();
  setPositions(charge, { x: 3, y: 5 }, { x: 6, y: 5 });
  const chargeResult = charge.executeAction({ type: "CHARGE", actorId: "player-01", targetId: "orc-01", destination: { x: 5, y: 5 } });
  if (!chargeResult.success) throw new Error(`Charge deveria ser concluído: ${chargeResult.message}`);
  if (charge.getState().turn.resources.action || charge.getState().turn.resources.moveAction) throw new Error("Charge deveria consumir a rodada completa.");
  if (chargeResult.data?.charge !== true) throw new Error("Resultado da Charge deveria identificar a investida.");

  console.log("✓ Withdraw completo consome rodada e protege o primeiro quadrado");
  console.log("✓ Run completo consome rodada e pode provocar AoO");
  console.log("✓ Charge completo consome rodada e executa o ataque");
  console.log("✓ TESTES DE INTEGRAÇÃO DE MOVIMENTO DE COMBATE PASSARAM");
}
