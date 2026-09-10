export type Relationship = {
  id: string;

  entityAId: string;

  entityBId: string;

  friendship: number;

  trust: number;

  respect: number;

  fear: number;

  attraction: number;

  loyalty: number;

  hostile: boolean;

  allied: boolean;

  rival: boolean;

  romantic: boolean;
};