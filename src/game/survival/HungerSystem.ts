import type { Combatant } from "../entities/Combatant";
import type { HungerState } from "../core/GameState";
import { rollDie, rollDice } from "../Dice";
import { getConstitutionModifier } from "../rules/DndRules";

export const DEFAULT_MAX_FOOD = 100;
export const FOOD_DAY_SECONDS = 24 * 60 * 60;
export const STARVATION_GRACE_DAYS = 3;

export type HungerAdvanceResult = {
  entity: Combatant;
  hunger: HungerState;
  messages: string[];
};

/**
 * Regra do jogo baseada no D&D 3.5:
 * - 1 libra de alimento por dia é representada por uma refeição diária completa.
 * - O personagem pode passar 3 dias sem comer antes dos testes de fome.
 * - A partir do 4º dia, há um teste de Constituição por dia: CD 10 +1 por teste anterior.
 * - Falha: 1d6 de dano não letal e condição FATIGUED.
 *
 * O campo food/maxFood é uma representação visual de fome para a HUD.
 * Ele cai linearmente durante as 24h desde a última alimentação.
 */
export function advanceHunger(
  entity: Combatant,
  hunger: HungerState,
  worldSeconds: number
): HungerAdvanceResult {
  if (entity.food === undefined || entity.maxFood === undefined) {
    return { entity, hunger, messages: [] };
  }

  const maxFood = Math.max(0, entity.maxFood || DEFAULT_MAX_FOOD);
  const lastFoodAt = Math.max(0, hunger.lastFoodAtSeconds);
  const elapsed = Math.max(0, worldSeconds - lastFoodAt);
  const foodRatio = Math.max(0, 1 - elapsed / FOOD_DAY_SECONDS);
  const food = Math.max(0, Math.min(maxFood, maxFood * foodRatio));

  const eligibleChecks = Math.max(0, Math.floor(elapsed / FOOD_DAY_SECONDS) - STARVATION_GRACE_DAYS);
  let nextHunger = { ...hunger };
  let nextEntity = { ...entity, food };
  const messages: string[] = [];

  if (eligibleChecks > nextHunger.starvationChecks) {
    for (let checkIndex = nextHunger.starvationChecks; checkIndex < eligibleChecks; checkIndex++) {
      const dc = 10 + checkIndex;
      const roll = rollDie(20);
      const modifier = getConstitutionModifier(entity);
      const total = roll + modifier;

      if (total >= dc) {
        messages.push(`${entity.name} resistiu à fome: d20 ${roll} + CON ${modifier} = ${total} contra CD ${dc}.`);
      } else {
        const damage = rollDice(1, 6);
        const nonlethalDamage = (nextHunger.nonlethalDamage ?? 0) + damage;
        nextHunger.nonlethalDamage = nonlethalDamage;
        nextEntity = addFatiguedCondition(nextEntity);
        messages.push(`${entity.name} falhou no teste de fome: ${total} contra CD ${dc}. Sofreu ${damage} de dano não letal e ficou FATIGADO.`);
      }
    }

    nextHunger.starvationChecks = eligibleChecks;
  }

  return {
    entity: nextEntity,
    hunger: nextHunger,
    messages
  };
}

export function eatFood(
  entity: Combatant,
  hunger: HungerState,
  worldSeconds: number
): { entity: Combatant; hunger: HungerState; messages: string[] } {
  const maxFood = Math.max(0, entity.maxFood || DEFAULT_MAX_FOOD);
  return {
    entity: {
      ...entity,
      food: maxFood
    },
    hunger: {
      ...hunger,
      lastFoodAtSeconds: Math.max(0, worldSeconds),
      starvationChecks: 0
    },
    messages: [`${entity.name} fez uma refeição completa.`]
  };
}

export function getFoodStatus(
  entity: Combatant,
  hunger: HungerState,
  worldSeconds: number
): "SATIATED" | "HUNGRY" | "STARVING" {
  const elapsed = Math.max(0, worldSeconds - hunger.lastFoodAtSeconds);
  if (elapsed < FOOD_DAY_SECONDS) return "SATIATED";
  if (elapsed < FOOD_DAY_SECONDS * STARVATION_GRACE_DAYS) return "HUNGRY";
  return "STARVING";
}

function addFatiguedCondition(entity: Combatant): Combatant {
  const conditions = Array.isArray(entity.conditions) ? entity.conditions : [];
  if (conditions.some(condition => condition.type === "FATIGUED")) return entity;
  return {
    ...entity,
    conditions: [...conditions, { type: "FATIGUED", sourceId: "starvation" }]
  };
}
