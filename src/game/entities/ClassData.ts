export type CharacterClass =
  | "FIGHTER"
  | "ROGUE"
  | "WIZARD"
  | "CLERIC"
  | "RANGER"
  | "PALADIN"
  | "BARBARIAN"
  | "BARD"
  | "MONK"
  | "SORCERER"
  | "DRUID";

export type ClassData = {
  name: CharacterClass;
  level: number;
  experience: number;
  baseAttackBonus: number;
};