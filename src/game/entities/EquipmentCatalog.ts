import type { Weapon } from "./Weapon";
import type { Armor } from "./Armor";
import type { Shield } from "./Shield";

import {
  longsword
} from "./Weapons";

import {
  leatherArmor,
  chainShirt,
  fullPlate
} from "./Armors";

import {
  lightShield,
  heavyShield
} from "./Shields";

export const weapons: Weapon[] = [
  longsword
];

export const armors: Armor[] = [
  leatherArmor,
  chainShirt,
  fullPlate
];

export const shields: Shield[] = [
  lightShield,
  heavyShield
];

export function getWeapon(
  templateId: string
): Weapon | undefined {
  return weapons.find(
    weapon =>
      weapon.id === templateId
  );
}

export function getArmor(
  templateId: string
): Armor | undefined {
  return armors.find(
    armor =>
      armor.id === templateId
  );
}

export function getShield(
  templateId: string
): Shield | undefined {
  return shields.find(
    shield =>
      shield.id === templateId
  );
}