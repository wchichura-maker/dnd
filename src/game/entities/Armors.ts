import type { Armor } from "./Armor";

export const leatherArmor: Armor = {
  id: "leather-armor",

  name: "Armadura de Couro",

  armorBonus: 2,

  maxDexterityBonus: 6,

  armorCheckPenalty: 0,

  arcaneSpellFailure: 10
};

export const chainShirt: Armor = {
  id: "chain-shirt",

  name: "Camisa de Malha",

  armorBonus: 4,

  maxDexterityBonus: 4,

  armorCheckPenalty: -2,

  arcaneSpellFailure: 20
};

export const fullPlate: Armor = {
  id: "full-plate",

  name: "Armadura Completa",

  armorBonus: 8,

  maxDexterityBonus: 1,

  armorCheckPenalty: -6,

  arcaneSpellFailure: 35
};