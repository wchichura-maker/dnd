import type { AbilityScores } from "./AbilityScores";
import type { ClassData } from "./ClassData";
import type { DefenseData } from "./DefenseData";
import type { EquipmentData } from "./EquipmentData";
import type { InventoryData } from "./InventoryData";

export type DndData = {
  abilities: AbilityScores;

  classData: ClassData;

  defense: DefenseData;

  equipment: EquipmentData;

  inventory: InventoryData;
};