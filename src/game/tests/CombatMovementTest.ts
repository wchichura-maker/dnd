import { createInitialGameState } from "../core/createInitialGameState";
import { getChargeMovement, getRunMovement, getWithdrawMovement, isStraightLinePath, validateCharge } from "../rules/CombatMovementRules";

export function runCombatMovementTests(): void {
  console.log("INICIANDO TESTES DE MOVIMENTO DE COMBATE");

  const state = createInitialGameState();
  const player = state.entities.find(entity => entity.id === "player-01");
  const orc = state.entities.find(entity => entity.id === "orc-01");
  if (!player || !orc) throw new Error("Combatentes iniciais não encontrados.");

  if (getChargeMovement(player.movement) !== player.movement * 2) throw new Error("Investida deve permitir até o dobro do deslocamento.");
  if (getWithdrawMovement(player.movement) !== player.movement * 2) throw new Error("Withdraw deve permitir até o dobro do deslocamento.");
  if (getRunMovement(player.movement) !== player.movement * 4) throw new Error("Run deve permitir até quatro vezes o deslocamento.");

  if (!isStraightLinePath([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }])) throw new Error("Linha reta horizontal deveria ser válida.");
  if (!isStraightLinePath([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])) throw new Error("Linha reta diagonal deveria ser válida.");
  if (isStraightLinePath([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }])) throw new Error("Trajetória com mudança de direção não deveria ser válida.");

  const validation = validateCharge(player, orc);
  if (!validation.valid) throw new Error("A regra base da investida deveria aceitar um alvo válido.");
  if (!validation.requiresStraightPath) throw new Error("Investida deve exigir trajetória reta.");
  if (!validation.isFullRoundAction) throw new Error("Investida deve ser ação de rodada completa.");

  console.log("✓ Investida usa até 2× o deslocamento");
  console.log("✓ Withdraw usa até 2× o deslocamento");
  console.log("✓ Run usa até 4× o deslocamento");
  console.log("✓ Investida exige trajetória reta");
  console.log("✓ TESTES DE MOVIMENTO DE COMBATE PASSARAM");
}
