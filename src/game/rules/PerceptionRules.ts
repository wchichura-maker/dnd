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
  let tMaxX = absDx === 0 ? Number.POSITIVE_INFINITY : 0.5 / absDx;
  let tMaxY = absDy === 0 ? Number.POSITIVE_INFINITY : 0.5 / absDy;
  const tDeltaX = absDx === 0 ? Number.POSITIVE_INFINITY : 1 / absDx;
  const tDeltaY = absDy === 0 ? Number.POSITIVE_INFINITY : 1 / absDy;

  while (x !== to.x || y !== to.y) {
    if (tMaxX < tMaxY) {
      x += stepX;
      tMaxX += tDeltaX;
      if (x === to.x && y === to.y) break;
      if (blocksVision(map, x, y)) return false;
      continue;
    }

    if (tMaxY < tMaxX) {
      y += stepY;
      tMaxY += tDeltaY;
      if (x === to.x && y === to.y) break;
      if (blocksVision(map, x, y)) return false;
      continue;
    }

    const nextX = x + stepX;
    const nextY = y + stepY;
    if (blocksVision(map, nextX, y) || blocksVision(map, x, nextY)) return false;

    x = nextX;
    y = nextY;
    tMaxX += tDeltaX;
    tMaxY += tDeltaY;
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
