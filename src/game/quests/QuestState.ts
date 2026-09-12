import type { Quest } from "./Quest";

export type QuestState = {
  quests: Quest[];
  trackedQuestId: string | null;
};
