import {
  findPath,
  getReachablePositions
} from "../rules/Pathfinding";

import type { GameMap } from "../types/Map";

import { orc } from "../Combat";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `TESTE DE PATHFINDING FALHOU: ${message}`
    );
  }
}

function createTestMap(): GameMap {
  return {
    width: 10,
    height: 10,

    tiles: Array.from(
      { length: 10 },
      (_, y) =>
        Array.from(
          { length: 10 },
          (_, x) => ({
            x,
            y,
            walkable: true
          })
        )
    )
  };
}

export function runPathfindingTests(): void {
  const map = createTestMap();

  /*
   * CAMINHO HORIZONTAL
   */

  const simplePath =
    findPath(
      map,
      [],
      { x: 0, y: 0 },
      { x: 3, y: 0 }
    );

  assert(
    simplePath !== undefined,
    "Deveria encontrar um caminho simples."
  );

  if (!simplePath) {
    throw new Error(
      "Caminho simples não foi encontrado."
    );
  }

  assert(
    simplePath.cost === 3,
    "Caminho horizontal de 3 casas deveria custar 3."
  );

  /*
   * PRIMEIRA DIAGONAL
   */

  const diagonalPath =
    findPath(
      map,
      [],
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    );

  assert(
    diagonalPath !== undefined,
    "Deveria encontrar caminho diagonal."
  );

  if (!diagonalPath) {
    throw new Error(
      "Caminho diagonal não foi encontrado."
    );
  }

  assert(
    diagonalPath.cost === 1,
    "Primeira diagonal deveria custar 1."
  );

  /*
   * DUAS DIAGONAIS
   */

  const twoDiagonalPath =
    findPath(
      map,
      [],
      { x: 0, y: 0 },
      { x: 2, y: 2 }
    );

  assert(
    twoDiagonalPath !== undefined,
    "Deveria encontrar duas diagonais."
  );

  if (!twoDiagonalPath) {
    throw new Error(
      "Caminho de duas diagonais não foi encontrado."
    );
  }

  assert(
    twoDiagonalPath.cost === 3,
    "Duas diagonais deveriam custar 3."
  );

  /*
   * OBSTÁCULO
   */

  const obstacleMap =
    createTestMap();

  obstacleMap.tiles[0][1].walkable =
    false;

  const obstaclePath =
    findPath(
      obstacleMap,
      [],
      { x: 0, y: 0 },
      { x: 2, y: 0 }
    );

  assert(
    obstaclePath !== undefined,
    "Deveria contornar o obstáculo."
  );

  if (!obstaclePath) {
    throw new Error(
      "Caminho para contornar obstáculo não foi encontrado."
    );
  }

  assert(
    obstaclePath.path.some(
      position => position.y !== 0
    ),
    "O caminho deveria desviar do obstáculo."
  );

  /*
   * DESTINO FORA DO MAPA
   */

  const blockedPath =
    findPath(
      map,
      [orc],
      { x: 9, y: 5 },
      { x: 10, y: 5 }
    );

  assert(
    blockedPath === undefined,
    "Não deveria permitir destino fora do mapa."
  );

  /*
   * ALCANCE DE MOVIMENTO
   */

  const reachable =
    getReachablePositions(
      map,
      [],
      { x: 5, y: 5 },
      3
    );

  assert(
    reachable.length > 0,
    "Deveria existir pelo menos uma casa alcançável."
  );

  assert(
    reachable.some(
      position =>
        position.x === 5 &&
        position.y === 4
    ),
    "A casa imediatamente acima deveria ser alcançável."
  );

  assert(
    reachable.some(
      position =>
        position.x === 4 &&
        position.y === 4
    ),
    "Uma diagonal deveria ser alcançável."
  );

  /*
   * ALCANCE NÃO PODE ULTRAPASSAR O MOVIMENTO
   */

  const reachableOne =
    getReachablePositions(
      map,
      [],
      { x: 5, y: 5 },
      1
    );

  assert(
    !reachableOne.some(
      position =>
        position.x === 3 &&
        position.y === 5
    ),
    "Uma casa a 2 passos não deveria ser alcançável com movimento 1."
  );

  /*
   * OBSTÁCULO NO ALCANCE
   */

  const blockedReachMap =
    createTestMap();

  blockedReachMap.tiles[5][6].walkable =
    false;

  const reachableAroundObstacle =
    getReachablePositions(
      blockedReachMap,
      [],
      { x: 5, y: 5 },
      3
    );

  assert(
    !reachableAroundObstacle.some(
      position =>
        position.x === 6 &&
        position.y === 5
    ),
    "Uma casa bloqueada não deveria ser alcançável."
  );

  /*
   * OCUPAÇÃO
   */

  const occupiedReach =
    getReachablePositions(
      map,
      [orc],
      {
        x: 9,
        y: 5
      },
      3
    );

  assert(
    !occupiedReach.some(
      position =>
        position.x === orc.position.x &&
        position.y === orc.position.y
    ),
    "Uma casa ocupada por uma criatura viva não deveria ser alcançável."
  );

  console.log(
    "✓ Regras de pathfinding e alcance de movimento"
  );
}