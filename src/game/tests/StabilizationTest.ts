import {
  getHitPointState,
  hasCondition,
  resolveDyingState
} from "../rules/ConditionRules";

import {
  playerCharacter
} from "../Character";

import type {
  Combatant
} from "../entities/Combatant";


function assert(
  condition: boolean,
  message: string
): void {

  if (!condition) {

    throw new Error(
      `TESTE FALHOU: ${message}`
    );

  }
}


function createDyingCombatant(
  hp: number
): Combatant {

  return {
    ...playerCharacter,

    id: `test-dying-${hp}`,

    hp,

    conditions: []
  };

}


export function runStabilizationTests(): void {

  console.log(
    "=============================="
  );

  console.log(
    "INICIANDO TESTES DE ESTABILIZAÇÃO"
  );

  console.log(
    "=============================="
  );


  /*
   * -1 HP + 1
   */

  const dyingMinusOne =
    createDyingCombatant(-1);

  const rollOne =
    resolveDyingState(
      dyingMinusOne,
      1
    );

  assert(
    rollOne.stabilized,
    "Resultado 1 deveria estabilizar."
  );

  assert(
    !rollOne.lostHitPoint,
    "Resultado 1 não deveria remover HP."
  );

  assert(
    rollOne.combatant.hp === -1,
    "A estabilização não deveria alterar o HP."
  );

  assert(
    hasCondition(
      rollOne.combatant,
      "STABLE"
    ),
    "A condição STABLE deveria ser adicionada."
  );

  assert(
    getHitPointState(
      rollOne.combatant
    ) === "STABLE",
    "O estado deveria ser STABLE."
  );

  console.log(
    "✓ 1 naturaliza estabilização"
  );


  /*
   * -1 HP + 10
   */

  const dyingMinusOneTen =
    createDyingCombatant(-1);

  const rollTen =
    resolveDyingState(
      dyingMinusOneTen,
      10
    );

  assert(
    rollTen.stabilized,
    "Resultado 10 deveria estabilizar."
  );

  assert(
    rollTen.combatant.hp === -1,
    "Resultado 10 não deveria remover HP."
  );

  assert(
    getHitPointState(
      rollTen.combatant
    ) === "STABLE",
    "Resultado 10 deveria produzir STABLE."
  );

  console.log(
    "✓ 10 estabiliza"
  );


  /*
   * -1 HP + 11
   */

  const dyingMinusOneEleven =
    createDyingCombatant(-1);

  const rollEleven =
    resolveDyingState(
      dyingMinusOneEleven,
      11
    );

  assert(
    !rollEleven.stabilized,
    "Resultado 11 não deveria estabilizar."
  );

  assert(
    rollEleven.lostHitPoint,
    "Resultado 11 deveria remover 1 HP."
  );

  assert(
    rollEleven.combatant.hp === -2,
    "HP deveria passar de -1 para -2."
  );

  assert(
    getHitPointState(
      rollEleven.combatant
    ) === "DYING",
    "HP -2 deveria continuar DYING."
  );

  console.log(
    "✓ 11 falha na estabilização"
  );


  /*
   * -9 HP + 100
   *
   * Deve chegar exatamente em -10.
   */

  const dyingMinusNine =
    createDyingCombatant(-9);

  const rollHundred =
    resolveDyingState(
      dyingMinusNine,
      100
    );

  assert(
    !rollHundred.stabilized,
    "Resultado 100 não deveria estabilizar."
  );

  assert(
    rollHundred.lostHitPoint,
    "Resultado 100 deveria remover 1 HP."
  );

  assert(
    rollHundred.combatant.hp === -10,
    "HP deveria passar de -9 para -10."
  );

  assert(
    getHitPointState(
      rollHundred.combatant
    ) === "DEAD",
    "HP -10 deveria resultar em DEAD."
  );

  console.log(
    "✓ -9 → -10 resulta em DEAD"
  );


  /*
   * -9 HP + 10
   */

  const dyingMinusNineStable =
    createDyingCombatant(-9);

  const rollTenAtMinusNine =
    resolveDyingState(
      dyingMinusNineStable,
      10
    );

  assert(
    rollTenAtMinusNine.stabilized,
    "Resultado 10 em -9 deveria estabilizar."
  );

  assert(
    rollTenAtMinusNine.combatant.hp === -9,
    "Estabilização em -9 não deveria alterar HP."
  );

  assert(
    getHitPointState(
      rollTenAtMinusNine.combatant
    ) === "STABLE",
    "O personagem deveria ficar STABLE em -9."
  );

  console.log(
    "✓ Estabilização funciona em -9 HP"
  );


  /*
   * STABLE não deve sofrer nova perda
   */

  const stableCombatant =
    rollTenAtMinusNine.combatant;

  const stableResult =
    resolveDyingState(
      stableCombatant,
      100
    );

  assert(
    stableResult.combatant.hp === -9,
    "Um personagem STABLE não deveria perder HP novamente."
  );

  assert(
    !stableResult.lostHitPoint,
    "Um personagem STABLE não deveria perder HP."
  );

  assert(
    getHitPointState(
      stableResult.combatant
    ) === "STABLE",
    "O personagem deveria continuar STABLE."
  );

  console.log(
    "✓ STABLE não perde HP novamente"
  );


  console.log(
    "=============================="
  );

  console.log(
    "✓ TODOS OS TESTES DE ESTABILIZAÇÃO PASSARAM"
  );

  console.log(
    "=============================="
  );
}