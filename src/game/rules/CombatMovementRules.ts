import type { Combatant } from "../entities/Combatant";
import type { Position } from "../world/Position";

export type CombatMovementAction = "CHARGE" | "WITHDRAW" | "RUN";

export type CombatMovementValidation = {
  valid: boolean;
  message: string;
  maxMovement: number;
  requiresStraightPath: boolean;
  isFullRoundAction: boolean;
};

export function getChargeMovement(speed: number): number {
  return speed * 2;
}

export function getWithdrawMovement(speed: number): number {
  return speed * 2;
}

export function getRunMovement(speed: number): number {
  return speed * 4;
}

export function validateCharge(actor: Combatant, target: Combatant): CombatMovementValidation {
  const maxMovement = getChargeMovement(actor.movement);
  const dx = Math.abs(target.position.x - actor.position.x);
  const dy = Math.abs(target.position.y - actor.position.y);
  if (target.id === actor.id) return invalid("O alvo da investida deve ser outra criatura.", maxMovement);
  if (Math.max(dx, dy) < 2) return invalid("A investida exige pelo menos 10 pés de deslocamento.", maxMovement);
  if (maxMovement < 2) return invalid("A criatura não possui deslocamento suficiente para realizar uma investida.", maxMovement);
  return { valid: true, message: "Investida válida.", maxMovement, requiresStraightPath: true, isFullRoundAction: true };
}

export function validateWithdraw(actor: Combatant): CombatMovementValidation {
  return {
    valid: actor.movement > 0,
    message: actor.movement > 0 ? "Retirada válida." : "A criatura não possui deslocamento.",
    maxMovement: getWithdrawMovement(actor.movement),
    requiresStraightPath: false,
    isFullRoundAction: true
  };
}

export function validateRun(actor: Combatant): CombatMovementValidation {
  return {
    valid: actor.movement > 0,
    message: actor.movement > 0 ? "Corrida válida." : "A criatura não possui deslocamento.",
    maxMovement: getRunMovement(actor.movement),
    requiresStraightPath: true,
    isFullRoundAction: true
  };
}

/**
 * Verifica se uma trajetória é uma linha reta contínua no grid.
 */
export function isStraightLinePath(path: Position[]): boolean {
  if (path.length <= 1) return true;
  const first = path[0];
  const second = path[1];
  const stepX = Math.sign(second.x - first.x);
  const stepY = Math.sign(second.y - first.y);
  if (stepX === 0 && stepY === 0) return false;
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1];
    const current = path[index];
    if (current.x - previous.x !== stepX || current.y - previous.y !== stepY) return false;
  }
  return true;
}

/**
 * No Withdraw, o primeiro quadrado de onde a criatura sai não provoca AoO.
 * Retorna os índices das transições que devem ser avaliadas pelo sistema.
 */
export function getWithdrawOpportunitySteps(path: Position[]): number[] {
  if (path.length <= 1) return [];
  return path.slice(1).map((_, index) => index + 1).filter(stepIndex => stepIndex > 1);
}

function invalid(message: string, maxMovement: number): CombatMovementValidation {
  return { valid: false, message, maxMovement, requiresStraightPath: true, isFullRoundAction: true };
}
