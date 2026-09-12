import type { GameMap } from "../types/Map";
import type { Combatant } from "../entities/Combatant";
import type { CombatState } from "../types/CombatState";
import type { EncounterState } from "../types/EncounterState";
import type { Turn } from "../types/Turn";

import type { Relationship } from "../relationships/Relationship";
import type { RelationshipEvent } from "../relationships/RelationshipEvent";

import type { GameMode } from "./GameMode";
import type { WorldClockState } from "../time/WorldClock";
import type { QuestState } from "../quests/QuestState";

export type HungerState = {
  lastFoodAtSeconds: number;
  starvationChecks: number;
  nonlethalDamage: number;
};

export type GameState = {
  map: GameMap;
  entities: Combatant[];
  relationships: Relationship[];
  relationshipEvents: RelationshipEvent[];
  mode: GameMode;
  encounter?: EncounterState;
  combat: CombatState;
  turn: Turn;
  worldClock: WorldClockState;
  hunger: Record<string, HungerState>;
  quests: QuestState;
  logs: string[];
};
