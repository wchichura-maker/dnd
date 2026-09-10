import {
  playerCharacter
} from "../Character";

import {
  orc
} from "../Combat";

import {
  getCombatDistance,
  getWeaponRange,
  isWithinWeaponRange
} from "../rules/RangeRules";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `TESTE DE ALCANCE FALHOU: ${message}`
    );
  }
}

export function runRangeRulesTests(): void {

  /*
   * MESMA CASA
   */

  const samePosition = {
    ...orc,
    position: {
      ...playerCharacter.position
    }
  };

  assert(
    getCombatDistance(
      playerCharacter,
      samePosition
    ) === 0,
    "Mesma posição deveria ter distância 0."
  );

  /*
   * ADJACENTE HORIZONTAL
   */

  const horizontal = {
    ...orc,
    position: {
      x:
        playerCharacter.position.x + 1,

      y:
        playerCharacter.position.y
    }
  };

  assert(
    getCombatDistance(
      playerCharacter,
      horizontal
    ) === 1,
    "Casa horizontal adjacente deveria ter distância 1."
  );

  /*
   * ADJACENTE VERTICAL
   */

  const vertical = {
    ...orc,
    position: {
      x:
        playerCharacter.position.x,

      y:
        playerCharacter.position.y + 1
    }
  };

  assert(
    getCombatDistance(
      playerCharacter,
      vertical
    ) === 1,
    "Casa vertical adjacente deveria ter distância 1."
  );

  /*
   * ADJACENTE DIAGONAL
   */

  const diagonal = {
    ...orc,
    position: {
      x:
        playerCharacter.position.x + 1,

      y:
        playerCharacter.position.y + 1
    }
  };

  assert(
    getCombatDistance(
      playerCharacter,
      diagonal
    ) === 1,
    "Casa diagonal adjacente deveria ter distância 1."
  );

  /*
   * ALCANCE DA ESPADA
   */

  assert(
    getWeaponRange(
      playerCharacter
    ) === 1,
    "Espada Longa deveria possuir alcance 1."
  );

  /*
   * ATAQUE HORIZONTAL
   */

  assert(
    isWithinWeaponRange(
      playerCharacter,
      horizontal
    ),
    "Alvo horizontal adjacente deveria estar no alcance."
  );

  /*
   * ATAQUE DIAGONAL
   */

  assert(
    isWithinWeaponRange(
      playerCharacter,
      diagonal
    ),
    "Alvo diagonal adjacente deveria estar no alcance."
  );

  /*
   * ALVO DISTANTE
   */

  const distant = {
    ...orc,
    position: {
      x:
        playerCharacter.position.x + 3,

      y:
        playerCharacter.position.y
    }
  };

  assert(
    !isWithinWeaponRange(
      playerCharacter,
      distant
    ),
    "Alvo distante não deveria estar no alcance da espada."
  );

  console.log(
    "✓ Regras de alcance"
  );
}