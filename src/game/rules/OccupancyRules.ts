import type { Combatant } from "../entities/Combatant";
import type { Position } from "../world/Position";

/**
 * Verifica se uma posição é ocupada
 * por alguma entidade viva.
 *
 * A própria entidade informada em
 * ignoreEntityId pode ser ignorada.
 */
export function isPositionOccupied(
  position: Position,
  entities: Combatant[],
  ignoreEntityId?: string
): boolean {

  return entities.some(
    entity => {

      /*
       * Ignora a própria entidade.
       */
      if (
        entity.id ===
        ignoreEntityId
      ) {
        return false;
      }

      /*
       * Entidades com 0 HP ou menos
       * não bloqueiam movimento.
       */
      if (
        entity.hp <= 0
      ) {
        return false;
      }

      return (
        entity.position.x ===
          position.x &&
        entity.position.y ===
          position.y
      );
    }
  );
}

/**
 * Retorna a entidade que ocupa
 * determinada posição.
 *
 * Entidades mortas não são consideradas.
 */
export function getEntityAtPosition(
  position: Position,
  entities: Combatant[],
  ignoreEntityId?: string
): Combatant | undefined {

  return entities.find(
    entity => {

      if (
        entity.id ===
        ignoreEntityId
      ) {
        return false;
      }

      if (
        entity.hp <= 0
      ) {
        return false;
      }

      return (
        entity.position.x ===
          position.x &&
        entity.position.y ===
          position.y
      );
    }
  );
}