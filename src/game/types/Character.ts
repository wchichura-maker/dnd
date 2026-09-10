import type { Position } from "../world/Position";

export type Character = {
  id: string;
  name: string;
  position: Position;

  hp: number;
  maxHp: number;

  armorClass: number;

  movement: number;
};