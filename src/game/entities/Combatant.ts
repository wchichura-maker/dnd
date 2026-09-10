import type { Entity } from "./Entity";
import type { DndData } from "./DndData";
import type { AnimationState } from "./AnimationState";
import type { Condition } from "./Condition";

export type CombatantType =
  | "PLAYER"
  | "MONSTER"
  | "NPC"
  | "COMPANION"
  | "SUMMON";

export type Combatant = Entity & {
  type: CombatantType;

  dnd: DndData;

  hp: number;
  maxHp: number;

  movement: number;

  initiative: number;

  animationState: AnimationState;

  /*
   * Condições atualmente aplicadas.
   *
   * Estados como DISABLED, DYING, STABLE e DEAD
   * são derivados dos HP e não precisam ficar
   * armazenados aqui.
   */

  conditions?: Condition[];
};