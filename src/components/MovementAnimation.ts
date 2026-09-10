import type { Position } from "../game/world/Position";

export type MovementAnimationState = {
  position: Position;
  pathIndex: number;
  moving: boolean;
};

export function createMovementAnimationState(
  position: Position
): MovementAnimationState {
  return {
    position: {
      x: position.x,
      y: position.y
    },
    pathIndex: -1,
    moving: false
  };
}