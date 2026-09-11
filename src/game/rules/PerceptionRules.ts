import type { GameMap, Point } from "../types/Map";

export const DEFAULT_VISION_RANGE_SQUARES = 12;
export const EXPLORATION_BUFFER_SQUARES = 3;

type PerceptionResult = {
  visibleTiles: Point[];
  exploredTiles: Point[];
};

function key(point: Point): string {
  return `${point.x},${point.y}`;
}

function blocksVision(map: GameMap, x: number, y: number): boolean {
  const tile = map.tiles[y]?.[x];
  return tile !== undefined && !tile.walkable;
}

function hasLineOfSight(map: GameMap, from: Point, to: Point): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx === 0 && absDy === 0) return true;

  let x = from.x;
  let y = from.y;
  let ix = 0;
  let iy = 0;

  while (ix < absDx || iy < absDy) {
    const tx = (ix + 0.5) / Math.max(1, absDx);
    const ty = (iy + 0.5) / Math.max(1, absDy);

    if (absDx === 0 || (absDy !== 0 && tx > ty)) {
      x += stepX;
      ix += 1;
    } else if (absDy === 0 || tx < ty) {
      y += stepY;
      iy += 1;
    } else {
      const nextX = x + stepX;
      const nextY = y + stepY;
      if (blocksVision(map, nextX, y) || blocksVision(map, x, nextY)) return false;
      x = nextX;
      y = nextY;
      ix += 1;
      iy += 1;
    }

    if (x === to.x && y === to.y) break;
    if (blocksVision(map, x, y)) return false;
  }

  return true;
}

export function calculatePerception(
  map: GameMap,
  origin: Point,
  visionRangeSquares = DEFAULT_VISION_RANGE_SQUARES
): PerceptionResult {
  const visibleTiles: Point[] = [];
  const exploredTiles: Point[] = [];
  const exploredRange = visionRangeSquares + EXPLORATION_BUFFER_SQUARES;

  for (let y = Math.max(0, origin.y - exploredRange); y <= Math.min(map.height - 1, origin.y + exploredRange); y++) {
    for (let x = Math.max(0, origin.x - exploredRange); x <= Math.min(map.width - 1, origin.x + exploredRange); x++) {
      const distance = Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y));
      if (distance > exploredRange) continue;

      const point = { x, y };
      exploredTiles.push(point);
      if (distance <= visionRangeSquares && hasLineOfSight(map, origin, point)) {
        visibleTiles.push(point);
      }
    }
  }

  return { visibleTiles, exploredTiles };
}

export function pointsToKeys(points: Point[]): string[] {
  return points.map(key);
}
