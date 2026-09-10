export type ActionResult = {
  success: boolean;

  message: string;

  data?: {
    distance?: number;

    remainingMovement?: number;

    position?: {
      x: number;
      y: number;
    };

    itemId?: string;

    equipmentSlot?:
      | "WEAPON"
      | "ARMOR"
      | "SHIELD";

    damage?: number;

    critical?: boolean;

    targetId?: string;

    targetDied?: boolean;

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