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

/**
 * D&D 3.5: charge allows movement up to twice the creature's speed.
 */
export function getChargeMovement(speed: number): number {
  return speed * 2;
}

/**
 * D&D 3.5: withdraw allows movement up to twice the creature's speed.
 */
export function getWithdrawMovement(speed: number): number {
  return speed * 2;
}

/**
 * D&D 3.5: run allows movement up to four times the creature's speed.
 */
export function getRunMovement(speed: number): number {
  return speed * 4;
}

/**
 * A charge must move at least 10 feet (two 5-foot grid squares) and follow
 * a straight line. The final attack and all charge modifiers are resolved by
 * the combat engine, not by this pure validation helper.
 */
export function validateCharge(
  actor: Combatant,
  target: Combatant
): CombatMovementValidation {
  const maxMovement = getChargeMovement(actor.movement);
  const dx = Math.abs(target.position.x - actor.position.x);
  const dy = Math.abs(target.position.y - actor.position.y);

  if (target.id === actor.id) {
    return invalid("O alvo da investida deve ser outra criatura.", maxMovement);
  }

  if (Math.max(dx, dy) < 2) {
    return invalid("A investida exige pelo menos 10 pés de deslocamento.", maxMovement);
  }

  if (maxMovement < 2) {
    return invalid("A criatura não possui deslocamento suficiente para realizar uma investida.", maxMovement);
  }

  return {
    valid: true,
    message: "Investida válida.",
    maxMovement,
    requiresStraightPath: true,
    isFullRoundAction: true
  };
}

/**
 * Withdraw is a full-round action. The first square exited is treated specially
 * by the AoO system: opponents do not get an AoO for leaving that square.
 * Subsequent threatened squares use the normal AoO rules.
 */
export function validateWithdraw(actor: Combatant): CombatMovementValidation {
  return {
    valid: actor.movement > 0,
    message: actor.movement > 0 ? "Retirada válida." : "A criatura não possui deslocamento.",
    maxMovement: getWithdrawMovement(actor.movement),
    requiresStraightPath: false,
    isFullRoundAction: true
  };
}

/**
 * Run is a full-round action and uses four times the creature's speed.
 * Movement still interacts with threatened squares through the normal AoO
 * system. The Core will enforce the straight-line restriction when the path
 * is resolved.
 */
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
 * A straight-line grid path is valid when every step changes either one
 * coordinate or both by exactly one. This helper deliberately does not check
 * terrain/occupancy; those remain authoritative in Pathfinding.
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
    if (
      current.x - previous.x !== stepX ||
      current.y - previous.y !== stepY
    ) {
      return false;
    }
  }

  return true;
}

function invalid(message: string, maxMovement: number): CombatMovementValidation {
  return {
    valid: false,
    message,
    maxMovement,
    requiresStraightPath: true,
    isFullRoundAction: true
  };
}
