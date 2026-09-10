import { GameEngineCombatExtensions } from "../core/GameEngineCombatExtensions";
import { createInitialGameState } from "../core/createInitialGameState";

export function runCombatResolutionTests(): void {
  console.log("INICIANDO TESTES DE RESOLUÇÃO DE COMBATE");

  const engine = new GameEngineCombatExtensions(createInitialGameState());
  const start = engine.startCombat();
  if (!start.success) throw new Error("Combate não iniciou no teste de resolução.");

  const combatants = engine.getState().entities;
  const player = combatants.find(entity => entity.id === "player-01");
  const orc = combatants.find(entity => entity.id === "orc-01");
  if (!player || !orc) throw new Error("Combatentes do estado inicial não encontrados.");

  engine.setState({
    ...engine.getState(),
    entities: engine.getState().entities.map(entity => entity.id === orc.id ? { ...entity, hp: -10 } : entity)
  });

  const result = engine.resolveCombat("DEATH");
  if (!result.success) throw new Error("Resolução de combate por morte deveria ser aceita.");
  if (engine.getState().mode !== "EXPLORATION") throw new Error("Combate deveria retornar para exploração.");
  if (result.data?.combatEndReason !== "DEATH") throw new Error("Motivo de encerramento deveria ser DEATH.");

  const reasons = ["SURRENDER", "FLEE", "ARREST", "BLUFF", "PERSUASION", "INTIMIDATION", "NEGOTIATION"] as const;
  for (const reason of reasons) {
    const scenario = new GameEngineCombatExtensions(createInitialGameState());
    const scenarioStart = scenario.startCombat();
    if (!scenarioStart.success) throw new Error(`Combate não iniciou para ${reason}.`);
    const resolved = scenario.resolveCombat(reason);
    if (!resolved.success) throw new Error(`Resolução ${reason} deveria ser aceita.`);
    if (scenario.getState().mode !== "EXPLORATION") throw new Error(`Resolução ${reason} não retornou para exploração.`);
  }

  console.log("✓ Morte pode encerrar o combate e retornar para exploração");
  console.log("✓ Rendição, fuga, prisão, blefe, persuasão, intimidação e negociação possuem motivos de resolução");
  console.log("✓ TESTES DE RESOLUÇÃO DE COMBATE PASSARAM");
}
