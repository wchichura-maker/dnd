import {
  canAct,
  canMove,
  getHitPointState,
  hasCondition
} from "../rules/ConditionRules";

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

function createCombatant(hp: number) {
  return {
    ...playerCharacter,
    id: `condition-test-${hp}`,
    hp,
    conditions: []
  };
}

export function runConditionStateTests(): void {
  console.log("==============================");
  console.log("INICIANDO TESTES DE ESTADOS");
  console.log("==============================");

  const normal = createCombatant(1);
  const disabled = createCombatant(0);
  const dying = createCombatant(-1);
  const dead = createCombatant(-10);

  assert(getHitPointState(normal) === "NORMAL", "> 0 HP deve ser NORMAL.");
  assert(getHitPointState(disabled) === "DISABLED", "0 HP deve ser DISABLED.");
  assert(getHitPointState(dying) === "DYING", "-1 HP deve ser DYING.");
  assert(getHitPointState(dead) === "DEAD", "-10 HP deve ser DEAD.");

  assert(canAct(normal), "NORMAL deve poder agir.");
  assert(canMove(normal), "NORMAL deve poder se mover.");
  assert(!canAct(dying), "DYING não deve poder agir.");
  assert(!canMove(dying), "DYING não deve poder se mover.");
  assert(!canAct(dead), "DEAD não deve poder agir.");
  assert(!canMove(dead), "DEAD não deve poder se mover.");

  const stunned = {
    ...normal,
    conditions: [{ type: "STUNNED" as const }]
  };

  assert(!canAct(stunned), "STUNNED não deve poder agir.");
  assert(!canMove(stunned), "STUNNED não deve poder se mover.");

  const paralyzed = {
    ...normal,
    conditions: [{ type: "PARALYZED" as const }]
  };

  assert(!canAct(paralyzed), "PARALYZED não deve poder agir.");
  assert(!canMove(paralyzed), "PARALYZED não deve poder se mover.");

  const stable = {
    ...dying,
    conditions: [{ type: "STABLE" as const }]
  };

  assert(
    getHitPointState(stable) === "STABLE",
    "DYING com STABLE deve ser STABLE."
  );
  assert(hasCondition(stable, "STABLE"), "STABLE deve ser detectável.");
  assert(!canAct(stable), "STABLE continua inconsciente e não pode agir.");
  assert(!canMove(stable), "STABLE não pode se mover.");

  const healed = createCombatant(1);
  assert(
    getHitPointState(healed) === "NORMAL",
    "Cura acima de 0 deve retornar ao estado NORMAL."
  );

  console.log("✓ NORMAL / DISABLED / DYING / STABLE / DEAD");
  console.log("✓ Estados impedem ações corretamente");
  console.log("✓ Estados impedem movimento corretamente");
  console.log("✓ STABLE continua inconsciente");
  console.log("✓ Cura acima de 0 retorna a NORMAL");
  console.log("==============================");
  console.log("✓ TODOS OS TESTES DE ESTADOS PASSARAM");
  console.log("==============================");
}
