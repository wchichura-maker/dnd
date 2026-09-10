import {
  isHelpless,
  canReceiveCoupDeGrace,
  resolveCoupDeGrace
} from "../rules/CoupDeGraceRules";

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

export function runCoupDeGraceTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE GOLPE DE MISERICÓRDIA");
  console.log("==============================");

  const dying = {
    ...playerCharacter,
    hp: -1
  };

  assert(
    isHelpless(dying),
    "Uma criatura DYING deve ser considerada helpless."
  );

  assert(
    canReceiveCoupDeGrace(dying),
    "Uma criatura DYING deve poder receber coup de grace."
  );

  const unconscious = {
    ...playerCharacter,
    hp: 10,
    conditions: [
      { type: "UNCONSCIOUS" as const }
    ]
  };

  assert(
    isHelpless(unconscious),
    "UNCONSCIOUS deve ser considerado helpless."
  );

  const paralyzed = {
    ...playerCharacter,
    hp: 10,
    conditions: [
      { type: "PARALYZED" as const }
    ]
  };

  assert(
    isHelpless(paralyzed),
    "PARALYZED deve ser considerado helpless."
  );

  const disabled = {
    ...playerCharacter,
    hp: 0,
    conditions: []
  };

  assert(
    !isHelpless(disabled),
    "DISABLED a 0 HP não deve ser tratado automaticamente como helpless."
  );

  const normal = {
    ...playerCharacter,
    hp: 10,
    conditions: []
  };

  assert(
    !canReceiveCoupDeGrace(normal),
    "Uma criatura normal não pode receber coup de grace."
  );

  const immune = {
    ...dying,
    immuneToCriticalHits: true
  };

  assert(
    !canReceiveCoupDeGrace(immune),
    "Uma criatura imune a críticos não pode receber coup de grace."
  );

  const survivor = {
    ...dying,
    hp: -1
  };

  const survived = resolveCoupDeGrace(
    survivor,
    10,
    { ...survivor, hp: -1 },
    20
  );

  assert(
    survived.success,
    "O coup de grace deveria ser resolvido contra um alvo helpless."
  );

  assert(
    survived.fortitude?.dc === 20,
    "A CD deveria ser 10 + dano causado."
  );

  assert(
    !survived.targetDied,
    "Um teste de Fortitude bem-sucedido deve permitir sobreviver."
  );

  const failedSave = resolveCoupDeGrace(
    survivor,
    10,
    { ...survivor, hp: -1 },
    1
  );

  assert(
    failedSave.targetDied,
    "Falha no teste de Fortitude deve matar o alvo."
  );

  const lethalDamage = resolveCoupDeGrace(
    survivor,
    20,
    { ...survivor, hp: -10 },
    20
  );

  assert(
    lethalDamage.targetDied,
    "Dano que reduz o alvo a -10 deve matá-lo sem novo teste."
  );

  console.log("✓ DYING é helpless");
  console.log("✓ UNCONSCIOUS/PARALYZED são helpless");
  console.log("✓ DISABLED não é automaticamente helpless");
  console.log("✓ Imunidade a críticos bloqueia coup de grace");
  console.log("✓ CD = 10 + dano");
  console.log("✓ Falha em Fortitude causa morte");
  console.log("✓ Dano até -10 causa morte");
  console.log("==============================");
  console.log("✓ TODOS OS TESTES DE GOLPE DE MISERICÓRDIA PASSARAM");
  console.log("==============================");
}
