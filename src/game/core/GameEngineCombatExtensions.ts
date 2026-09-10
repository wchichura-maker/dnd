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
import { validateCharge, isStraightLinePath, getChargeMovement } from "../rules/CombatMovementRules";
import type { CombatEndReason } from "../rules/CombatResolutionRules";
import { getCombatEndMessage } from "../rules/CombatResolutionRules";

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

  ensureAutomaticCombat(): ActionResult | null {
    if (!this.isExplorationMode()) return null;
    const living = this.getState().entities.filter(entity => !isDead(entity) && canAct(entity));
    for (let index = 0; index < living.length; index++) {
      for (let otherIndex = index + 1; otherIndex < living.length; otherIndex++) {
        const first = living[index];
        const second = living[otherIndex];
        if (!this.isHostile(this.getState(), first.id, second.id)) continue;
        if (!this.canMeaningfullyAttack(first, second) && !this.canMeaningfullyAttack(second, first)) continue;
        const result = this.startCombat([first.id, second.id]);
        if (result.success) {
          this.setState({ ...this.getState(), logs: [...this.getState().logs, `${first.name} e ${second.name} entraram em combate automaticamente.`] });
        }
        return result;
      }
    }
    return null;
  }

  private isCombatInitiatingAction(action: GameAction): boolean {
    const type = String(action.type);
    return type === "ATTACK" || type === "DAMAGE" || type === "SPELL_DAMAGE" || type === "CAST_DAMAGE";
  }

  private startCombatForAction(action: GameAction): ActionResult | null {
    if (!this.isExplorationMode() || !this.isCombatInitiatingAction(action)) return null;
    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (!actor || !target || isDead(actor) || isDead(target)) return null;
    const result = this.startCombat([actor.id, target.id]);
    if (result.success) this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actor.name} iniciou o confronto ao realizar ${action.type}.`] });
    return result;
  }

  private canMeaningfullyAttack(attacker: Combatant, target: Combatant): boolean {
    const weapon = attacker.dnd.equipment.weapon;
    if (!weapon) return false;
    return isWithinWeaponRange(attacker, target);
  }

  resolveCombat(reason: CombatEndReason): ActionResult {
    if (this.isExplorationMode()) return { success: false, message: "O jogo já está em exploração." };
    const result = this.endCombat();
    if (!result.success) return result;
    this.setState({ ...this.getState(), logs: [...this.getState().logs, getCombatEndMessage(reason)] });
    return { ...result, message: getCombatEndMessage(reason), data: { combatEndReason: reason } };
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
    const automaticStart = this.startCombatForAction(action);
    if (automaticStart && !automaticStart.success) return automaticStart;
    if (action.type === "COUP_DE_GRACE") return this.executeCoupDeGrace(action);
    if (action.type === "CHARGE") return this.executeCharge(action);
    if (action.type === "MOVE") {
      const opportunityResult = this.resolveOpportunityAttacksBeforeMove(action);
      if (opportunityResult) return opportunityResult;
    }
    const result = super.executeAction(action);
    if (action.type === "ATTACK" && result.success && this.shouldEndCombatAfterDeath()) {
      const combatResult = this.resolveCombat("DEATH");
      return { ...result, message: `${result.message} ${combatResult.message}`, data: { ...(result.data ?? {}), combatEnded: true, combatEndReason: "DEATH" } };
    }
    return result;
  }

  private executeCharge(action: GameAction): ActionResult {
    const state = this.getState();
    if (state.mode !== "COMBAT") return { success: false, message: "Investida só pode ser usada em combate." };
    const actor = this.getEntity(action.actorId);
    if (!actor) return { success: false, message: "Atacante não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Investida requer a ação de rodada completa disponível." };
    if (!action.targetId) return { success: false, message: "Alvo não informado." };
    if (!action.destination) return { success: false, message: "Destino da investida não informado." };

    const target = this.getEntity(action.targetId);
    if (!target) return { success: false, message: "Alvo não encontrado." };
    if (target.id === actor.id) return { success: false, message: "Uma entidade não pode investir contra si mesma." };
    if (isDead(target)) return { success: false, message: `${target.name} está morto e não pode ser alvo da investida.` };

    const weapon = actor.dnd.equipment.weapon;
    if (!weapon || !weapon.melee) return { success: false, message: "Investida requer uma arma de ataque corpo a corpo." };

    const validation = validateCharge(actor, target);
    if (!validation.valid) return { success: false, message: validation.message };
    const occupyingEntity = getEntityAtPosition(action.destination, state.entities, actor.id);
    if (occupyingEntity) return { success: false, message: `Investida bloqueada. ${occupyingEntity.name} ocupa a casa de destino.` };

    const pathResult = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!pathResult) return { success: false, message: "Não existe caminho válido para a investida." };
    if (pathResult.cost < 2) return { success: false, message: "A investida exige pelo menos 10 pés de deslocamento." };
    if (pathResult.cost > validation.maxMovement) return { success: false, message: `Investida excede o deslocamento máximo de ${validation.maxMovement} casas.` };

    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y ? pathResult.path : [actor.position, ...pathResult.path];
    if (!isStraightLinePath(steps)) return { success: false, message: "A investida deve seguir uma linha reta sem contornar obstáculos." };

    const destinationEntity = { ...actor, position: action.destination };
    if (!isWithinWeaponRange(destinationEntity, target)) return { success: false, message: "A investida deve terminar em uma posição de onde o alvo possa ser atacado." };

    const originalTurn = state.turn;
    this.setState({ ...this.getState(), turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getChargeMovement(actor.movement) } } });

    const opportunityResult = this.resolveOpportunityAttacksBeforeMove({ ...action, type: "MOVE" });
    if (opportunityResult) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunityResult;
    }

    const movementResult = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!movementResult.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Investida falhou: ${movementResult.message}` };
    }

    const movedActor = this.getEntity(actor.id);
    const movedTarget = this.getEntity(target.id);
    if (!movedActor || !movedTarget) return { success: false, message: "Estado inválido após o movimento da investida." };

    const chargedActor: Combatant = {
      ...movedActor,
      dnd: {
        ...movedActor.dnd,
        defense: {
          ...movedActor.dnd.defense,
          miscBonus: movedActor.dnd.defense.miscBonus - 2
        }
      }
    };

    this.setState({
      ...this.getState(),
      entities: this.getState().entities.map(entity => entity.id === chargedActor.id ? chargedActor : entity)
    });

    const attackResult = attack(chargedActor, movedTarget, { attackBonus: 2 });
    const targetAfterAttack = attackResult.hit ? applyDamage(movedTarget, attackResult.damage) : movedTarget;
    const turnAfterCharge = consumeFullRoundAction(this.getState().turn);

    const attackLog = [
      `${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}.`,
      `D20: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total}.`,
      `CA de ${movedTarget.name}: ${attackResult.targetArmorClass}.`,
      attackResult.critical ? "CRÍTICO!" : "",
      attackResult.hit ? `ACERTO. Dano: ${attackResult.damage}. ${movedTarget.name}: ${movedTarget.hp} → ${targetAfterAttack.hp} HP.` : "ERRO.",
      `Estado de ${movedTarget.name}: ${getHitPointState(targetAfterAttack)}.`,
      `${chargedActor.name} recebe -2 na CA até o início do próximo turno.`
    ].filter(Boolean);

    this.setState({
      ...this.getState(),
      entities: this.getState().entities.map(entity => entity.id === targetAfterAttack.id ? targetAfterAttack : entity),
      turn: turnAfterCharge,
      logs: [...this.getState().logs, ...attackLog]
    });

    if (isDead(targetAfterAttack)) {
      const combatEnded = this.shouldEndCombatAfterDeath();
      if (combatEnded) this.resolveCombat("DEATH");
      return {
        success: true,
        message: combatEnded ? `${movedTarget.name} morreu pela investida. ${getCombatEndMessage("DEATH")}` : `${movedTarget.name} morreu pela investida.`,
        data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: pathResult.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined }
      };
    }

    return {
      success: true,
      message: `${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}. ${attackResult.hit ? `Acerto por ${attackResult.total} contra CA ${attackResult.targetArmorClass}, causando ${attackResult.damage} de dano.` : `Errou o ataque (${attackResult.total} contra CA ${attackResult.targetArmorClass}).`}`,
      data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: pathResult.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetId: movedTarget.id }
    };
  }

  private shouldEndCombatAfterDeath(): boolean {
    const state = this.getState();
    const living = state.entities.filter(entity => !isDead(entity));
    for (let index = 0; index < living.length; index++) {
      for (let otherIndex = index + 1; otherIndex < living.length; otherIndex++) {
        if (this.isHostile(state, living[index].id, living[otherIndex].id)) return false;
      }
    }
    return true;
  }

  private resolveOpportunityAttacksBeforeMove(action: GameAction): ActionResult | null {
    const state = this.getState();
    if (state.mode !== "COMBAT" || !action.destination) return null;
    const actor = state.entities.find(entity => entity.id === action.actorId);
    if (!actor || !canAct(actor) || !canUseMoveAction(state.turn)) return null;
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return null;
    const pathResult = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!pathResult || pathResult.cost > state.turn.resources.movement) return null;
    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y ? pathResult.path : [actor.position, ...pathResult.path];
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
      opportunityAttacks.push({ attackerId: defender.id, targetId: actor.id, roll: result.roll, attackBonus: result.attackBonus, total: result.total, critical: result.critical, hit: result.hit, damage: result.damage, hpBefore: actor.hp, hpAfter: newHp });
      this.setState({
        ...this.getState(),
        entities: this.getState().entities.map(entity => entity.id === actor.id ? updatedActor : entity),
        logs: [...this.getState().logs, `${defender.name} realizou um ATAQUE DE OPORTUNIDADE contra ${actor.name}.`, `D20: ${result.roll} + ${result.attackBonus} = ${result.total}.`, `CA de ${actor.name}: ${getArmorClass(actor)}.`, result.critical ? "CRÍTICO!" : "", result.hit ? `ACERTO. Dano: ${result.damage}. ${actor.name}: ${actor.hp} → ${newHp} HP.` : "ERRO.", `Estado de ${actor.name}: ${getHitPointState(updatedActor)}.`].filter(Boolean)
      });
      if (isDead(updatedActor)) {
        let combatEnded = false;
        if (this.shouldEndCombatAfterDeath()) {
          this.resolveCombat("DEATH");
          combatEnded = true;
        }
        return { success: false, message: combatEnded ? `${actor.name} morreu por um ataque de oportunidade. ${getCombatEndMessage("DEATH")}` : `${actor.name} morreu por um ataque de oportunidade e não pode concluir o movimento.`, data: { opportunityAttacks, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined } };
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
    return state.relationships.some(relationship => ((relationship.entityAId === firstId && relationship.entityBId === secondId) || (relationship.entityAId === secondId && relationship.entityBId === firstId)) && relationship.hostile);
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
      logs: [...state.logs, `${activeEntity.name} executou Golpe de Misericórdia contra ${target.name}.`, `Dano: ${damageRoll} + ${strengthModifier} = ${baseDamage} × ${weapon.criticalMultiplier} = ${damage}.`, `Fortitude: ${fortitudeRoll} + ${coupResult.fortitude?.bonus ?? 0} = ${coupResult.fortitude?.total ?? 0} contra CD ${coupResult.fortitude?.dc ?? 0}.`, coupResult.message]
    });
    if (coupResult.targetDied && this.shouldEndCombatAfterDeath()) this.resolveCombat("DEATH");
    return { success: true, message: coupResult.targetDied ? `${target.name} morreu pelo Golpe de Misericórdia.` : `${target.name} sobreviveu ao Golpe de Misericórdia.`, data: { damage, critical: true, targetId: target.id, targetDied: coupResult.targetDied, damageRoll, fortitudeRoll, fortitude: coupResult.fortitude, combatEnded: coupResult.targetDied && this.isExplorationMode(), combatEndReason: coupResult.targetDied && this.isExplorationMode() ? "DEATH" : undefined } };
  }
}
