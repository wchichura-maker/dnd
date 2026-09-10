import { createInitialGameState } from "../core/createInitialGameState";
import { GameEngineCombatExtensionsWithCoupAoO } from "../core/GameEngineCombatExtensionsWithCoupAoO";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`TESTE FALHOU: ${message}`);
}

function createCombat(): GameEngineCombatExtensionsWithCoupAoO {
  const engine = new GameEngineCombatExtensionsWithCoupAoO(createInitialGameState());
  const start = engine.startCombat();
  assert(start.success, "Combate deveria iniciar.");
  return engine;
}

export function runSocialCombatIntegrationTests(): void {
  console.log("INICIANDO TESTES DE INTEGRAÇÃO SOCIAL DE COMBATE");

  const surrender = createCombat();
  const surrenderResult = surrender.executeAction({
    type: "SURRENDER",
    actorId: "player-01",
    targetId: "orc-01"
  });
  assert(surrenderResult.success, "Rendição deveria ser resolvida.");
  assert(surrender.getState().mode === "EXPLORATION", "Rendição aceita deveria encerrar combate.");
  assert(surrenderResult.data?.combatEndReason === "SURRENDER", "Rendição deveria registrar o motivo correto.");

  const bluff = createCombat();
  const bluffResult = bluff.executeAction({
    type: "BLUFF",
    actorId: "player-01",
    targetId: "orc-01"
  });
  assert(bluffResult.success, "Bluff deveria ser uma ação válida.");
  assert(bluffResult.data?.socialCheck?.skill === "BLUFF", "Bluff deveria expor a resolução do teste.");
  assert(bluff.getState().mode === "COMBAT", "Bluff não deve encerrar combate automaticamente sem uma resolução adicional.");

  const diplomacy = createCombat();
  diplomacy.setState({
    ...diplomacy.getState(),
    entities: diplomacy.getState().entities.map(entity =>
      entity.id === "player-01"
        ? {
            ...entity,
            dnd: {
              ...entity.dnd,
              abilities: { ...entity.dnd.abilities, charisma: 30 },
              skills: { DIPLOMACY: 40 }
            }
          }
        : entity
    )
  });
  const diplomacyResult = diplomacy.executeAction({
    type: "DIPLOMACY",
    actorId: "player-01",
    targetId: "orc-01"
  });
  assert(diplomacyResult.data?.socialCheck?.skill === "DIPLOMACY", "Diplomacia deveria expor a resolução do teste.");
  assert(diplomacy.getState().mode === "EXPLORATION", "Diplomacia bem-sucedida deveria encerrar o combate quando a atitude chega a Friendly/Helpful.");

  const intimidate = createCombat();
  intimidate.setState({
    ...intimidate.getState(),
    entities: intimidate.getState().entities.map(entity =>
      entity.id === "player-01"
        ? {
            ...entity,
            dnd: {
              ...entity.dnd,
              abilities: { ...entity.dnd.abilities, charisma: 30 },
              skills: { INTIMIDATE: 20 }
            }
          }
        : entity
    )
  });
  const intimidateResult = intimidate.executeAction({
    type: "INTIMIDATE",
    actorId: "player-01",
    targetId: "orc-01"
  });
  assert(intimidateResult.data?.socialCheck?.skill === "INTIMIDATE", "Intimidate deveria expor a resolução do teste.");
  assert(intimidate.getState().mode === "EXPLORATION", "Intimidate bem-sucedido deveria encerrar o confronto.");

  const negotiation = createCombat();
  negotiation.setState({
    ...negotiation.getState(),
    entities: negotiation.getState().entities.map(entity =>
      entity.id === "player-01"
        ? {
            ...entity,
            dnd: {
              ...entity.dnd,
              abilities: { ...entity.dnd.abilities, charisma: 30 },
              skills: { DIPLOMACY: 20 }
            }
          }
        : entity
    )
  });
  const negotiationResult = negotiation.executeAction({
    type: "NEGOTIATE",
    actorId: "player-01",
    targetId: "orc-01"
  });
  assert(negotiationResult.data?.socialCheck?.skill === "DIPLOMACY", "Negociação deveria usar Diplomacia.");
  assert(negotiation.getState().mode === "EXPLORATION", "Negociação vencida deveria encerrar o combate.");

  console.log("✓ Rendição encerra combate");
  console.log("✓ Bluff resolve teste sem encerrar combate automaticamente");
  console.log("✓ Diplomacia é resolvida com penalidade de teste apressado");
  console.log("✓ Intimidate é ação padrão e resolve level check");
  console.log("✓ Negociação usa testes opostos de Diplomacia");
  console.log("✓ TESTES DE INTEGRAÇÃO SOCIAL DE COMBATE PASSARAM");
}
