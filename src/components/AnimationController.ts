import type { AnimationState } from "../game/entities/AnimationState";

export type AnimationTiming = {
  WALK: number;
  ATTACK: number;
  HIT: number;
  DEATH: number;
};

export const animationTiming: AnimationTiming = {
  WALK: 120,
  ATTACK: 400,
  HIT: 250,
  DEATH: 700
};

export function getAnimationDuration(
  state: AnimationState
): number {
  switch (state) {
    case "WALK":
      return animationTiming.WALK;

    case "ATTACK":
      return animationTiming.ATTACK;

    case "HIT":
      return animationTiming.HIT;

    case "DEATH":
      return animationTiming.DEATH;

    case "IDLE":
    default:
      return 0;
  }
}