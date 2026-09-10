import assert from "node:assert/strict";
import { createInitialGameState } from "../core/createInitialGameState";
import { GameEngineEncounterActions } from "../core/GameEngineEncounterActions";

export function runEncounterActionsTests(): void {
  console.log("INICIANDO TESTES DE AÇÕES DE ENCONTRO");

  const engine = new GameEngineEncounterActions(createInitialGameState());
  const playerId = "player-01";
  const orcId = "orc-01";

  const encounter = engine.startEncounter([playerId, orcId], "HOSTILITY");
  assert.equal(encounter.success, true);
  assert.equal(engine.getState().mode, "ENCOUNTER");

  const talk = engine.executeAction({ type: "TALK", actorId: playerId, targetId: orcId });
  assert.equal(talk.success, true);
  assert.equal(engine.getState().mode, "ENCOUNTER");

  const observe = engine.executeAction({ type: "OBSERVE", actorId: playerId, targetId: orcId });
  assert.equal(observe.success, true);
  assert.equal(engine.getState().mode, "ENCOUNTER");

  const attack = engine.executeAction({ type: "ATTACK", actorId: playerId, targetId: orcId });

  // ATTACK must escalate the encounter immediately. The actual attack is
  // resolved only if initiative gives the actor the active turn; otherwise
  // the action correctly returns a turn-order failure while COMBAT remains active.
  assert.equal(engine.getState().mode, "COMBAT");
  assert.equal(engine.getState().encounter?.active, true);
  assert.ok(engine.getState().combat.turnOrder.includes(playerId));
  assert.ok(engine.getState().combat.turnOrder.includes(orcId));
  assert.ok(attack.success || attack.message.includes("Não é o turno desta entidade"));

  console.log("✓ TALK permanece em ENCOUNTER");
  console.log("✓ OBSERVE permanece em ENCOUNTER");
  console.log("✓ ATTACK transiciona ENCOUNTER → INITIATIVE → COMBAT");
  console.log("✓ TESTES DE AÇÕES DE ENCONTRO PASSARAM");
}
