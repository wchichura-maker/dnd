import {
  playerCharacter
} from "../Character";

import {
  applyDamage,
  applyHealing,
  getHitPointState,
  hasCondition,
  resolveDisabledStrenuousAction
} from "../rules/ConditionRules";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`TESTE FALHOU: ${message}`);
  }
}

function createCombatant(
  hp: number,
  conditions: { type: "STABLE" }[] = []
) {
  return {
    ...playerCharacter,
    id: `hp-transition-${hp}-${conditions.length}`,
    hp,
    maxHp: 30,
    conditions
  };
}

export function runHitPointTransitionTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE TRANSIÇÃO DE HP");
  console.log("==============================");

  const normal = createCombatant(10);
  const disabled = applyDamage(normal, 10);

  assert(
    disabled.hp === 0,
    "Dano até 0 deve produzir exatamente 0 HP."
  );
  assert(
    getHitPointState(disabled) === "DISABLED",
    "0 HP deve resultar em DISABLED."
  );

  const dying = applyDamage(disabled, 1);

  assert(
    dying.hp === -1,
    "Dano adicional deve permitir HP negativo."
  );
  assert(
    getHitPointState(dying) === "DYING",
    "-1 HP deve resultar em DYING."
  );

  const stable = {
    ...dying,
    conditions: [{ type: "STABLE" as const }]
  };

  const damagedStable = applyDamage(stable, 1);

  assert(
    !hasCondition(damagedStable, "STABLE"),
    "Qualquer dano deve remover STABLE."
  );
  assert(
    damagedStable.hp === -2,
    "Dano em STABLE deve reduzir HP normalmente."
  );
  assert(
    getHitPointState(damagedStable) === "DYING",
    "Dano em STABLE deve retornar o personagem a DYING."
  );

  const healedDying = applyHealing(dying, 1);

  assert(
    healedDying.hp === 0,
    "Cura de 1 em -1 deve chegar a 0 HP."
  );
  assert(
    getHitPointState(healedDying) === "DISABLED",
    "Cura até 0 deve deixar o personagem DISABLED e consciente."
  );
  assert(
    !hasCondition(healedDying, "STABLE"),
    "Ao chegar a 0 HP, STABLE deve ser removido."
  );

  const healedToFunctional = applyHealing(dying, 2);

  assert(
    healedToFunctional.hp === 1,
    "Cura de 2 em -1 deve chegar a 1 HP."
  );
  assert(
    getHitPointState(healedToFunctional) === "NORMAL",
    "Cura acima de 0 deve retornar a NORMAL."
  );

  const dyingHealedPartially = applyHealing(
    createCombatant(-3),
    1
  );

  assert(
    dyingHealedPartially.hp === -2,
    "Cura parcial de Dying deve aumentar HP."
  );
  assert(
    getHitPointState(dyingHealedPartially) === "STABLE",
    "Qualquer cura de Dying que permaneça abaixo de 0 deve estabilizar."
  );

  const stableNegative = createCombatant(
    -5,
    [{ type: "STABLE" }]
  );

  const partiallyHealedStable = applyHealing(
    stableNegative,
    2
  );

  assert(
    partiallyHealedStable.hp === -3,
    "Cura parcial deve alterar o HP corretamente."
  );
  assert(
    getHitPointState(partiallyHealedStable) === "STABLE",
    "STABLE negativo deve permanecer STABLE enquanto continuar abaixo de 0."
  );

  const disabledAction = createCombatant(0);
  const afterDisabledAction =
    resolveDisabledStrenuousAction(
      disabledAction,
      disabledAction
    );

  assert(
    afterDisabledAction.hp === -1,
    "Ação árdua de Disabled deve causar 1 dano ao final."
  );
  assert(
    getHitPointState(afterDisabledAction) === "DYING",
    "Ação árdua de Disabled deve levar a DYING."
  );

  const disabledHealingAction = createCombatant(0);
  const healedDuringAction = applyHealing(
    disabledHealingAction,
    5
  );
  const afterHealingAction =
    resolveDisabledStrenuousAction(
      disabledHealingAction,
      healedDuringAction
    );

  assert(
    afterHealingAction.hp === 5,
    "Ação que aumentou HP não deve aplicar o dano extra de Disabled."
  );
  assert(
    getHitPointState(afterHealingAction) === "NORMAL",
    "Cura durante ação deve deixar o personagem funcional."
  );

  const dead = createCombatant(-9);
  const killed = applyDamage(dead, 1);

  assert(
    getHitPointState(killed) === "DEAD",
    "HP <= -10 deve resultar em DEAD."
  );

  console.log("✓ 0 HP = DISABLED");
  console.log("✓ -1 a -9 HP = DYING");
  console.log("✓ dano remove STABLE");
  console.log("✓ cura parcial de DYING = STABLE");
  console.log("✓ cura até 0 = DISABLED");
  console.log("✓ cura acima de 0 = NORMAL");
  console.log("✓ ação árdua de DISABLED causa 1 dano");
  console.log("✓ ação que aumenta HP não sofre dano extra");
  console.log("✓ -10 HP = DEAD");
  console.log("==============================");
  console.log("✓ TODOS OS TESTES DE TRANSIÇÃO DE HP PASSARAM");
  console.log("==============================");
}
