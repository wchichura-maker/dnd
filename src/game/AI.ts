import type { Combatant } from "./entities/Combatant";
import {
  getReachablePositions
} from "./rules/Pathfinding";

import {
  isWithinWeaponRange
} from "./rules/RangeRules";

import {
  isHelpless
} from "./rules/CoupDeGraceRules";

import {
  isDead
} from "./rules/ConditionRules";

function distance(from: { x: number; y: number }, to: { x: number; y: number }) {
  return Math.max(
    Math.abs(to.x - from.x),
    Math.abs(to.y - from.y)
  );
}

import type { GameMap } from "./types/Map";

/**
 * IA de combate inicial.
 *
 * A IA escolhe um único objetivo para o turno.
 * O movimento é calculado usando o deslocamento da própria ficha,
 * respeitando obstáculos e o custo das diagonais do motor.
 *
 * Prioridade ofensiva:
 * 1. Golpe de Misericórdia contra alvo helpless ao alcance.
 * 2. Ataque normal contra alvo ao alcance.
 * 3. Aproximação usando o deslocamento disponível.
 */
export function chooseAction(
  actor: Combatant,
  entities: Combatant[],
  _relationships: unknown[],
  map?: GameMap
) {
  const player = entities.find(
    entity =>
      entity.type === "PLAYER" &&
      !isDead(entity)
  );

  if (!player) {
    return {
      type: "WAIT" as const,
      actorId: actor.id
    };
  }

  if (
    isHelpless(player) &&
    isWithinWeaponRange(actor, player)
  ) {
    return {
      type: "COUP_DE_GRACE" as const,
      actorId: actor.id,
      targetId: player.id
    };
  }

  if (
    isWithinWeaponRange(
      actor,
      player
    )
  ) {
    return {
      type: "ATTACK" as const,
      actorId: actor.id,
      targetId: player.id
    };
  }

  const movement = Math.max(
    0,
    actor.movement
  );

  if (movement <= 0) {
    return {
      type: "WAIT" as const,
      actorId: actor.id
    };
  }

  if (!map) {
    return {
      type: "WAIT" as const,
      actorId: actor.id
    };
  }

  const reachable =
    getReachablePositions(
      map,
      entities,
      actor.position,
      movement,
      actor.id
    );

  const candidates = reachable.filter(
    position =>
      position.x !== actor.position.x ||
      position.y !== actor.position.y
  );

  if (candidates.length === 0) {
    return {
      type: "WAIT" as const,
      actorId: actor.id
    };
  }

  const best = candidates.reduce(
    (currentBest, candidate) => {
      const currentDistance =
        distance(
          currentBest,
          player.position
        );

      const candidateDistance =
        distance(
          candidate,
          player.position
        );

      return candidateDistance < currentDistance
        ? candidate
        : currentBest;
    }
  );

  return {
    type: "MOVE" as const,
    actorId: actor.id,
    destination: best
  };
}
