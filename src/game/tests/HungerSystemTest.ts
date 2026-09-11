import { playerCharacter } from "../Character";
import { consumeFoodForMovement, getMovementFoodCost } from "../survival/HungerSystem";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TESTE DE FOME FALHOU: ${message}`);
  }
}

export function runHungerSystemTests(): void {
  const fullFood = { ...playerCharacter, food: 100, maxFood: 100 };
  const afterMovement = consumeFoodForMovement(fullFood, 5);

  assert(afterMovement.food === 95, "5 quadrados deveriam consumir 5 pontos de fome.");
  assert(afterMovement.maxFood === 100, "O máximo de fome não deveria ser alterado.");
  assert(getMovementFoodCost(5) === 5, "O custo de fome deveria ser proporcional ao deslocamento.");

  const exhausted = { ...playerCharacter, food: 2, maxFood: 100 };
  const afterExhaustion = consumeFoodForMovement(exhausted, 5);
  assert(afterExhaustion.food === 0, "A fome não pode ficar abaixo de zero.");

  const unchanged = { ...playerCharacter, food: 50, maxFood: 100 };
  const afterZeroMovement = consumeFoodForMovement(unchanged, 0);
  assert(afterZeroMovement.food === 50, "Movimento zero não deveria consumir fome.");

  console.log("✓ Sistema de fome por deslocamento");
}
