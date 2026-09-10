import type { Combatant } from "../entities/Combatant";

/**
 * Calcula a distância de grade para combate.
 *
 * Para o nosso grid, uma casa adjacente,
 * inclusive diagonal, possui distância 1.
 *
 * Exemplo:
 *
 *  X X X
 *  X A X
 *  X X X
 *
 * Todas as casas ao redor de A possuem
 * distância 1.
 *
 * Para distâncias maiores usamos a regra
 * de diagonais do grid de D&D:
 *
 * - primeira diagonal: 1
 * - segunda diagonal: 2
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
export function getCombatDistance(
  attacker: Combatant,
  target: Combatant
): number {

  const dx =
    Math.abs(
      target.position.x -
      attacker.position.x
    );

  const dy =
    Math.abs(
      target.position.y -
      attacker.position.y
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

  /*
   * Cada par de diagonais custa 3 quadrados:
   *
   * diagonal 1 = 1
   * diagonal 2 = 2
   *
   * Portanto:
   *
   * floor(diagonal / 2) * 3
   * +
   * diagonal % 2
   */
  return (
    Math.floor(
      diagonal / 2
    ) * 3 +
    (diagonal % 2) +
    straight
  );
}

export function getWeaponRange(
  attacker: Combatant
): number {

  const weapon =
    attacker.dnd.equipment.weapon;

  if (!weapon) {
    return 0;
  }

  return weapon.range;
}

export function isWithinWeaponRange(
  attacker: Combatant,
  target: Combatant
): boolean {

  const distance =
    getCombatDistance(
      attacker,
      target
    );

  const range =
    getWeaponRange(
      attacker
    );

  return distance <= range;
}