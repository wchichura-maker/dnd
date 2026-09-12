export type QuestObjectiveType =
  | "KILL"
  | "COLLECT"
  | "INTERACT"
  | "TALK"
  | "EXPLORE"
  | "REACH_LOCATION"
  | "ESCORT"
  | "SURVIVE"
  | "USE_ITEM"
  | "DELIVER"
  | "CUSTOM";

export type QuestObjective = {
  id: string;
  type: QuestObjectiveType;
  description: string;
  current: number;
  required: number;
  completed: boolean;
  visible: boolean;
  targetEntityId?: string;
  targetItemId?: string;
  targetPosition?: { x: number; y: number };
  customKey?: string;
};

export function cloneObjective(objective: QuestObjective): QuestObjective {
  return {
    ...objective,
    targetPosition: objective.targetPosition ? { ...objective.targetPosition } : undefined
  };
}
