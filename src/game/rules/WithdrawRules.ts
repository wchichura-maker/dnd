import type { Combatant } from "../entities/Combatant";
import type { Position } from "../world/Position";

/**
 * D&D 3.5 Withdraw helper.
 *
 * The first square exited during a withdraw does not provoke an attack of
 * opportunity from an opponent whose threatened area contains that square.
 * Leaving any subsequently threatened square uses the normal AoO rule.
 *
 * This helper only decides whether a particular transition is the protected
 * first exit. Terrain, pathfinding and the actual AoO attack remain in Core.
 */
export function isProtectedWithdrawExit(
  path: Position[],
  from: Position,
  index: number
): boolean {
  if (index !== 0 || path.length < 2) return false;

  const first = path[0];
  return first.x === from.x && first.y === from.y;
}

/**
 * Returns the path transitions that may provoke an AoO during Withdraw.
 * Transition 0 (leaving the starting square) is excluded; every later
 * transition is eligible for the normal threatened-square test.
 */
export function getWithdrawAoOTransitions(path: Position[]): Array<{
  from: Position;
  to: Position;
  index: number;
}> {
  if (path.length < 2) return [];

  const transitions: Array<{ from: Position; to: Position; index: number }> = [];
  for (let index = 0; index < path.length - 1; index++) {
    if (index === 0) continue;
    transitions.push({ from: path[index], to: path[index + 1], index });
  }
  return transitions;
}

/**
 * Convenience predicate used by the Core AoO resolver.
 */
export function withdrawLeavesThreatenedSquare(
  defender: Combatant,
  from: Position,
  to: Position,
  range: number,
  transitionIndex: number
): boolean {
  if (transitionIndex === 0) return false;

  const before = gridDistance(defender.position, from);
  const after = gridDistance(defender.position, to);
  return before <= range && after > range;
}

function gridDistance(
  a: Position,
  b: Position
): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
