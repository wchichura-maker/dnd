import type { QuestObjective } from "./QuestObjective";

export type QuestCategory = "MAIN" | "SIDE" | "OPTIONAL";
export type QuestStatus = "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";

export type Quest = {
  id: string;
  title: string;
  category: QuestCategory;
  objectives: QuestObjective[];
  status: QuestStatus;
  tracked: boolean;
  priority: number;
};
