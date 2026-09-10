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
  assert.equal(arrest.data?.phase, "ENCOUNTER");
  assert.equal(arrest.data?.response, "REJECT");
  assert.equal(engine.getState().mode, "ENCOUNTER");

  console.log("✓ Resposta ACCEPT/REJECT é determinística e reutilizável");
  console.log("✓ Prisão rejeitada mantém ENCOUNTER quando alvo hostil e funcional");
  console.log("✓ TESTES DE RESOLUÇÃO DE ENCONTRO PASSARAM");
}
