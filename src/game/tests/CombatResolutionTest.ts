import { GameEngineCombatExtensions } from "../core/GameEngineCombatExtensions";
import { GameEngineCombatExtensionsWithFlee } from "../core/GameEngineCombatExtensionsWithFlee";
import { createInitialGameState } from "../core/createInitialGameState";

export function runCombatResolutionTests(): void {
  console.log("INICIANDO TESTES DE RESOLUÇÃO DE COMBATE");

  const automatic = new GameEngineCombatExtensions(createInitialGameState());
  const automaticStart = automatic.ensureAutomaticCombat();
  if (automaticStart !== null) throw new Error("Combate não deveria iniciar automaticamente enquanto os combatentes estão fora do alcance.");
  if (automatic.getState().mode !== "EXPLORATION") throw new Error("Estado inicial deveria permanecer em exploração.");

  const attackScenario = new GameEngineCombatExtensions(createInitialGameState());
  const attackAction = {
    type: "ATTACK" as const,
    actorId: "player-01",
    targetId: "orc-01"
  };
  const attackResult = attackScenario.executeAction(attackAction);
  if (attackScenario.getState().mode !== "COMBAT") throw new Error("Uma ação de ataque deveria iniciar o combate automaticamente.");
  if (attackResult.message.includes("Combate não iniciado")) throw new Error("A ação de ataque não deveria ser bloqueada pela ausência de botão de combate.");

  const fleeScenario = new GameEngineCombatExtensionsWithFlee(createInitialGameState());
  const fleeStart = fleeScenario.startCombat();
  if (!fleeStart.success) throw new Error("Combate não iniciou para o teste de fuga.");
  const fleeingActor = fleeScenario.getActiveEntity();
  if (!fleeingActor) throw new Error("Entidade ativa não encontrada para o teste de fuga.");
  const fleeResult = fleeScenario.executeAction({
    type: "FLEE",
    actorId: fleeingActor.id,
    destination: { x: fleeingActor.position.x + 4, y: fleeingActor.position.y }
  });
  if (!fleeResult.success) throw new Error(`Fuga deveria ser uma resolução válida: ${fleeResult.message}`);
  if (fleeScenario.getState().mode !== "EXPLORATION") throw new Error("Fuga bem-sucedida deveria retornar para exploração.");
  if (fleeResult.data?.combatEndReason !== "FLEE") throw new Error("Fuga deveria registrar FLEE como motivo do encerramento.");

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

  console.log("✓ Ataque inicia combate automaticamente");
  console.log("✓ Combate não inicia automaticamente enquanto o inimigo hostil está fora do alcance");
  console.log("✓ Fuga usa a corrida D&D e encerra o combate após movimento válido");
  console.log("✓ Morte pode encerrar o combate e retornar para exploração");
  console.log("✓ Rendição, fuga, prisão, blefe, persuasão, intimidação e negociação possuem motivos de resolução");
  console.log("✓ TESTES DE RESOLUÇÃO DE COMBATE PASSARAM");
}
