export type ItemType =
  | "WEAPON"
  | "ARMOR"
  | "SHIELD"
  | "POTION"
  | "SCROLL"
  | "RING"
  | "AMULET"
  | "MISC";

export type Item = {
  id: string;

  templateId: string;

  name: string;

  type: ItemType;

  quantity: number;
};