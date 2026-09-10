import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import type { Combatant } from "../entities/Combatant";

import { GameEngine } from "./GameEngine";

import {
  applyDamage,
  canAct,
  getHitPointState,
  isDead
} from "../rules/ConditionRules";

import {
  canUseFullRoundAction,
  consumeFullRoundAction
} from "../rules/TurnRules";

import {
  canReceiveCoupDeGrace,
  resolveCoupDeGrace
} from "../rules/CoupDeGraceRules";

import {
  isWithinWeaponRange,
  getCombatDistance
} from "../rules/RangeRules";

import {
  getStrengthModifier
} from "../rules/DndRules";

import {
  rollD20,
  rollDice
} from "../Dice";

/**
 * Extensão do GameEngine para ações que ainda estão sendo
 * incorporadas ao núcleo de combate.
 *
 * O GameEngine continua responsável por todas as regras existentes;
 * esta classe apenas intercepta COUP_DE_GRACE e delega as demais ações
 * ao engine original.
 */
export class GameEngineCombatExtensions extends GameEngine {
  override executeAction(action: GameAction): ActionResult {
    if (action.type !== "COUP_DE_GRACE") {
      return super.executeAction(action);
    }

    return this.executeCoupDeGrace(action);
  }

  private executeCoupDeGrace(action: GameAction): ActionResult {
    const state = this.getState();

    if (state.mode === "EXPLORATION") {
      return {
        success: false,
        message: "Golpe de Misericórdia só pode ser usado em combate."
      };
    }

    const activeEntity = this.getActiveEntity();

    if (!activeEntity) {
      return {
        success: false,
        message: "Entidade ativa não encontrada."
      };
    }

    if (action.actorId !== activeEntity.id) {
      return {
        success: false,
        message: "Não é o turno desta entidade."
      };
    }

    if (!canAct(activeEntity)) {
      return {
        success: false,
        message: `${activeEntity.name} não pode realizar ações neste estado.`
      };
    }

    if (getHitPointState(activeEntity) === "DISABLED") {
      return {
        success: false,
        message: "Uma criatura DISABLED não pode realizar uma ação de rodada completa."
      };
    }

    if (!canUseFullRoundAction(state.turn)) {
      return {
        success: false,
        message: "O Golpe de Misericórdia requer a ação de rodada completa disponível."
      };
    }

    if (!action.targetId) {
      return {
        success: false,
        message: "Alvo não informado."
      };
    }

    const target = state.entities.find(
      entity => entity.id === action.targetId
    );

    if (!target) {
      return {
        success: false,
        message: "Alvo não encontrado."
      };
    }

    if (target.id === activeEntity.id) {
      return {
        success: false,
        message: "Uma entidade não pode executar Golpe de Misericórdia contra si mesma."
      };
    }

    if (isDead(target)) {
      return {
        success: false,
        message: "O alvo já está morto."
      };
    }

    if (!canReceiveCoupDeGrace(target)) {
      return {
        success: false,
        message: "O alvo não está indefeso ou é imune a acertos críticos."
      };
    }

    const weapon = activeEntity.dnd.equipment.weapon;

    if (!weapon) {
      return {
        success: false,
        message: "É necessário estar empunhando uma arma para executar Golpe de Misericórdia."
      };
    }

    const distance = getCombatDistance(activeEntity, target);

    // D&D 3.5 permite arma corpo a corpo em alcance normal ou
    // arco/besta somente quando o atacante está adjacente.
    if (!weapon.melee && distance > 1) {
      return {
        success: false,
        message: "Armas de ataque à distância só podem executar Golpe de Misericórdia contra um alvo adjacente."
      };
    }

    if (!isWithinWeaponRange(activeEntity, target)) {
      return {
        success: false,
        message: "O alvo está fora do alcance da arma."
      };
    }

    const damageRoll = rollDice(
      weapon.damageDice.count,
      weapon.damageDice.sides
    );

    const strengthModifier = getStrengthModifier(activeEntity);
    const baseDamage = Math.max(1, damageRoll + strengthModifier);
    const damage = baseDamage * weapon.criticalMultiplier;
    const targetAfterDamage = applyDamage(target, damage);

    const fortitudeRoll = rollD20();
    const coupResult = resolveCoupDeGrace(
      target,
      damage,
      targetAfterDamage,
      fortitudeRoll
    );

    if (!coupResult.success) {
      return {
        success: false,
        message: coupResult.message
      };
    }

    const targetAfterCoup: Combatant = coupResult.targetDied
      ? {
          ...targetAfterDamage,
          hp: -10
        }
      : targetAfterDamage;

    const nextTurn = consumeFullRoundAction(state.turn);

    let turnOrder = state.combat.turnOrder.filter(
      id => id !== target.id
    );

    const nextState = {
      ...state,
      entities: state.entities.map(entity =>
        entity.id === target.id
          ? targetAfterCoup
          : entity
      ),
      combat: {
        ...state.combat,
        turnOrder,
        currentTurnIndex:
          turnOrder.length > 0
            ? Math.min(state.combat.currentTurnIndex, turnOrder.length - 1)
            : 0
      },
      turn: nextTurn,
      logs: [
        ...state.logs,
        `${activeEntity.name} executou Golpe de Misericórdia contra ${target.name}.`,
        `Crítico automático: ${damage} de dano.`,
        coupResult.fortitude
          ? `Fortitude: ${fortitudeRoll} + ${coupResult.fortitude.bonus} = ${coupResult.fortitude.total} contra CD ${coupResult.fortitude.dc}.`
          : "",
        coupResult.message
      ].filter(Boolean)
    };

    this.setState(nextState);

    if (coupResult.targetDied) {
      if (turnOrder.length <= 1) {
        this.endCombat();
      }

      return {
        success: true,
        message: `${target.name} morreu pelo Golpe de Misericórdia.`,
        data: {
          damage,
          critical: true,
          targetId: target.id,
          targetDied: true
        }
      };
    }

    return {
      success: true,
      message: `${target.name} sobreviveu ao Golpe de Misericórdia.`,
      data: {
        damage,
        critical: true,
        targetId: target.id,
        targetDied: false
      }
    };
  }
}
