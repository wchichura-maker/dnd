import type { Combatant } from "../entities/Combatant";

const DEFAULT_MAX_FOOD = 100;
const FOOD_PER_MOVED_TILE = 1;

/**
 * Consome alimento proporcionalmente ao deslocamento realizado.
 *
 * A HUD apenas apresenta food/maxFood; a regra pertence ao Game Core.
 */
export function consumeFoodForMovement(
  entity: Combatant,
  movedTiles: number
): Combatant {
  if (movedTiles <= 0 || entity.maxFood === undefined || entity.food === undefined) {
    return entity;
  }

  const maxFood = Math.max(0, entity.maxFood || DEFAULT_MAX_FOOD);
  const currentFood = Math.max(0, entity.food);
  const foodCost = Math.max(0, Math.floor(movedTiles * FOOD_PER_MOVED_TILE));
  const food = Math.max(0, Math.min(maxFood, currentFood - foodCost));

  if (food === entity.food) {
    return entity;
  }

  return {
    ...entity,
    food
  };
}

export function getMovementFoodCost(movedTiles: number): number {
  return Math.max(0, Math.floor(movedTiles * FOOD_PER_MOVED_TILE));
}
