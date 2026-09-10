import { GameEngineEncounter } from "../core/GameEngineEncounter";
import { createInitialGameState } from "../core/createInitialGameState";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`TESTE FALHOU: ${message}`);
}

export function runEncounterInitiativeTests(): void {
  console.log("INICIANDO TESTES DE ENCONTRO E INICIATIVA");

  const engine = new GameEngineEncounter(createInitialGameState());
  const encounter = engine.startEncounter(["player-01", "orc-01"], "HOSTILITY");
  assert(encounter.success, "Encontro deveria iniciar.");
  assert(engine.getState().mode === "ENCOUNTER", "O estado deveria ser ENCOUNTER.");
  assert(engine.getState().encounter?.active === true, "O encontro deveria estar ativo.");
  assert(engine.getState().encounter?.participantIds.length === 2, "O encontro deveria ter dois participantes.");
  console.log("✓ ENCOUNTER mantém participantes e motivo");

  const initiative = engine.startInitiative();
  assert(initiative.success, "Iniciativa deveria ser determinada.");
  assert(engine.getState().mode === "INITIATIVE", "O estado deveria ser INITIATIVE.");
  assert(engine.getState().combat.active === true, "A iniciativa deveria ter combate preparado.");
  assert(engine.getState().combat.turnOrder.length === 2, "A ordem de iniciativa deveria conter os participantes.");
  assert(engine.getState().encounter?.active === true, "O encontro deveria continuar ativo durante a iniciativa.");
  console.log("✓ INITIATIVE usa a ordem de iniciativa autoritativa");

  const combat = engine.beginCombat();
  assert(combat.success, "Combate deveria começar após iniciativa.");
  assert(engine.getState().mode === "COMBAT", "O estado deveria ser COMBAT.");
  assert(engine.getActiveEntity() !== undefined, "Deveria existir uma entidade ativa.");
  console.log("✓ COMBAT começa preservando a iniciativa");

  const end = engine.endCombat();
  assert(end.success, "Combate deveria poder terminar.");
  assert(engine.getState().mode === "EXPLORATION", "Após resolução o estado deveria voltar para EXPLORATION.");
  assert(!engine.getState().encounter, "O encontro deveria ser encerrado junto com o combate.");
  console.log("✓ RESOLUTION encerra encontro e combate");

  const directStart = new GameEngineEncounter(createInitialGameState());
  const directCombat = directStart.startCombat(["player-01", "orc-01"]);
  assert(directCombat.success, "A API legada startCombat deveria continuar funcionando.");
  assert(directStart.getState().mode === "COMBAT", "startCombat deveria concluir o fluxo até COMBAT.");
  assert(directStart.getState().encounter?.participantIds.length === 2, "startCombat deveria registrar o encontro antes do combate.");
  console.log("✓ startCombat mantém compatibilidade e registra o fluxo completo");

  console.log("✓ TESTES DE ENCONTRO E INICIATIVA PASSARAM");
}
