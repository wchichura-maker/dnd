import type { Combatant } from "../entities/Combatant";
import type { Condition } from "../entities/Condition";

export type HitPointState =
  | "NORMAL"
  | "DISABLED"
  | "DYING"
  | "STABLE"
  | "DEAD";

/*
 * D&D 3.5:
 *
 * > 0 HP  = normal
 *   0 HP  = disabled
 * -1..-9  = dying
 * <= -10  = dead
 *
 * Importante: não usamos Constituição para determinar a morte.
 * Isso é diferente de Pathfinder.
 */
export function getHitPointState(
  combatant: Combatant
): HitPointState {
  if (combatant.hp <= -10) {
    return "DEAD";
  }

  if (combatant.hp === 0) {
    return "DISABLED";
  }

  if (combatant.hp > 0) {
    return "NORMAL";
  }

  if (hasCondition(combatant, "STABLE")) {
    return "STABLE";
  }

  return "DYING";
}

export function hasCondition(
  combatant: Combatant,
  conditionType: Condition["type"]
): boolean {
  return (
    combatant.conditions?.some(
      condition =>
        condition.type === conditionType
    ) ?? false
  );
}

export function addCondition(
  combatant: Combatant,
  condition: Condition
): Combatant {
  const alreadyExists =
    combatant.conditions?.some(
      existing =>
        existing.type === condition.type &&
        existing.sourceId === condition.sourceId
    ) ?? false;

  if (alreadyExists) {
    return combatant;
  }

  return {
    ...combatant,
    conditions: [
      ...(combatant.conditions ?? []),
      condition
    ]
  };
}

export function removeCondition(
  combatant: Combatant,
  conditionType: Condition["type"]
): Combatant {
  return {
    ...combatant,
    conditions:
      (combatant.conditions ?? []).filter(
        condition =>
          condition.type !== conditionType
      )
  };
}

/**
 * D&D 3.5: uma criatura disabled move-se à metade
 * de seu deslocamento normal.
 */
export function getAvailableMovement(
  combatant: Combatant
): number {
  if (getHitPointState(combatant) === "DISABLED") {
    return Math.floor(combatant.movement / 2);
  }

  return combatant.movement;
}

/**
 * Aplica dano letal e resolve imediatamente as transições
 * de estado dependentes de HP.
 *
 * Qualquer dano recebido por uma criatura STABLE remove
 * a estabilidade antes de recalcular o estado de HP.
 */
export function applyDamage(
  combatant: Combatant,
  damage: number
): Combatant {
  if (damage <= 0) {
    return combatant;
  }

  const withoutStable =
    removeCondition(combatant, "STABLE");

  return {
    ...withoutStable,
    hp: combatant.hp - damage
  };
}

/**
 * Aplica cura seguindo as transições de D&D 3.5.
 *
 * - Dying + qualquer cura que resulte em HP negativo:
 *   torna-se Stable.
 * - HP 0: fica Disabled/consciente.
 * - HP > 0: fica Normal/funcional.
 * - STABLE permanece enquanto o personagem continuar
 *   abaixo de 0 HP.
 */
export function applyHealing(
  combatant: Combatant,
  healing: number
): Combatant {
  if (healing <= 0) {
    return combatant;
  }

  const oldState =
    getHitPointState(combatant);

  const newHp =
    Math.min(
      combatant.maxHp,
      combatant.hp + healing
    );

  const healed = {
    ...combatant,
    hp: newHp
  };

  if (newHp >= 0) {
    return removeCondition(
      healed,
      "STABLE"
    );
  }

  if (
    oldState === "DYING"
  ) {
    return addCondition(
      healed,
      { type: "STABLE" }
    );
  }

  return healed;
}

/**
 * Resolve o efeito de uma ação padrão/árdua realizada
 * enquanto o personagem estava DISABLED.
 *
 * D&D 3.5: a ação causa 1 HP de dano ao final,
 * exceto se a própria atividade tiver aumentado os HP.
 */
export function resolveDisabledStrenuousAction(
  beforeAction: Combatant,
  afterAction: Combatant
): Combatant {
  if (
    getHitPointState(beforeAction) !== "DISABLED"
  ) {
    return afterAction;
  }

  if (
    afterAction.hp > beforeAction.hp
  ) {
    return afterAction;
  }

  return applyDamage(
    afterAction,
    1
  );
}

export function canAct(
  combatant: Combatant
): boolean {
  const hpState =
    getHitPointState(combatant);

  if (
    hpState === "DEAD" ||
    hpState === "DYING" ||
    hpState === "STABLE"
  ) {
    return false;
  }

  if (
    hasCondition(combatant, "STUNNED") ||
    hasCondition(combatant, "PARALYZED") ||
    hasCondition(combatant, "UNCONSCIOUS") ||
    hasCondition(combatant, "DAZED") ||
    hasCondition(combatant, "PETRIFIED")
  ) {
    return false;
  }

  return true;
}

export function canMove(
  combatant: Combatant
): boolean {
  if (!canAct(combatant)) {
    return false;
  }

  if (
    hasCondition(combatant, "PARALYZED") ||
    hasCondition(combatant, "PETRIFIED")
  ) {
    return false;
  }

  return true;
}

export function canUseStandardAction(
  combatant: Combatant
): boolean {
  return canAct(combatant);
}

export function isDead(
  combatant: Combatant
): boolean {
  return (
    getHitPointState(combatant) === "DEAD"
  );
}

export function isDying(
  combatant: Combatant
): boolean {
  return (
    getHitPointState(combatant) === "DYING"
  );
}

export function isStable(
  combatant: Combatant
): boolean {
  return (
    getHitPointState(combatant) === "STABLE"
  );
}

export type StabilizationResult = {
  combatant: Combatant;
  stabilized: boolean;
  lostHitPoint: boolean;
  roll: number;
};

export function resolveDyingState(
  combatant: Combatant,
  stabilizationRoll: number
): StabilizationResult {
  if (
    getHitPointState(combatant) !==
    "DYING"
  ) {
    return {
      combatant,
      stabilized: false,
      lostHitPoint: false,
      roll: stabilizationRoll
    };
  }

  if (
    stabilizationRoll >= 1 &&
    stabilizationRoll <= 10
  ) {
    const stabilizedCombatant =
      addCondition(
        combatant,
        { type: "STABLE" }
      );

    return {
      combatant: stabilizedCombatant,
      stabilized: true,
      lostHitPoint: false,
      roll: stabilizationRoll
    };
  }

  const updatedCombatant = {
    ...combatant,
    hp: combatant.hp - 1
  };

  return {
    combatant: updatedCombatant,
    stabilized: false,
    lostHitPoint: true,
    roll: stabilizationRoll
  };
}