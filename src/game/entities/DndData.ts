import type { AbilityScores } from "./AbilityScores";
import type { ClassData } from "./ClassData";
import type { DefenseData } from "./DefenseData";
import type { EquipmentData } from "./EquipmentData";
import type { InventoryData } from "./InventoryData";

export type SkillName =
  | "BLUFF"
  | "DIPLOMACY"
  | "INTIMIDATE"
  | "SENSE_MOTIVE";

export type SkillRanks = Partial<Record<SkillName, number>>;

export type DndData = {
  abilities: AbilityScores;

  classData: ClassData;

  defense: DefenseData;

  equipment: EquipmentData;

  inventory: InventoryData;

  /**
   * Skill ranks are optional while character creation is still being built.
   * Missing ranks are treated as 0 by the rules engine.
   */
  skills?: SkillRanks;

  /**
   * Additional modifier applied to saves against fear.
   * D&D 3.5 Intimidate uses this modifier in the target's level check.
   */
  fearSaveModifier?: number;
};