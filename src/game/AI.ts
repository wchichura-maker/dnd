import type { Combatant } from "./entities/Combatant";
import type { Relationship } from "./relationships/Relationship";
import { getReachablePositions } from "./rules/Pathfinding";
import { isWithinWeaponRange } from "./rules/RangeRules";
import { isHelpless } from "./rules/CoupDeGraceRules";
import { isDead } from "./rules/ConditionRules";
import type { GameMap } from "./types/Map";

function distance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

function relationshipBetween(
  relationships: Relationship[],
  a: string,
  b: string
): Relationship | undefined {
  return relationships.find(
    relationship =>
      (relationship.entityAId === a && relationship.entityBId === b) ||
      (relationship.entityAId === b && relationship.entityBId === a)
  );
}

function getPotentialTargets(
  actor: Combatant,
  entities: Combatant[],
  relationships: Relationship[]
): Combatant[] {
  const living = entities.filter(entity => entity.id !== actor.id && !isDead(entity));
  if (relationships.length === 0) {
    return living.filter(entity => entity.type === "PLAYER");
  }

  return living.filter(entity => {
    const relationship = relationshipBetween(relationships, actor.id, entity.id);
    return relationship?.hostile === true;
  });
}

function selectTarget(
  actor: Combatant,
  entities: Combatant[],
  relationships: Relationship[]
): Combatant | undefined {
  const candidates = getPotentialTargets(actor, entities, relationships);
  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, candidate) => {
    const bestHelpless = isHelpless(best);
    const candidateHelpless = isHelpless(candidate);
    if (candidateHelpless !== bestHelpless) {
      return candidateHelpless ? candidate : best;
    }

    const bestDistance = distance(actor.position, best.position);
    const candidateDistance = distance(actor.position, candidate.position);
    if (candidateDistance !== bestDistance) {
      return candidateDistance < bestDistance ? candidate : best;
    }

    return candidate.id < best.id ? candidate : best;
  });
}

/**
 * IA de combate determinística.
 *
 * A IA não decide regras: apenas escolhe uma intenção de ação.
 * O Game Core continua responsável por validar e executar a ação.
 *
 * Prioridade:
 * 1. alvo hostil vivo; sem relações, mantém compatibilidade mirando PLAYER;
 * 2. alvo helpless ao alcance -> COUP_DE_GRACE;
 * 3. alvo ao alcance -> ATTACK;
 * 4. aproximar-se do alvo usando posições realmente alcançáveis;
 * 5. sem alvo ou sem movimento -> WAIT.
 */
export function chooseAction(
  actor: Combatant,
  entities: Combatant[],
  relationships: Relationship[] = [],
  map?: GameMap
) {
  if (isDead(actor)) {
    return { type: "WAIT" as const, actorId: actor.id };
  }

  const target = selectTarget(actor, entities, relationships);
  if (!target) {
    return { type: "WAIT" as const, actorId: actor.id };
  }

  if (isHelpless(target) && isWithinWeaponRange(actor, target)) {
    return {
      type: "COUP_DE_GRACE" as const,
      actorId: actor.id,
      targetId: target.id
    };
  }

  if (isWithinWeaponRange(actor, target)) {
    return {
      type: "ATTACK" as const,
      actorId: actor.id,
      targetId: target.id
    };
  }

  const movement = Math.max(0, actor.movement);
  if (movement <= 0 || !map) {
    return { type: "WAIT" as const, actorId: actor.id };
  }

  const reachable = getReachablePositions(
    map,
    entities,
    actor.position,
    movement,
    actor.id
  );

  const candidates = reachable.filter(
    position => position.x !== actor.position.x || position.y !== actor.position.y
  );

  if (candidates.length === 0) {
    return { type: "WAIT" as const, actorId: actor.id };
  }

  const best = candidates.reduce((currentBest, candidate) => {
    const currentDistance = distance(currentBest, target.position);
    const candidateDistance = distance(candidate, target.position);
    if (candidateDistance !== currentDistance) {
      return candidateDistance < currentDistance ? candidate : currentBest;
    }

    if (candidate.y !== currentBest.y) {
      return candidate.y < currentBest.y ? candidate : currentBest;
    }
    return candidate.x < currentBest.x ? candidate : currentBest;
  });

  return {
    type: "MOVE" as const,
    actorId: actor.id,
    destination: best
  };
}
