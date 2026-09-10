import {
  getSavingThrowBonus,
  resolveSavingThrow
} from "../rules/SavingThrowRules";

import {
  playerCharacter
} from "../Character";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`TESTE FALHOU: ${message}`);
  }
}

export function runSavingThrowTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE SAVING THROWS");
  console.log("==============================");

  const character = {
    ...playerCharacter,
    dnd: {
      ...playerCharacter.dnd,
      classData: {
        ...playerCharacter.dnd.classData,
        name: "FIGHTER" as const,
        level: 1
      }
    }
  };

  const fortitude = getSavingThrowBonus(character, "FORTITUDE");
  const reflex = getSavingThrowBonus(character, "REFLEX");
  const will = getSavingThrowBonus(character, "WILL");

  assert(
    fortitude > reflex,
    "Fighter de nível 1 deveria possuir Fortitude boa e Reflexo ruim."
  );

  assert(
    fortitude > will,
    "Fighter de nível 1 deveria possuir Fortitude boa e Vontade ruim."
  );

  const normalFailure = resolveSavingThrow(
    character,
    "FORTITUDE",
    50,
    20
  );

  assert(
    normalFailure.success,
    "Natural 20 deveria ser sucesso automático."
  );

  assert(
    normalFailure.automaticSuccess,
    "Natural 20 deveria ser identificado como sucesso automático."
  );

  const naturalOne = resolveSavingThrow(
    character,
    "FORTITUDE",
    1,
    1
  );

  assert(
    !naturalOne.success,
    "Natural 1 deveria ser falha automática."
  );

  assert(
    naturalOne.automaticFailure,
    "Natural 1 deveria ser identificado como falha automática."
  );

  const dcCheck = resolveSavingThrow(
    character,
    "FORTITUDE",
    10,
    10
  );

  assert(
    dcCheck.total >= 10,
    "Resultado igual à DC deveria ser sucesso."
  );

  assert(
    dcCheck.success,
    "Um teste com resultado igual à DC deveria passar."
  );

  console.log("✓ Progressão de Fortitude/Reflexo/Vontade");
  console.log("✓ Natural 1 falha automaticamente");
  console.log("✓ Natural 20 passa automaticamente");
  console.log("✓ Resultado igual à DC passa");
  console.log("==============================");
  console.log("✓ TODOS OS TESTES DE SAVING THROWS PASSARAM");
  console.log("==============================");
}
