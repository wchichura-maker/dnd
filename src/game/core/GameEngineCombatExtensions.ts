import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import type { Combatant } from "../entities/Combatant";
import { GameEngine } from "./GameEngine";
import { applyDamage, canAct, getHitPointState, isDead } from "../rules/ConditionRules";
import { canUseFullRoundAction, consumeFullRoundAction, canUseMoveAction } from "../rules/TurnRules";
import { canReceiveCoupDeGrace, resolveCoupDeGrace } from "../rules/CoupDeGraceRules";
import { isWithinWeaponRange, getCombatDistance } from "../rules/RangeRules";
import { findPath } from "../rules/Pathfinding";
import { getStrengthModifier } from "../rules/DndRules";
import { attack } from "../CombatRules";
import { getArmorClass } from "../rules/DefenseRules";
import { getEntityAtPosition } from "../rules/OccupancyRules";
import { rollD20, rollDice } from "../Dice";

export class GameEngineCombatExtensions extends GameEngine {
  private readonly opportunityAttacksUsed = new Set<string>();

  override startCombat(combatantIds?: string[]): ActionResult {
    this.opportunityAttacksUsed.clear();
    return super.startCombat(combatantIds);
  }

  override endCombat(): ActionResult {
    this.opportunityAttacksUsed.clear();
    return super.endCombat();
  }

  override endTurn(): ActionResult {
    const before = this.getState();
    const lastIndex = before.combat.turnOrder.length - 1;
    const currentIndex = before.combat.currentTurnIndex;
    const result = super.endTurn();
    if (result.success && lastIndex >= 0 && currentIndex >= lastIndex) this.opportunityAttacksUsed.clear();
    return result;
  }

  override executeAction(action: GameAction): ActionResult {
    if (action.type === "COUP_DE_GRACE") return this.executeCoupDeGrace(action);
    if (action.type === "MOVE") {
      const opportunityResult = this.resolveOpportunityAttacksBeforeMove(action);
      if (opportunityResult) return opportunityResult;
    }
    return super.executeAction(action);
  }

  private resolveOpportunityAttacksBeforeMove(action: GameAction): ActionResult | null {
    const state = this.getState();
    if (state.mode !== "COMBAT" || !action.destination) return null;
    const actor = state.entities.find(entity => entity.id === action.actorId);
    if (!actor || !canAct(actor) || !canUseMoveAction(state.turn)) return null;
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return null;

    const pathResult = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!pathResult || pathResult.cost > state.turn.resources.movement) return null;

    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y
      ? pathResult.path
      : [actor.position, ...pathResult.path];

    const opportunityAttacks: NonNullable<NonNullable<ActionResult["data"]>["opportunityAttacks"]> = [];

    for (const defender of state.entities) {
      if (defender.id === actor.id || isDead(defender) || !canAct(defender)) continue;
      if (this.opportunityAttacksUsed.has(defender.id)) continue;
      if (!this.isHostile(state, defender.id, actor.id)) continue;

      const weapon = defender.dnd.equipment.weapon;
      if (!weapon || !weapon.melee) continue;

      const provokes = steps.slice(0, -1).some((from, index) => {
        const to = steps[index + 1];
        const before = this.distance(defender.position, from);
        const after = this.distance(defender.position, to);
        return before <= weapon.range && after > weapon.range;
      });
      if (!provokes) continue;

      this.opportunityAttacksUsed.add(defender.id);
      const result = attack(defender, actor);
      const newHp = result.hit ? actor.hp - result.damage : actor.hp;
      const updatedActor = { ...actor, hp: newHp };

      opportunityAttacks.push({
        attackerId: defender.id,
        targetId: actor.id,
        roll: result.roll,
        attackBonus: result.attackBonus,
        total: result.total,
        critical: result.critical,
        hit: result.hit,
        damage: result.damage,
        hpBefore: actor.hp,
        hpAfter: newHp
      });

      this.setState({
        ...this.getState(),
        entities: this.getState().entities.map(entity => entity.id === actor.id ? updatedActor : entity),
        logs: [
          ...this.getState().logs,
          `${defender.name} realizou um ATAQUE DE OPORTUNIDADE contra ${actor.name}.`,
          `D20: ${result.roll} + ${result.attackBonus} = ${result.total}.`,
          `CA de ${actor.name}: ${getArmorClass(actor)}.`,
          result.critical ? "CRÍTICO!" : "",
          result.hit ? `ACERTO. Dano: ${result.damage}. ${actor.name}: ${actor.hp} → ${newHp} HP.` : "ERRO.",
          `Estado de ${actor.name}: ${getHitPointState(updatedActor)}.`
        ].filter(Boolean)
      });

      if (isDead(updatedActor)) {
        return {
          success: false,
          message: `${actor.name} morreu por um ataque de oportunidade e não pode concluir o movimento.`,
          data: { opportunityAttacks, targetDied: true }
        };
      }
    }

    return null;
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const diagonal = Math.min(dx, dy);
    const straight = Math.max(dx, dy) - diagonal;
    return Math.floor(diagonal / 2) * 3 + (diagonal % 2) + straight;
  }

  private isHostile(state: ReturnType<GameEngine["getState"]>, firstId: string, secondId: string): boolean {
    return state.relationships.some(relationship =>
      ((relationship.entityAId === firstId && relationship.entityBId === secondId) ||
       (relationship.entityAId === secondId && relationship.entityBId === firstId)) && relationship.hostile
    );
  }

  private executeCoupDeGrace(action: GameAction): ActionResult {
    const state = this.getState();
    if (state.mode === "EXPLORATION") return { success: false, message: "Golpe de Misericórdia só pode ser usado em combate." };
    const activeEntity = this.getActiveEntity();
    if (!activeEntity) return { success: false, message: "Entidade ativa não encontrada." };
    if (action.actorId !== activeEntity.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(activeEntity)) return { success: false, message: `${activeEntity.name} não pode realizar ações neste estado.` };
    if (getHitPointState(activeEntity) === "DISABLED") return { success: false, message: "Uma criatura DISABLED não pode realizar uma ação de rodada completa." };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "O Golpe de Misericórdia requer a ação de rodada completa disponível." };
    if (!action.targetId) return { success: false, message: "Alvo não informado." };

    const target = state.entities.find(entity => entity.id === action.targetId);
    if (!target) return { success: false, message: "Alvo não encontrado." };
    if (target.id === activeEntity.id) return { success: false, message: "Uma entidade não pode executar Golpe de Misericórdia contra si mesma." };
    if (isDead(target)) return { success: false, message: "O alvo já está morto." };
    if (!canReceiveCoupDeGrace(target)) return { success: false, message: "O alvo não está indefeso ou é imune a acertos críticos." };

    const weapon = activeEntity.dnd.equipment.weapon;
    if (!weapon) return { success: false, message: "É necessário estar empunhando uma arma para executar Golpe de Misericórdia." };
    const distance = getCombatDistance(activeEntity, target);
    if (!weapon.melee && distance > 1) return { success: false, message: "Armas de ataque à distância só podem executar Golpe de Misericórdia contra um alvo adjacente." };
    if (!isWithinWeaponRange(activeEntity, target)) return { success: false, message: "O alvo está fora do alcance da arma." };

    const damageRoll = rollDice(weapon.damageDice.count, weapon.damageDice.sides);
    const strengthModifier = getStrengthModifier(activeEntity);
    const baseDamage = Math.max(1, damageRoll + strengthModifier);
    const damage = baseDamage * weapon.criticalMultiplier;
    const targetAfterDamage = applyDamage(target, damage);
    const fortitudeRoll = rollD20();
    const coupResult = resolveCoupDeGrace(target, damage, targetAfterDamage, fortitudeRoll);
    if (!coupResult.success) return { success: false, message: coupResult.message };

    const targetAfterCoup: Combatant = coupResult.targetDied ? { ...targetAfterDamage, hp: -10 } : targetAfterDamage;
    const nextTurn = consumeFullRoundAction(state.turn);
    const turnOrder = coupResult.targetDied ? state.combat.turnOrder.filter(id => id !== target.id) : state.combat.turnOrder;

    this.setState({
      ...state,
      entities: state.entities.map(entity => entity.id === target.id ? targetAfterCoup : entity),
      combat: { ...state.combat, turnOrder, currentTurnIndex: turnOrder.length > 0 ? Math.min(state.combat.currentTurnIndex, turnOrder.length - 1) : 0 },
      turn: nextTurn,
      logs: [
        ...state.logs,
        `${activeEntity.name} executou Golpe de Misericórdia contra ${target.name}.`,
        `Dano: ${damageRoll} + ${strengthModifier} = ${baseDamage} × ${weapon.criticalMultiplier} = ${damage}.`,
        `Fortitude: ${fortitudeRoll} + ${coupResult.fortitude?.bonus ?? 0} = ${coupResult.fortitude?.total ?? 0} contra CD ${coupResult.fortitude?.dc ?? 0}.`,
        coupResult.message
      ]
    });

    if (coupResult.targetDied && turnOrder.length <= 1) this.endCombat();
    return {
      success: true,
      message: coupResult.targetDied ? `${target.name} morreu pelo Golpe de Misericórdia.` : `${target.name} sobreviveu ao Golpe de Misericórdia.`,
      data: { damage, critical: true, targetId: target.id, targetDied: coupResult.targetDied, damageRoll, fortitudeRoll, fortitude: coupResult.fortitude }
    };
  }
}
