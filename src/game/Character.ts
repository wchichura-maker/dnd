import type { Combatant } from "./entities/Combatant";

import {
  longsword
} from "./entities/Weapons";

import {
  chainShirt
} from "./entities/Armors";

import {
  heavyShield
} from "./entities/Shields";

export const playerCharacter: Combatant = {
  id: "player-01",

  name: "Kael",

  type: "PLAYER",

  controller: "PLAYER",

  position: {
    x: 3,
    y: 3
  },

  dnd: {
    abilities: {
      strength: 16,
      dexterity: 14,
      constitution: 14,
      intelligence: 12,
      wisdom: 10,
      charisma: 12
    },

    classData: {
      name: "FIGHTER",

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

      armor: chainShirt,

      shield: heavyShield
    },

    inventory: {
      items: [
        {
          id: "item-longsword-01",

          templateId: "longsword",

          name: "Espada Longa",

          type: "WEAPON",

          quantity: 1
        },

        {
          id: "item-chain-shirt-01",

          templateId: "chain-shirt",

          name: "Camisa de Malha",

          type: "ARMOR",

          quantity: 1
        },

        {
          id: "item-heavy-shield-01",

          templateId: "heavy-shield",

          name: "Escudo Pesado",

          type: "SHIELD",

          quantity: 1
        },

        {
          id: "item-healing-potion-01",

          templateId: "healing-potion",

          name: "Poção de Cura",

          type: "POTION",

          quantity: 2
        }
      ]
    }
  },

  hp: 30,

  maxHp: 30,

  movement: 6,

  initiative: 0,

  animationState: "IDLE"
};