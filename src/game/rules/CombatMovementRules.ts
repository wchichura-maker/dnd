import type { Combatant } from "../entities/Combatant";
import { findPath } from "./Pathfinding";

export type CombatMovementAction = "CHARGE" | "WITHDRAW" | "RUN";

export type CombatMovementValidation = {
  valid: boolean;
  message: string;
  maxMovement: number;
  requiresStraightPath: boolean;
  provokesAoO: boolean;
};

/**
 * D&D 3.5 movement multiplier used by charge and withdraw.
 * Movement is expressed in the same grid-distance units used by the Core.
 */
export function getChargeMovement(speed: number): number {
  return speed * 2;
}

export function getWithdrawMovement(speed: number): number {
  return speed * 2;
}

export function getRunMovement(speed: number): number {
  return speed * 4;
}

/**
 * A charge is a full-round action. The creature moves up to twice its speed
 * in a straight line and must end adjacent to the target. The starting square
 * can be left without provoking an AoO only when the movement is represented
 * by the charge rule itself; the charge still has the normal D&D restrictions.
 */
export function validateCharge(
  actor: Combatant,
  target: Combatant,
  map: Parameters<typeof findPath>[0],
  entities: Combatant[]
): CombatMovementValidation {
  const speed = actor.movement;
  const maxMovement = getChargeMovement(speed);

  if (target.id === actor.id) {
    return invalid("O alvo da investida deve ser outra criatura.", maxMovement);
  }

  const dx = Math.abs(target.position.x - actor.position.x);
  const dy = Math.abs(target.position.y - actor.position.y);
  if (Math.max(dx, dy) < 2) {
    return invalid("A investida exige espaço para avançar pelo menos 3 metros.", maxMovement);
  }

  return {
    valid: true,
    message: "Investida válida.",
    maxMovement,
    requiresStraightPath: true,
    provokesAoO: false
  };
}

/**
 * Withdraw is a full-round action. The first square exited is not subject to
 * an AoO from an opponent that threatens that square; movement after that
 * square follows the normal threat rules.
 */
export function validateWithdraw(actor: Combatant): CombatMovementValidation {
  return {
    valid: true,
    message: "Retirada válida.",
    maxMovement: getWithdrawMovement(actor.movement),
    requiresStraightPath: false,
    provokesAoO: false
  };
}

/**
 * Run is a full-round action and allows movement up to four times speed in a
 * straight line. It does not represent a normal MOVE and therefore does not
 * consume a move action plus remaining movement.
 */
export function validateRun(actor: Combatant): CombatMovementValidation {
  return {
    valid: true,
    message: "Corrida válida.",
    maxMovement: getRunMovement(actor.movement),
    requiresStraightPath: true,
    provokesAoO: true
  };
}

function invalid(message: string, maxMovement: number): CombatMovementValidation {
  return {
    valid: false,
    message,
    maxMovement,
    requiresStraightPath: true,
    provokesAoO: false
  };
}
