import type { Combatant } from "../entities/Combatant";
import type { GameMap } from "../types/Map";
import type { Position } from "../world/Position";

export type PathResult = {
  path: Position[];
  cost: number;
};

type SearchState = {
  position: Position;
  cost: number;
  diagonalCount: number;
};

function isInsideMap(
  map: GameMap,
  position: Position
): boolean {
  return (
    position.x >= 0 &&
    position.x < map.width &&
    position.y >= 0 &&
    position.y < map.height
  );
}

function getTile(
  map: GameMap,
  position: Position
) {
  return map.tiles[position.y]?.[position.x];
}

function isWalkable(
  map: GameMap,
  position: Position
): boolean {
  if (!isInsideMap(map, position)) {
    return false;
  }

  const tile = getTile(map, position);

  return tile !== undefined && tile.walkable;
}

function isOccupied(
  position: Position,
  entities: Combatant[],
  ignoreEntityId?: string
): boolean {
  return entities.some(entity => {
    if (entity.id === ignoreEntityId) {
      return false;
    }

    if (entity.hp <= 0) {
      return false;
    }

    return (
      entity.position.x === position.x &&
      entity.position.y === position.y
    );
  });
}

function getNeighbors(
  position: Position
): Position[] {
  return [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },

    { x: position.x - 1, y: position.y - 1 },
    { x: position.x + 1, y: position.y - 1 },
    { x: position.x - 1, y: position.y + 1 },
    { x: position.x + 1, y: position.y + 1 }
  ];
}

function isDiagonal(
  from: Position,
  to: Position
): boolean {
  return (
    Math.abs(to.x - from.x) === 1 &&
    Math.abs(to.y - from.y) === 1
  );
}

function canMoveDiagonally(
  map: GameMap,
  entities: Combatant[],
  from: Position,
  to: Position,
  ignoreEntityId?: string
): boolean {
  if (!isDiagonal(from, to)) {
    return true;
  }

  const horizontal: Position = {
    x: to.x,
    y: from.y
  };

  const vertical: Position = {
    x: from.x,
    y: to.y
  };

  if (!isWalkable(map, horizontal)) {
    return false;
  }

  if (!isWalkable(map, vertical)) {
    return false;
  }

  if (
    isOccupied(
      horizontal,
      entities,
      ignoreEntityId
    )
  ) {
    return false;
  }

  if (
    isOccupied(
      vertical,
      entities,
      ignoreEntityId
    )
  ) {
    return false;
  }

  return true;
}

function getStepCost(
  from: Position,
  to: Position,
  diagonalCount: number
): {
  cost: number;
  nextDiagonalCount: number;
} {
  if (!isDiagonal(from, to)) {
    return {
      cost: 1,
      nextDiagonalCount: diagonalCount
    };
  }

  const cost = diagonalCount % 2 === 0 ? 1 : 2;

  return {
    cost,
    nextDiagonalCount: diagonalCount + 1
  };
}

function stateKey(
  position: Position,
  diagonalCount: number
): string {
  return `${position.x},${position.y},${diagonalCount % 2}`;
}

function positionKey(
  position: Position
): string {
  return `${position.x},${position.y}`;
}

/**
 * Encontra o menor caminho entre duas casas.
 *
 * O custo segue a regra de movimento diagonal:
 *
 * 1ª diagonal = 1
 * 2ª diagonal = 2
 * 3ª diagonal = 1
 * 4ª diagonal = 2
 *
 * Total:
 *
 * 1 diagonal = 1
 * 2 diagonais = 3
 * 3 diagonais = 4
 * 4 diagonais = 6
 */
export function findPath(
  map: GameMap,
  entities: Combatant[],
  start: Position,
  destination: Position,
  ignoreEntityId?: string
): PathResult | undefined {
  if (!isInsideMap(map, start)) {
    return undefined;
  }

  if (!isInsideMap(map, destination)) {
    return undefined;
  }

  if (!isWalkable(map, destination)) {
    return undefined;
  }

  if (
    isOccupied(
      destination,
      entities,
      ignoreEntityId
    )
  ) {
    return undefined;
  }

  if (
    start.x === destination.x &&
    start.y === destination.y
  ) {
    return {
      path: [],
      cost: 0
    };
  }

  const open: SearchState[] = [
    {
      position: start,
      cost: 0,
      diagonalCount: 0
    }
  ];

  const distances = new Map<string, number>();
  const previous = new Map<
    string,
    {
      position: Position;
      diagonalCount: number;
    }
  >();

  distances.set(
    stateKey(start, 0),
    0
  );

  while (open.length > 0) {
    open.sort((a, b) => a.cost - b.cost);

    const current = open.shift();

    if (!current) {
      break;
    }

    const currentKey = stateKey(
      current.position,
      current.diagonalCount
    );

    const knownCost = distances.get(currentKey);

    if (
      knownCost !== undefined &&
      current.cost > knownCost
    ) {
      continue;
    }

    if (
      current.position.x === destination.x &&
      current.position.y === destination.y
    ) {
      const path: Position[] = [];

      let reconstructionPosition = current.position;
      let reconstructionDiagonalCount =
        current.diagonalCount;

      while (
        !(
          reconstructionPosition.x === start.x &&
          reconstructionPosition.y === start.y
        )
      ) {
        path.unshift({
          x: reconstructionPosition.x,
          y: reconstructionPosition.y
        });

        const reconstructionKey = stateKey(
          reconstructionPosition,
          reconstructionDiagonalCount
        );

        const previousState =
          previous.get(reconstructionKey);

        if (!previousState) {
          return undefined;
        }

        reconstructionPosition =
          previousState.position;

        reconstructionDiagonalCount =
          previousState.diagonalCount;
      }

      return {
        path,
        cost: current.cost
      };
    }

    const neighbors = getNeighbors(
      current.position
    );

    for (const neighbor of neighbors) {
      if (!isInsideMap(map, neighbor)) {
        continue;
      }

      if (!isWalkable(map, neighbor)) {
        continue;
      }

      if (
        isOccupied(
          neighbor,
          entities,
          ignoreEntityId
        )
      ) {
        continue;
      }

      if (
        !canMoveDiagonally(
          map,
          entities,
          current.position,
          neighbor,
          ignoreEntityId
        )
      ) {
        continue;
      }

      const step = getStepCost(
        current.position,
        neighbor,
        current.diagonalCount
      );

      const nextCost =
        current.cost + step.cost;

      const nextKey = stateKey(
        neighbor,
        step.nextDiagonalCount
      );

      const previousCost =
        distances.get(nextKey);

      if (
        previousCost !== undefined &&
        previousCost <= nextCost
      ) {
        continue;
      }

      distances.set(
        nextKey,
        nextCost
      );

      previous.set(
        nextKey,
        {
          position: current.position,
          diagonalCount:
            current.diagonalCount
        }
      );

      open.push({
        position: neighbor,
        cost: nextCost,
        diagonalCount:
          step.nextDiagonalCount
      });
    }
  }

  return undefined;
}

/**
 * Retorna todas as casas que podem ser alcançadas
 * gastando no máximo maxCost de movimento.
 *
 * O cálculo é feito uma única vez a partir da posição
 * atual, em vez de executar findPath separadamente
 * para cada casa do mapa.
 */
export function getReachablePositions(
  map: GameMap,
  entities: Combatant[],
  start: Position,
  maxCost: number,
  ignoreEntityId?: string
): Position[] {
  if (maxCost <= 0) {
    return [];
  }

  if (!isInsideMap(map, start)) {
    return [];
  }

  const open: SearchState[] = [
    {
      position: start,
      cost: 0,
      diagonalCount: 0
    }
  ];

  const distances = new Map<string, number>();
  const reachable = new Map<string, Position>();

  distances.set(
    stateKey(start, 0),
    0
  );

  while (open.length > 0) {
    open.sort((a, b) => a.cost - b.cost);

    const current = open.shift();

    if (!current) {
      break;
    }

    const currentKey = stateKey(
      current.position,
      current.diagonalCount
    );

    const knownCost =
      distances.get(currentKey);

    if (
      knownCost !== undefined &&
      current.cost > knownCost
    ) {
      continue;
    }

    if (
      !(
        current.position.x === start.x &&
        current.position.y === start.y
      )
    ) {
      const key = positionKey(
        current.position
      );

      const existingPosition =
        reachable.get(key);

      if (!existingPosition) {
        reachable.set(
          key,
          {
            x: current.position.x,
            y: current.position.y
          }
        );
      }
    }

    const neighbors = getNeighbors(
      current.position
    );

    for (const neighbor of neighbors) {
      if (!isInsideMap(map, neighbor)) {
        continue;
      }

      if (!isWalkable(map, neighbor)) {
        continue;
      }

      if (
        isOccupied(
          neighbor,
          entities,
          ignoreEntityId
        )
      ) {
        continue;
      }

      if (
        !canMoveDiagonally(
          map,
          entities,
          current.position,
          neighbor,
          ignoreEntityId
        )
      ) {
        continue;
      }

      const step = getStepCost(
        current.position,
        neighbor,
        current.diagonalCount
      );

      const nextCost =
        current.cost + step.cost;

      if (nextCost > maxCost) {
        continue;
      }

      const nextKey = stateKey(
        neighbor,
        step.nextDiagonalCount
      );

      const previousCost =
        distances.get(nextKey);

      if (
        previousCost !== undefined &&
        previousCost <= nextCost
      ) {
        continue;
      }

      distances.set(
        nextKey,
        nextCost
      );

      open.push({
        position: neighbor,
        cost: nextCost,
        diagonalCount:
          step.nextDiagonalCount
      });
    }
  }

  return Array.from(
    reachable.values()
  );
}