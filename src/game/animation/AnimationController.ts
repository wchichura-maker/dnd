import type { AnimationState } from "../entities/AnimationState";
import type { AnimationDefinition } from "./AnimationDefinition";
import { defaultAnimationDefinitions } from "./AnimationDefinition";

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
  return defaultAnimationDefinitions[state]?.duration ?? 0;
}

export function getAnimationDefinition(
  state: AnimationState
): AnimationDefinition {
  return defaultAnimationDefinitions[state];
}

export function isPersistentAnimation(
  state: AnimationState
): boolean {
  return state === "DEATH";
}
