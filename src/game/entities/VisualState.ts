import type { AnimationState } from "./AnimationState";

export type VisualStatusEffect = {
  id: string;
  label: string;
  icon?: string;
  priority?: number;
};

export type EntityVisualState = {
  animation: AnimationState;
  direction: "NORTH" | "SOUTH" | "EAST" | "WEST";
  spriteId: string;
  persistent: boolean;
  statusEffects: VisualStatusEffect[];
};

export type EntityVisualStates = Record<string, EntityVisualState>;

export function createDefaultVisualState(
  spriteId: string
): EntityVisualState {
  return {
    animation: "IDLE",
    direction: "SOUTH",
    spriteId,
    persistent: false,
    statusEffects: []
  };
}
