import type { Combatant } from "./entities/Combatant";
import type { GameAction } from "./actions/Action";
import type { Relationship } from "./relationships/Relationship";

import {
  isWithinWeaponRange
} from "./rules/RangeRules";

import {
  isHostile
} from "./relationships/RelationshipQueries";

/**
 * Escolhe uma ação para uma entidade controlada
 * pela IA.
 *
 * A IA decide o que deseja fazer.
 *
 * O GameEngine decide se a ação é válida
 * e executa as regras correspondentes.
 */
export function chooseAction(
  actor: Combatant,
  entities: Combatant[],
  relationships: Relationship[]
): GameAction {

  const hostileTargets =
    entities.filter(
      entity =>
        entity.id !== actor.id &&
        isHostile(
          relationships,
          actor.id,
          entity.id
        )
    );

  if (
    hostileTargets.length === 0
  ) {
    return {
      type: "WAIT",
      actorId: actor.id
    };
  }

  /*
   * Por enquanto escolhemos o inimigo
   * mais próximo usando distância simples
   * de grade.
   *
   * A decisão final de ataque continuará
   * sendo validada pelo GameEngine.
   */
  const target =
    hostileTargets[0];

  /*
   * Se o alvo estiver dentro do alcance
   * da arma, a IA tenta atacar.
   *
   * Isso inclui casas diagonais adjacentes.
   */
  if (
    isWithinWeaponRange(
      actor,
      target
    )
  ) {
    return {
      type: "ATTACK",
      actorId: actor.id,
      targetId: target.id
    };
  }

  /*
   * Caso esteja fora do alcance,
   * a IA se aproxima.
   */
  const dx =
    target.position.x -
    actor.position.x;

  const dy =
    target.position.y -
    actor.position.y;

  let destination = {
    ...actor.position
  };

  if (
    Math.abs(dx) >=
    Math.abs(dy)
  ) {

    destination = {
      x:
        actor.position.x +
        Math.sign(dx),

      y:
        actor.position.y
    };

  } else {

    destination = {
      x:
        actor.position.x,

      y:
        actor.position.y +
        Math.sign(dy)
    };
  }

  return {
    type: "MOVE",
    actorId: actor.id,
    destination
  };
}