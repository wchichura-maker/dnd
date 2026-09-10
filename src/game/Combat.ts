import type { Combatant } from "./entities/Combatant";

import {
  longsword
} from "./entities/Weapons";

import {
  leatherArmor
} from "./entities/Armors";

export const orc: Combatant = {
  id: "orc-01",

  name: "Orc",

  type: "MONSTER",

  controller: "AI",

  position: {
    x: 10,
    y: 5
  },

  dnd: {
    abilities: {
      strength: 18,
      dexterity: 12,
      constitution: 16,
      intelligence: 8,
      wisdom: 11,
      charisma: 8
    },

    classData: {
      name: "BARBARIAN",

      level: 1,

      experience: 0,

      baseAttackBonus: 1
    },

    defense: {
      naturalArmorBonus: 0,

      deflectionBonus: 0,

      dodgeBonus: 0,

      miscBonus: 0,

      sizeModifier: 0
    },

    equipment: {
      weapon: longsword,

      armor: leatherArmor
    },

    inventory: {
      items: [
        {
          id: "orc-longsword-01",

          templateId: "longsword",

          name: "Espada Longa",

          type: "WEAPON",

          quantity: 1
        },

        {
          id: "orc-leather-armor-01",

          templateId: "leather-armor",

          name: "Armadura de Couro",

          type: "ARMOR",

          quantity: 1
        }
      ]
    }
  },

  hp: 20,

  maxHp: 20,

  movement: 6,

  initiative: 0,

  animationState: "IDLE",
};