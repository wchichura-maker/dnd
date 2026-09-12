import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import type { GameState } from "../core/GameState";
import type { Quest } from "./Quest";
import type { QuestObjective } from "./QuestObjective";
import type { QuestState } from "./QuestState";
import { cloneObjective } from "./QuestObjective";

const PLAYER_ID = "player-01";

export function createDevelopmentQuestState(): QuestState {
  const quest: Quest = {
    id: "quest-clear-forest-road",
    title: "Limpar a Estrada da Floresta",
    category: "MAIN",
    status: "ACTIVE",
    tracked: true,
    priority: 100,
    objectives: [
      {
        id: "kill-goblins",
        type: "KILL",
        description: "Derrote os inimigos da estrada",
        current: 0,
        required: 8,
        completed: false,
        visible: true
      },
      {
        id: "collect-wolf-pelts",
        type: "COLLECT",
        description: "Colete peles de lobo",
        current: 0,
        required: 10,
        completed: false,
        visible: true,
        targetItemId: "wolf-pelt"
      },
      {
        id: "talk-guard",
        type: "TALK",
        description: "Fale com o guarda da estrada",
        current: 0,
        required: 1,
        completed: false,
        visible: true,
        targetEntityId: "road-guard"
      },
      {
        id: "reach-old-ruins",
        type: "REACH_LOCATION",
        description: "Alcance as ruínas antigas",
        current: 0,
        required: 1,
        completed: false,
        visible: true,
        targetPosition: { x: 12, y: 10 }
      },
      {
        id: "explore-northern-forest",
        type: "EXPLORE",
        description: "Explore a floresta ao norte",
        current: 0,
        required: 1,
        completed: false,
        visible: true,
        targetPosition: { x: 12, y: 10 }
      }
    ]
  };

  return {
    quests: [quest],
    trackedQuestId: quest.id
  };
}

export function updateQuestStateFromAction(
  current: QuestState,
  before: GameState,
  after: GameState,
  action: GameAction,
  result: ActionResult
): QuestState {
  if (!result.success) return current;

  let changed = false;
  const quests = current.quests.map(quest => {
    if (quest.status !== "ACTIVE") return quest;

    let questChanged = false;
    const objectives = quest.objectives.map(objective => {
      if (objective.completed || !objective.visible) return objective;
      if (!objectiveMatchesAction(objective, before, after, action)) return objective;

      const next = cloneObjective(objective);
      next.current = Math.min(next.required, next.current + 1);
      next.completed = next.current >= next.required;
      questChanged = true;
      changed = true;
      return next;
    });

    if (!questChanged) return quest;

    const nextQuest: Quest = { ...quest, objectives };
    if (nextQuest.objectives.filter(item => item.visible).every(item => item.completed)) {
      nextQuest.status = "COMPLETED";
    }
    return nextQuest;
  });

  if (!changed) return current;

  const trackedQuestId = quests.some(quest => quest.id === current.trackedQuestId && quest.status === "ACTIVE")
    ? current.trackedQuestId
    : findTrackedQuestId(quests);

  return { quests, trackedQuestId };
}

export function recordCollection(
  current: QuestState,
  itemId: string,
  amount: number
): QuestState {
  if (amount <= 0) return current;
  let changed = false;

  const quests = current.quests.map(quest => {
    if (quest.status !== "ACTIVE") return quest;
    let questChanged = false;
    const objectives = quest.objectives.map(objective => {
      if (objective.type !== "COLLECT" || objective.completed || objective.targetItemId !== itemId) return objective;
      const next = cloneObjective(objective);
      next.current = Math.min(next.required, next.current + amount);
      next.completed = next.current >= next.required;
      questChanged = true;
      changed = true;
      return next;
    });
    if (!questChanged) return quest;
    const nextQuest: Quest = { ...quest, objectives };
    if (nextQuest.objectives.filter(item => item.visible).every(item => item.completed)) nextQuest.status = "COMPLETED";
    return nextQuest;
  });

  return changed ? { ...current, quests } : current;
}

function objectiveMatchesAction(
  objective: QuestObjective,
  before: GameState,
  after: GameState,
  action: GameAction
): boolean {
  if (action.actorId !== PLAYER_ID) return false;

  if (objective.type === "KILL") {
    if (!action.targetId) return false;
    const targetBefore = before.entities.find(entity => entity.id === action.targetId);
    const targetAfter = after.entities.find(entity => entity.id === action.targetId);
    if (!targetBefore || !targetAfter) return false;
    if (objective.targetEntityId && objective.targetEntityId !== action.targetId) return false;
    return targetBefore.hp > 0 && targetAfter.hp <= 0;
  }

  if (objective.type === "TALK") {
    if (action.type !== "TALK") return false;
    return !objective.targetEntityId || objective.targetEntityId === action.targetId;
  }

  if (objective.type === "REACH_LOCATION" || objective.type === "EXPLORE") {
    if (action.type !== "MOVE" && action.type !== "FIVE_FOOT_STEP") return false;
    if (!objective.targetPosition || !action.destination) return false;
    const position = after.entities.find(entity => entity.id === PLAYER_ID)?.position;
    return position?.x === objective.targetPosition.x && position?.y === objective.targetPosition.y;
  }

  return false;
}

function findTrackedQuestId(quests: Quest[]): string | null {
  return quests
    .filter(quest => quest.status === "ACTIVE")
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0]?.id ?? null;
}
