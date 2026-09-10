import type { GameMap } from "./types/Map";

export function createMap(
  width: number,
  height: number
): GameMap {

  const tiles = [];

  for (let y = 0; y < height; y++) {

    const row = [];

    for (let x = 0; x < width; x++) {

      row.push({
        x,
        y,
        walkable: true
      });

    }

    tiles.push(row);
  }

  return {
    width,
    height,
    tiles
  };
}