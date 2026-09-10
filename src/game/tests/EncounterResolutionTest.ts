import assert from "node:assert/strict";
import { createInitialGameState } from "../core/createInitialGameState";
import { GameEngineEncounterActions } from "../core/GameEngineEncounterActions";
import { resolveEncounterResponse } from "../rules/EncounterResolutionRules";

export function runEncounterResolutionTests(): void {
  console.log("INICIANDO TESTES DE RESOLUÇÃO DE ENCONTRO");

  const accepted = resolveEncounterResponse("NEGOTIATION", true);
  assert.equal(accepted.success, true);
  assert.equal(accepted.response, "ACCEPT");

  const rejected = resolveEncounterResponse("NEGOTIATION", false);
  assert.equal(rejected.success, false);
  assert.equal(rejected.response, "REJECT");

  const engine = new GameEngineEncounterActions(createInitialGameState());
  const playerId = "player-01";
  const orcId = "orc-01";
  assert.equal(engine.startEncounter([playerId, orcId], "HOSTILITY").success, true);

  const arrest = engine.executeAction({ type: "ARREST", actorId: playerId, targetId: orcId });
  assert.equal(arrest.success, true);
  assert.equal(arrest.data?.response, "REJECT");
  assert.equal(arrest.data?.escalated, true);
  assert.equal(engine.getState().mode, "COMBAT");

  const peaceful = new GameEngineEncounterActions(createInitialGameState());
  const state = peaceful.getState();
  peaceful.setState({
    ...state,
    relationships: state.relationships.map(item =>
      ((item.entityAId === playerId && item.entityBId === orcId) || (item.entityAId === orcId && item.entityBId === playerId))
        ? { ...item, hostile: false }
        : item
    )
  });
  assert.equal(peaceful.startEncounter([playerId, orcId], "SOCIAL").success, true);
  const acceptedArrest = peaceful.executeAction({ type: "ARREST", actorId: playerId, targetId: orcId });
  assert.equal(acceptedArrest.success, true);
  assert.equal(acceptedArrest.data?.response, "ACCEPT");
  assert.equal(peaceful.getState().mode, "EXPLORATION");

  const resolved = new GameEngineEncounterActions(createInitialGameState());
  assert.equal(resolved.startEncounter([playerId, orcId], "SOCIAL").success, true);
  const resolution = resolved.endEncounter("OTHER");
  assert.equal(resolution.success, true);
  assert.equal(resolved.getState().mode, "EXPLORATION");
  assert.equal(resolved.getState().encounter, undefined);

  console.log("✓ Resposta ACCEPT/REJECT é determinística e reutilizável");
  console.log("✓ Prisão rejeitada escala encontro para COMBAT");
  console.log("✓ Prisão aceita resolve encontro e retorna para EXPLORATION");
  console.log("✓ Encontro pode ser resolvido diretamente sem combate");
  console.log("✓ TESTES DE RESOLUÇÃO DE ENCONTRO PASSARAM");
}
