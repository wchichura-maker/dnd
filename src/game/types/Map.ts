export type Point = {
  x: number;
  y: number;
};

export type Tile = Point & {
  walkable: boolean;
};

export type GameMap = {
  width: number;
  height: number;
  tiles: Tile[][];
};
