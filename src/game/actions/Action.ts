import type { EquipmentSlot } from "../inventory/EquipmentSlot";

export type ActionType =
  | "MOVE"
  | "FIVE_FOOT_STEP"
  | "ATTACK"
  | "COUP_DE_GRACE"
  | "EQUIP"
  | "UNEQUIP"
  | "WAIT";

export type GameAction = {
  type: ActionType;

  actorId: string;

  targetId?: string;

  itemId?: string;

  equipmentSlot?: EquipmentSlot;

  destination?: {
    x: number;
    y: number;
  };
};