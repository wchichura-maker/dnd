import type { Combatant } from "../entities/Combatant";

import {
  getHitPointState,
  hasCondition
} from "./ConditionRules";

import {
  resolveSavingThrow,
  type SavingThrowResult
} from "./SavingThrowRules";

/**
 * D&D 3.5: um alvo helpless está completamente à mercê
 * do oponente. Entre os estados que já existem no Core,
 * DYING e STABLE implicam inconsciência, assim como
 * UNCONSCIOUS, PARALYZED e PETRIFIED.
 */
export function isHelpless(
  combatant: Combatant
): boolean {
  const hpState = getHitPointState(combatant);

  if (
    hpState === "DYING" ||
    hpState === "STABLE"
  ) {
    return true;
  }

  return (
    hasCondition(combatant, "UNCONSCIOUS") ||
    hasCondition(combatant, "PARALYZED") ||
    hasCondition(combatant, "PETRIFIED") ||
    hasCondition(combatant, "HELPLESS")
  );
}

/**
 * Criaturas imunes a críticos não podem receber coup de grace.
 * O campo é opcional para manter compatibilidade com criaturas
 * já existentes no projeto.
 */
export function canReceiveCoupDeGrace(
  target: Combatant
): boolean {
  return (
    isHelpless(target) &&
    !target.immuneToCriticalHits
  );
}

export type CoupDeGraceResult = {
  success: boolean;
  targetDied: boolean;
  damage: number;
  fortitude?: SavingThrowResult;
  message: string;
};

/**
 * Resolve a parte específica do coup de grace que acontece
 * depois do dano crítico automático.
 *
 * D&D 3.5:
 * - o alvo deve sobreviver ao dano;
 * - então faz Fortitude CD 10 + dano causado;
 * - falha = morte imediata.
 */
export function resolveCoupDeGrace(
  target: Combatant,
  damage: number,
  targetAfterDamage: Combatant,
  fortitudeRoll: number
): CoupDeGraceResult {
  if (!canReceiveCoupDeGrace(target)) {
    return {
      success: false,
      targetDied: false,
      damage: 0,
      message: "O alvo não está indefeso ou é imune a acertos críticos."
    };
  }

  if (targetAfterDamage.hp <= -10) {
    return {
      success: true,
      targetDied: true,
      damage,
      message: "O alvo morreu pelo dano do Golpe de Misericórdia."
    };
  }

  const dc = 10 + damage;
  const fortitude = resolveSavingThrow(
    target,
    "FORTITUDE",
    dc,
    fortitudeRoll
  );

  return {
    success: true,
    targetDied: !fortitude.success,
    damage,
    fortitude,
    message: fortitude.success
      ? "O alvo sobreviveu ao Golpe de Misericórdia."
      : "O alvo falhou no teste de Fortitude e morreu pelo Golpe de Misericórdia."
  };
}
