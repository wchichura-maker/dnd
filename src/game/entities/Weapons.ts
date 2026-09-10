import type { Weapon } from "./Weapon";

export const longsword: Weapon = {
  id: "longsword",
  name: "Espada Longa",

  damageDice: {
    count: 1,
    sides: 8
  },

  criticalRange: 19,
  criticalMultiplier: 2,

  melee: true,
  range: 1
};