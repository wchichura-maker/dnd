import assert from "node:assert/strict";
import type { GameAction } from "../actions/Action";
import { createInitialGameState } from "../core/createInitialGameState";
import { recordCollection, updateQuestStateFromAction } from "../quests/QuestSystem";

export function runQuestSystemTests(): void {
  const initial = createInitialGameState();
  const killAction: GameAction = { type: "ATTACK", actorId: "player-01", targetId: "orc-01" };
  const afterKill = {
    ...initial,
    entities: initial.entities.map(entity => entity.id === "orc-01" ? { ...entity, hp: 0 } : entity)
  };
  const killed = updateQuestStateFromAction(initial.quests, initial, afterKill, killAction, { success: true, message: "Alvo derrotado." });
  const killObjective = killed.quests[0].objectives.find(objective => objective.id === "kill-goblins");
  assert.equal(killObjective?.current, 1);
  assert.equal(killObjective?.completed, false);

  const talkAction: GameAction = { type: "TALK", actorId: "player-01", targetId: "road-guard" };
  const talked = updateQuestStateFromAction(killed, initial, initial, talkAction, { success: true, message: "Conversa iniciada." });
  const talkObjective = talked.quests[0].objectives.find(objective => objective.id === "talk-guard");
  assert.equal(talkObjective?.current, 1);
  assert.equal(talkObjective?.completed, true);

  const moveAction: GameAction = { type: "MOVE", actorId: "player-01", destination: { x: 12, y: 10 } };
  const afterMove = {
    ...initial,
    entities: initial.entities.map(entity => entity.id === "player-01" ? { ...entity, position: { x: 12, y: 10 } } : entity)
  };
  const explored = updateQuestStateFromAction(initial.quests, initial, afterMove, moveAction, { success: true, message: "Movimento concluído." });
  assert.equal(explored.quests[0].objectives.find(objective => objective.id === "reach-old-ruins")?.current, 1);
  assert.equal(explored.quests[0].objectives.find(objective => objective.id === "explore-northern-forest")?.current, 1);

  const collected = recordCollection(initial.quests, "wolf-pelt", 4);
  assert.equal(collected.quests[0].objectives.find(objective => objective.id === "collect-wolf-pelts")?.current, 4);

  console.log("QuestSystem tests: OK");
}
