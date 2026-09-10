import type { Position } from "./world/Position";

/**
 * Calcula a distância entre duas posições
 * utilizando a regra de diagonais do grid
 * de D&D 3.5.
 *
 * Primeira diagonal: 1
 * Segunda diagonal: 2
 * Terceira diagonal: 1
 * Quarta diagonal: 2
 *
 * Exemplo:
 *
 * A . . .
 * . X . .
 * . . X .
 * . . . B
 *
 * Distância = 4
 */
export function getDistance(
  from: Position,
  to: Position
): number {

  const dx =
    Math.abs(
      to.x -
      from.x
    );

  const dy =
    Math.abs(
      to.y -
      from.y
    );

  const diagonal =
    Math.min(
      dx,
      dy
    );

  const straight =
    Math.max(
      dx,
      dy
    ) -
    diagonal;

  return (
    Math.floor(
      diagonal / 2
    ) * 3 +
    (diagonal % 2) +
    straight
  );
}

/**
 * Verifica se uma posição está
 * dentro do movimento disponível.
 */
export function canMove(
  from: Position,
  to: Position,
  movement: number
): boolean {

  const distance =
    getDistance(
      from,
      to
    );

  return (
    distance <=
    movement
  );
}