import type { Point } from "../types/Map";
import type { EquipmentSlot } from "../inventory/EquipmentSlot";

export type ActionType =
  | "MOVE"
  | "FIVE_FOOT_STEP"
  | "ATTACK"
  | "COUP_DE_GRACE"
  | "CHARGE"
  | "WITHDRAW"
  | "RUN"
  | "FLEE"
  | "SURRENDER"
  | "TALK"
  | "OBSERVE"
  | "BLUFF"
  | "DIPLOMACY"
  | "INTIMIDATE"
  | "NEGOTIATE"
  | "ARREST"
  | "EQUIP"
  | "UNEQUIP"
  | "EAT"
  | "WAIT";

export type GameAction = {
  type: ActionType;
  actorId: string;
  targetId?: string;
  destination?: Point;
  itemId?: string;
  equipmentSlot?: EquipmentSlot;
  rushed?: boolean;
};
