import type { Armor } from "./Armor";
import type { Shield } from "./Shield";
import type { Weapon } from "./Weapon";

export type EquipmentData = {
  weapon?: Weapon;

  armor?: Armor;

  shield?: Shield;
};