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

  /** Survival resource displayed by the HUD when present. */
  food?: number;
  maxFood?: number;

  movement: number;

  initiative: number;

  animationState: AnimationState;

  /**
   * Algumas criaturas/efeitos são imunes a acertos críticos.
   * Elas também são imunes ao efeito de morte do coup de grace.
   */
  immuneToCriticalHits?: boolean;

  /*
   * Condições atualmente aplicadas.
   *
   * Estados como DISABLED, DYING, STABLE e DEAD
   * são derivados dos HP e não precisam ficar
   * armazenados aqui.
   */

  conditions?: Condition[];
};
