import type { Combatant } from "./entities/Combatant";
import type { Relationship } from "./relationships/Relationship";
import { findPath, getReachablePositions } from "./rules/Pathfinding";
import { isWithinWeaponRange } from "./rules/RangeRules";
import { isHelpless } from "./rules/CoupDeGraceRules";
import { isDead } from "./rules/ConditionRules";
import { getChargeMovement, getWithdrawMovement, getRunMovement, isStraightLinePath } from "./rules/CombatMovementRules";
import type { GameMap } from "./types/Map";
import type { Position } from "./world/Position";

type TargetRelation = Relationship;

function distance(from: Position, to: Position): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

function getRelationship(
  relationships: TargetRelation[],
  actorId: string,
  targetId: string
): TargetRelation | undefined {
  return relationships.find(relationship =>
    (relationship.entityAId === actorId && relationship.entityBId === targetId) ||
    (relationship.entityAId === targetId && relationship.entityBId === actorId)
  );
}

function isHostileTarget(
  relationships: TargetRelation[],
  actorId: string,
  targetId: string
): boolean {
  return getRelationship(relationships, actorId, targetId)?.hostile === true;
}

function getPotentialTargets(
  actor: Combatant,
  entities: Combatant[],
  relationships: TargetRelation[]
): Combatant[] {
  const living = entities.filter(entity => entity.id !== actor.id && !isDead(entity));
  if (relationships.length === 0) return living.filter(entity => entity.type === "PLAYER");
  return living.filter(entity => isHostileTarget(relationships, actor.id, entity.id));
}

function selectTarget(
  actor: Combatant,
  entities: Combatant[],
  relationships: TargetRelation[]
): Combatant | undefined {
  const candidates = getPotentialTargets(actor, entities, relationships);
  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, candidate) => {
    const bestHelpless = isHelpless(best);
    const candidateHelpless = isHelpless(candidate);
    if (candidateHelpless !== bestHelpless) return candidateHelpless ? candidate : best;

    const bestDistance = distance(actor.position, best.position);
    const candidateDistance = distance(actor.position, candidate.position);
    if (candidateDistance !== bestDistance) return candidateDistance < bestDistance ? candidate : best;
    return candidate.id < best.id ? candidate : best;
  });
}

function isWalkable(map: GameMap, position: Position): boolean {
  return map.tiles[position.y]?.[position.x]?.walkable === true;
}

function isOccupied(position: Position, entities: Combatant[], actorId: string): boolean {
  return entities.some(entity =>
    entity.id !== actorId && !isDead(entity) &&
    entity.position.x === position.x && entity.position.y === position.y
  );
}

function findChargeDestination(
  actor: Combatant,
  target: Combatant,
  entities: Combatant[],
  map: GameMap
): Position | undefined {
  if (!actor.dnd.equipment.weapon?.melee) return undefined;
  if (distance(actor.position, target.position) < 3) return undefined;

  const destinations: Position[] = [];
  for (let y = target.position.y - 1; y <= target.position.y + 1; y++) {
    for (let x = target.position.x - 1; x <= target.position.x + 1; x++) {
      if (x === target.position.x && y === target.position.y) continue;
      const position = { x, y };
      if (!isWalkable(map, position) || isOccupied(position, entities, actor.id)) continue;
      const path = findPath(map, entities, actor.position, position, actor.id);
      if (!path || path.cost < 2 || path.cost > getChargeMovement(actor.movement)) continue;
      const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
        ? path.path
        : [actor.position, ...path.path];
      if (!isStraightLinePath(steps)) continue;
      destinations.push(position);
    }
  }

  destinations.sort((a, b) => {
    const da = distance(actor.position, a);
    const db = distance(actor.position, b);
    if (da !== db) return db - da;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  return destinations[0];
}

function chooseRetreatDestination(
  actor: Combatant,
  target: Combatant,
  entities: Combatant[],
  map: GameMap,
  maxMovement: number,
  straightOnly: boolean
): Position | undefined {
  const reachable = getReachablePositions(map, entities, actor.position, maxMovement, actor.id)
    .filter(position => position.x !== actor.position.x || position.y !== actor.position.y);

  const candidates = reachable.filter(position => {
    if (!straightOnly) return true;
    const path = findPath(map, entities, actor.position, position, actor.id);
    if (!path) return false;
    const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
      ? path.path
      : [actor.position, ...path.path];
    return isStraightLinePath(steps);
  });

  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, candidate) => {
    const bestDistance = distance(best, target.position);
    const candidateDistance = distance(candidate, target.position);
    if (candidateDistance !== bestDistance) return candidateDistance > bestDistance ? candidate : best;
    if (candidate.y !== best.y) return candidate.y > best.y ? candidate : best;
    return candidate.x > best.x ? candidate : best;
  });
}

/**
 * IA de combate determinística.
 *
 * Prioridade:
 * 1. alvo hostil vivo;
 * 2. helpless ao alcance -> COUP_DE_GRACE;
 * 3. alvo ao alcance -> ATTACK;
 * 4. baixa vida em combate próximo -> WITHDRAW;
 * 5. baixa vida com espaço -> RUN;
 * 6. investida quando uma trajetória reta válida permite alcançar o alvo;
 * 7. aproximação normal;
 * 8. WAIT.
 *
 * A IA escolhe apenas a intenção. O Game Core continua responsável por
 * validar regras, recursos, AoO, dano e transições de estado.
 */
export function chooseAction(
  actor: Combatant,
  entities: Combatant[],
  relationships: TargetRelation[] = [],
  map?: GameMap
) {
  if (isDead(actor)) return { type: "WAIT" as const, actorId: actor.id };

  const target = selectTarget(actor, entities, relationships);
  if (!target) return { type: "WAIT" as const, actorId: actor.id };

  if (isHelpless(target) && isWithinWeaponRange(actor, target)) {
    return { type: "COUP_DE_GRACE" as const, actorId: actor.id, targetId: target.id };
  }

  if (isWithinWeaponRange(actor, target)) {
    const lowHealth = actor.hp > 0 && actor.hp / actor.maxHp <= 0.25;
    if (lowHealth && map) {
      const withdraw = chooseRetreatDestination(actor, target, entities, map, getWithdrawMovement(actor.movement), false);
      if (withdraw) return { type: "WITHDRAW" as const, actorId: actor.id, targetId: target.id, destination: withdraw };
    }
    return { type: "ATTACK" as const, actorId: actor.id, targetId: target.id };
  }

  const movement = Math.max(0, actor.movement);
  if (movement <= 0 || !map) return { type: "WAIT" as const, actorId: actor.id, targetId: target.id };

  const lowHealth = actor.hp > 0 && actor.hp / actor.maxHp <= 0.25;
  if (lowHealth) {
    const run = chooseRetreatDestination(actor, target, entities, map, getRunMovement(actor.movement), true);
    if (run) return { type: "RUN" as const, actorId: actor.id, targetId: target.id, destination: run };
  }

  const chargeDestination = findChargeDestination(actor, target, entities, map);
  if (chargeDestination) {
    return { type: "CHARGE" as const, actorId: actor.id, targetId: target.id, destination: chargeDestination };
  }

  const reachable = getReachablePositions(map, entities, actor.position, movement, actor.id);
  const candidates = reachable.filter(position => position.x !== actor.position.x || position.y !== actor.position.y);
  if (candidates.length === 0) return { type: "WAIT" as const, actorId: actor.id, targetId: target.id };

  const best = candidates.reduce((currentBest, candidate) => {
    const currentDistance = distance(currentBest, target.position);
    const candidateDistance = distance(candidate, target.position);
    if (candidateDistance !== currentDistance) return candidateDistance < currentDistance ? candidate : currentBest;
    if (candidate.y !== currentBest.y) return candidate.y < currentBest.y ? candidate : currentBest;
    return candidate.x < currentBest.x ? candidate : currentBest;
  });

  return { type: "MOVE" as const, actorId: actor.id, targetId: target.id, destination: best };
}
