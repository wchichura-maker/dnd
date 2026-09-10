import type { Shield } from "./Shield";

export const lightShield: Shield = {
  id: "light-shield",

  name: "Escudo Leve",

  shieldBonus: 1,

  armorCheckPenalty: -1,

  arcaneSpellFailure: 5
};

export const heavyShield: Shield = {
  id: "heavy-shield",

  name: "Escudo Pesado",

  shieldBonus: 2,

  armorCheckPenalty: -2,

  arcaneSpellFailure: 15
};