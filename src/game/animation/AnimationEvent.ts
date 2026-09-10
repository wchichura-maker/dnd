export type AnimationEventType =
  | "ATTACK_START"
  | "ATTACK_HIT"
  | "ATTACK_MISS"
  | "CRITICAL_HIT"
  | "TAKE_DAMAGE"
  | "DEATH_START"
  | "DEATH_COMPLETE"
  | "CAST_START"
  | "CAST_COMPLETE";

export type AnimationEvent = {
  id: string;
  type: AnimationEventType;
  entityId: string;
  targetId?: string;
  animationId?: string;
  spellId?: string;
  timestamp: number;
};

export function createAnimationEvent(
  type: AnimationEventType,
  entityId: string,
  data: Omit<AnimationEvent, "id" | "type" | "entityId" | "timestamp"> = {}
): AnimationEvent {
  return {
    id: `${type}-${entityId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    entityId,
    timestamp: Date.now(),
    ...data
  };
}
