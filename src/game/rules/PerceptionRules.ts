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

function hasLineOfSight(map: GameMap, from: Point, to: Point): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;

  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    const x = Math.round(from.x + dx * t);
    const y = Math.round(from.y + dy * t);
    const tile = map.tiles[y]?.[x];
    if (tile && !tile.walkable) return false;
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
