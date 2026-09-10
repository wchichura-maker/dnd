export type Weapon = {
  id: string;
  name: string;

  damageDice: {
    count: number;
    sides: number;
  };

  criticalRange: number;
  criticalMultiplier: number;

  melee: boolean;
  range: number;
};