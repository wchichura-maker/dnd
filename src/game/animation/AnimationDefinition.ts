import type { AnimationState } from "../entities/AnimationState";

export type AnimationSourceType =
  | "SPRITE_SHEET"
  | "IMAGE_SEQUENCE"
  | "GIF"
  | "VIDEO"
  | "PROCEDURAL";

export type AnimationSource = {
  type: AnimationSourceType;
  src: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  fps?: number;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
};

export type AnimationDefinition = {
  id: string;
  state: AnimationState;
  duration: number;
  source?: AnimationSource;
};

export const defaultAnimationDefinitions: Record<AnimationState, AnimationDefinition> = {
  IDLE: {
    id: "idle",
    state: "IDLE",
    duration: 0
  },
  WALK: {
    id: "walk",
    state: "WALK",
    duration: 120
  },
  ATTACK: {
    id: "attack",
    state: "ATTACK",
    duration: 400
  },
  HIT: {
    id: "hit",
    state: "HIT",
    duration: 250
  },
  DEATH: {
    id: "death",
    state: "DEATH",
    duration: 700
  }
};
