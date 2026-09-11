import { playerCharacter } from "../Character";
import { advanceHunger, eatFood, FOOD_DAY_SECONDS, getFoodStatus, STARVATION_GRACE_DAYS } from "../survival/HungerSystem";
import type { HungerState } from "../core/GameState";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TESTE DE FOME FALHOU: ${message}`);
  }
}

export function runHungerSystemTests(): void {
  const initialHunger: HungerState = {
    lastFoodAtSeconds: 0,
    starvationChecks: 0,
    nonlethalDamage: 0
  };

  const afterHalfDay = advanceHunger(playerCharacter, initialHunger, FOOD_DAY_SECONDS / 2);
  assert(afterHalfDay.entity.food === 50, "Após 12 horas, a barra de fome deveria estar em 50%.");
  assert(getFoodStatus(afterHalfDay.entity, afterHalfDay.hunger, FOOD_DAY_SECONDS / 2) === "SATIATED", "Antes de 24 horas o personagem ainda não deveria estar em estado de fome.");

  const afterThreeDays = advanceHunger(playerCharacter, initialHunger, FOOD_DAY_SECONDS * STARVATION_GRACE_DAYS);
  assert(afterThreeDays.entity.food === 0, "Após 3 dias sem comer, a barra deveria estar vazia.");
  assert(afterThreeDays.hunger.starvationChecks === 0, "O primeiro teste de fome só deve ocorrer após os 3 dias de tolerância.");
  assert(getFoodStatus(afterThreeDays.entity, afterThreeDays.hunger, FOOD_DAY_SECONDS * STARVATION_GRACE_DAYS) === "STARVING", "Após 3 dias sem comer o personagem deve estar em estado STARVING.");

  const afterFourDays = advanceHunger(playerCharacter, afterThreeDays.hunger, FOOD_DAY_SECONDS * (STARVATION_GRACE_DAYS + 1));
  assert(afterFourDays.hunger.starvationChecks === 1, "O quarto dia deveria resolver exatamente um teste de fome.");
  if ((afterFourDays.hunger.nonlethalDamage ?? 0) > 0) {
    assert(afterFourDays.entity.conditions?.some(condition => condition.type === "FATIGUED") === true, "Dano não letal de fome deveria aplicar FATIGUED.");
  }

  const fed = eatFood(afterFourDays.entity, afterFourDays.hunger, FOOD_DAY_SECONDS * (STARVATION_GRACE_DAYS + 1));
  assert(fed.entity.food === fed.entity.maxFood, "Uma refeição completa deveria restaurar a barra de fome.");
  assert(fed.hunger.starvationChecks === 0, "Uma nova refeição deveria reiniciar o ciclo de testes de fome.");
  assert(fed.hunger.lastFoodAtSeconds === FOOD_DAY_SECONDS * (STARVATION_GRACE_DAYS + 1), "A refeição deveria registrar o instante do relógio do mundo.");

  console.log("✓ Fome baseada no relógio do mundo");
  console.log("✓ Tolerância de 3 dias antes dos testes de fome");
  console.log("✓ Testes diários de Constituição após a tolerância");
  console.log("✓ Alimentação reinicia o ciclo de fome");
}
