export type Tile = {
  x: number;
  y: number;
  walkable: boolean;
};

export type GameMap = {
  width: number;
  height: number;
  tiles: Tile[][];
};