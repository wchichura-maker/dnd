import type { DiceRoll } from "../Dice";

export type ActionResult = {
  success: boolean;
  message: string;
  data?: {
    distance?: number;
    remainingMovement?: number;
    position?: { x: number; y: number };
    itemId?: string;
    equipmentSlot?: "WEAPON" | "ARMOR" | "SHIELD";
    damage?: number;
    critical?: boolean;
    targetId?: string;
    targetDied?: boolean;
    combatEnded?: boolean;
    combatEndReason?: string;
    damageRoll?: number | DiceRoll;
    fortitudeRoll?: number;
    fortitude?: { bonus: number; total: number; dc: number; success: boolean };
    phase?: string;
    interaction?: string;
    response?: string;
    resolution?: string;
    socialCheck?: {
      skill: "BLUFF" | "DIPLOMACY" | "INTIMIDATE";
      roll: number;
      bonus: number;
      total: number;
      targetRoll?: number;
      targetBonus?: number;
      targetTotal?: number;
      dc?: number;
      success: boolean;
      margin: number;
      initialAttitude?: string;
      newAttitude?: string;
    };
    opportunityAttacks?: Array<{
      attackerId: string;
      targetId: string;
      roll: number;
      attackBonus: number;
      total: number;
      critical: boolean;
      hit: boolean;
      damage: number;
      hpBefore: number;
      hpAfter: number;
    }>;
    attack?: {
      roll: number;
      attackBonus: number;
      total: number;
      targetArmorClass: number;
      hit: boolean;
      criticalThreat: boolean;
      criticalConfirmed: boolean;
      critical: boolean;
      damage: number;
      damageMultiplier: number;
    };
    [key: string]: unknown;
  };
};
