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
    damageRoll?: number;
    fortitudeRoll?: number;
    fortitude?: { bonus: number; total: number; dc: number; success: boolean };
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
  };
};
