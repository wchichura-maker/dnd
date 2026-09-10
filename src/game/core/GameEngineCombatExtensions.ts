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
import { validateCharge, isStraightLinePath, getChargeMovement, validateRun, getRunMovement, validateWithdraw } from "../rules/CombatMovementRules";
import { getWithdrawAoOTransitions } from "../rules/WithdrawRules";
import type { CombatEndReason } from "../rules/CombatResolutionRules";
import { getCombatEndMessage } from "../rules/CombatResolutionRules";

export class GameEngineCombatExtensions extends GameEngine {
  private readonly opportunityAttacksUsed = new Set<string>();
  private readonly chargeAcPenaltyActive = new Set<string>();

  override startCombat(combatantIds?: string[]): ActionResult {
    this.opportunityAttacksUsed.clear();
    this.chargeAcPenaltyActive.clear();
    return super.startCombat(combatantIds);
  }

  override endCombat(): ActionResult {
    const state = this.getState();
    const restoredEntities = state.entities.map(entity => this.chargeAcPenaltyActive.has(entity.id)
      ? { ...entity, dnd: { ...entity.dnd, defense: { ...entity.dnd.defense, miscBonus: entity.dnd.defense.miscBonus + 2 } } }
      : entity);
    this.chargeAcPenaltyActive.clear();
    this.opportunityAttacksUsed.clear();
    this.setState({ ...state, entities: restoredEntities });
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
        if (result.success) this.setState({ ...this.getState(), logs: [...this.getState().logs, `${first.name} e ${second.name} entraram em combate automaticamente.`] });
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
    if (result.success) {
      const nextEntityId = this.getState().turn.characterId;
      if (this.chargeAcPenaltyActive.has(nextEntityId)) {
        const entity = this.getEntity(nextEntityId);
        if (entity) this.setState({ ...this.getState(), entities: this.getState().entities.map(item => item.id === nextEntityId ? { ...item, dnd: { ...item.dnd, defense: { ...item.dnd.defense, miscBonus: item.dnd.defense.miscBonus + 2 } } } : item), logs: [...this.getState().logs, `${entity.name}: penalidade de CA da investida terminou.`] });
        this.chargeAcPenaltyActive.delete(nextEntityId);
      }
    }
    return result;
  }

  override executeAction(action: GameAction): ActionResult {
    const automaticStart = this.startCombatForAction(action);
    if (automaticStart && !automaticStart.success) return automaticStart;
    if (action.type === "COUP_DE_GRACE") return this.executeCoupDeGrace(action);
    if (action.type === "CHARGE") return this.executeCharge(action);
    if (action.type === "WITHDRAW") return this.executeWithdraw(action);
    if (action.type === "RUN") return this.executeRun(action);
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

  private executeWithdraw(action: GameAction): ActionResult {
    const state = this.getState();
    if (state.mode !== "COMBAT") return { success: false, message: "Retirada só pode ser usada em combate." };
    const actor = this.getEntity(action.actorId);
    if (!actor) return { success: false, message: "Personagem não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Retirada requer a ação de rodada completa disponível." };
    if (!action.destination) return { success: false, message: "Destino da retirada não informado." };
    const validation = validateWithdraw(actor);
    if (!validation.valid) return { success: false, message: validation.message };
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return { success: false, message: "Retirada bloqueada: a casa de destino está ocupada." };
    const pathResult = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!pathResult) return { success: false, message: "Não existe caminho válido para a retirada." };
    if (pathResult.cost > validation.maxMovement) return { success: false, message: `Retirada excede o deslocamento máximo de ${validation.maxMovement} casas.` };
    if (pathResult.cost < 1) return { success: false, message: "A retirada exige deslocamento." };
    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y ? pathResult.path : [actor.position, ...pathResult.path];
    const originalTurn = state.turn;
    this.setState({ ...this.getState(), turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getWithdrawMovement(actor.movement) } } });
    const opportunityResult = this.resolveOpportunityAttacksForPath(action.actorId, steps, getWithdrawAoOTransitions(steps));
    if (opportunityResult) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunityResult;
    }
    const movementResult = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!movementResult.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Retirada falhou: ${movementResult.message}` };
    }
    const after = consumeFullRoundAction(this.getState().turn);
    this.setState({ ...this.getState(), turn: after, logs: [...this.getState().logs, `${actor.name} realizou RETIRADA e moveu ${pathResult.cost} casas.`] });
    return { success: true, message: `${actor.name} realizou uma RETIRADA.`, data: { withdraw: true, position: action.destination, distance: pathResult.cost } };
  }

  private executeRun(action: GameAction): ActionResult {
    const state = this.getState();
    if (state.mode !== "COMBAT") return { success: false, message: "Corrida só pode ser usada em combate." };
    const actor = this.getEntity(action.actorId);
    if (!actor) return { success: false, message: "Personagem não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Corrida requer a ação de rodada completa disponível." };
    if (!action.destination) return { success: false, message: "Destino da corrida não informado." };
    const validation = validateRun(actor);
    if (!validation.valid) return { success: false, message: validation.message };
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return { success: false, message: "Corrida bloqueada: a casa de destino está ocupada." };
    const pathResult = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!pathResult) return { success: false, message: "Não existe caminho válido para a corrida." };
    if (pathResult.cost < 1) return { success: false, message: "A corrida exige deslocamento." };
    if (pathResult.cost > validation.maxMovement) return { success: false, message: `Corrida excede o deslocamento máximo de ${validation.maxMovement} casas.` };
    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y ? pathResult.path : [actor.position, ...pathResult.path];
    if (!isStraightLinePath(steps)) return { success: false, message: "A corrida deve seguir uma linha reta." };
    const originalTurn = state.turn;
    this.setState({ ...this.getState(), turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getRunMovement(actor.movement) } } });
    const opportunityResult = this.resolveOpportunityAttacksForPath(action.actorId, steps);
    if (opportunityResult) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunityResult;
    }
    const movementResult = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!movementResult.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Corrida falhou: ${movementResult.message}` };
    }
    const after = consumeFullRoundAction(this.getState().turn);
    this.setState({ ...this.getState(), turn: after, logs: [...this.getState().logs, `${actor.name} realizou CORRIDA e moveu ${pathResult.cost} casas.`] });
    return { success: true, message: `${actor.name} realizou uma CORRIDA.`, data: { run: true, position: action.destination, distance: pathResult.cost } };
  }

  private resolveOpportunityAttacksForPath(actorId: string, steps: Array<{ x: number; y: number }>, allowedTransitions?: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; index: number }>): ActionResult | null {
    const state = this.getState();
    let actor = state.entities.find(entity => entity.id === actorId);
    if (!actor || !canAct(actor)) return null;
    const opportunityAttacks: NonNullable<NonNullable<ActionResult["data"]>["opportunityAttacks"]> = [];
    for (const defender of state.entities) {
      actor = this.getEntity(actorId);
      if (!actor || !canAct(actor)) {
        return { success: false, message: `${state.entities.find(entity => entity.id === actorId)?.name ?? actorId} não pode concluir o movimento após o ataque de oportunidade.`, data: { opportunityAttacks } };
      }
      if (defender.id === actor.id || isDead(defender) || !canAct(defender)) continue;
      if (this.opportunityAttacksUsed.has(defender.id)) continue;
      if (!this.isHostile(state, defender.id, actor.id)) continue;
      const weapon = defender.dnd.equipment.weapon;
      if (!weapon || !weapon.melee) continue;
      const transitions = allowedTransitions ?? steps.slice(0, -1).map((from, index) => ({ from, to: steps[index + 1], index }));
      const provokes = transitions.some(transition => this.distance(defender.position, transition.from) <= weapon.range && this.distance(defender.position, transition.to) > weapon.range);
      if (!provokes) continue;
      this.opportunityAttacksUsed.add(defender.id);
      const result = attack(defender, actor);
      const newHp = result.hit ? actor.hp - result.damage : actor.hp;
      const updatedActor = { ...actor, hp: newHp };
      opportunityAttacks.push({ attackerId: defender.id, targetId: actor.id, roll: result.roll, attackBonus: result.attackBonus, total: result.total, critical: result.critical, hit: result.hit, damage: result.damage, hpBefore: actor.hp, hpAfter: newHp });
      this.setState({ ...this.getState(), entities: this.getState().entities.map(entity => entity.id === actor.id ? updatedActor : entity), logs: [...this.getState().logs, `${defender.name} realizou um ATAQUE DE OPORTUNIDADE contra ${actor.name}.`, `D20: ${result.roll} + ${result.attackBonus} = ${result.total}.`, `CA de ${actor.name}: ${getArmorClass(actor)}.`, result.critical ? "CRÍTICO!" : "", result.hit ? `ACERTO. Dano: ${result.damage}. ${actor.name}: ${actor.hp} → ${newHp} HP.` : "ERRO.", `Estado de ${actor.name}: ${getHitPointState(updatedActor)}.`].filter(Boolean) });
      if (isDead(updatedActor)) {
        const combatEnded = this.shouldEndCombatAfterDeath();
        if (combatEnded) this.resolveCombat("DEATH");
        return { success: false, message: combatEnded ? `${actor.name} morreu por um ataque de oportunidade. ${getCombatEndMessage("DEATH")}` : `${actor.name} morreu por um ataque de oportunidade e não pode concluir o movimento.`, data: { opportunityAttacks, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined } };
      }
      if (!canAct(updatedActor)) {
        return { success: false, message: `${updatedActor.name} ficou ${getHitPointState(updatedActor)} após o ataque de oportunidade e não pode concluir o movimento.`, data: { opportunityAttacks, targetDied: false, targetState: getHitPointState(updatedActor) } };
      }
    }
    return null;
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
    if (opportunityResult) { this.setState({ ...this.getState(), turn: originalTurn }); return opportunityResult; }
    const movementResult = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!movementResult.success) { this.setState({ ...this.getState(), turn: originalTurn }); return { success: false, message: `Investida falhou: ${movementResult.message}` }; }
    const movedActor = this.getEntity(actor.id);
    const movedTarget = this.getEntity(target.id);
    if (!movedActor || !movedTarget) return { success: false, message: "Estado inválido após o movimento da investida." };
    const chargedActor: Combatant = { ...movedActor, dnd: { ...movedActor.dnd, defense: { ...movedActor.dnd.defense, miscBonus: movedActor.dnd.defense.miscBonus - 2 } } };
    this.setState({ ...this.getState(), entities: this.getState().entities.map(entity => entity.id === chargedActor.id ? chargedActor : entity) });
    this.chargeAcPenaltyActive.add(chargedActor.id);
    const attackResult = attack(chargedActor, movedTarget, { attackBonus: 2 });
    const targetAfterAttack = attackResult.hit ? applyDamage(movedTarget, attackResult.damage) : movedTarget;
    const turnAfterCharge = consumeFullRoundAction(this.getState().turn);
    const attackLog = [`${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}.`, `D20: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total}.`, `CA de ${movedTarget.name}: ${attackResult.targetArmorClass}.`, attackResult.critical ? "CRÍTICO!" : "", attackResult.hit ? `ACERTO. Dano: ${attackResult.damage}. ${movedTarget.name}: ${movedTarget.hp} → ${targetAfterAttack.hp} HP.` : "ERRO.", `Estado de ${movedTarget.name}: ${getHitPointState(targetAfterAttack)}.`, `${chargedActor.name} recebe -2 na CA até o início do próximo turno.`].filter(Boolean);
    this.setState({ ...this.getState(), entities: this.getState().entities.map(entity => entity.id === targetAfterAttack.id ? targetAfterAttack : entity), turn: turnAfterCharge, logs: [...this.getState().logs, ...attackLog] });
    if (isDead(targetAfterAttack)) {
      const combatEnded = this.shouldEndCombatAfterDeath();
      if (combatEnded) this.resolveCombat("DEATH");
      return { success: true, message: combatEnded ? `${movedTarget.name} morreu pela investida. ${getCombatEndMessage("DEATH")}` : `${movedTarget.name} morreu pela investida.`, data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: pathResult.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined } };
    }
    return { success: true, message: `${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}. ${attackResult.hit ? `Acerto por ${attackResult.total} contra CA ${attackResult.targetArmorClass}, causando ${attackResult.damage} de dano.` : `Errou o ataque (${attackResult.total} contra CA ${attackResult.targetArmorClass}).`}`, data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: pathResult.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetId: movedTarget.id } };
  }

  private shouldEndCombatAfterDeath(): boolean {
    const state = this.getState();
    const living = state.entities.filter(entity => !isDead(entity));
    for (let index = 0; index < living.length; index++) for (let otherIndex = index + 1; otherIndex < living.length; otherIndex++) if (this.isHostile(state, living[index].id, living[otherIndex].id)) return false;
    return true;
  }

  private isExplorationMode(): boolean {
    return this.getState().mode === "EXPLORATION";
  }

  private getActiveEntity(): Combatant | undefined {
    return this.getState().entities.find(entity => entity.id === this.getState().turn.characterId);
  }

  private isHostile(state: ReturnType<GameEngine["getState"]>, entityAId: string, entityBId: string): boolean {
    return state.relationships.some(relationship =>
      ((relationship.entityAId === entityAId && relationship.entityBId === entityBId) || (relationship.entityAId === entityBId && relationship.entityBId === entityAId)) && relationship.hostile
    );
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return getCombatDistance(a, b);
  }

  private resolveOpportunityAttacksBeforeMove(action: GameAction): ActionResult | null {
    if (this.getState().mode !== "COMBAT") return null;
    const actor = this.getEntity(action.actorId);
    if (!actor || !action.destination) return null;
    const pathResult = findPath(this.getState().map, this.getState().entities, actor.position, action.destination, actor.id);
    if (!pathResult) return null;
    const steps = pathResult.path.length > 0 && pathResult.path[0].x === actor.position.x && pathResult.path[0].y === actor.position.y ? pathResult.path : [actor.position, ...pathResult.path];
    return this.resolveOpportunityAttacksForPath(actor.id, steps);
  }

  private executeCoupDeGrace(action: GameAction): ActionResult {
    const state = this.getState();
    if (state.mode !== "COMBAT") return { success: false, message: "Golpe de misericórdia só pode ser usado em combate." };
    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (!actor || !target) return { success: false, message: "Atacante ou alvo não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Golpe de misericórdia requer a ação de rodada completa disponível." };
    if (!isWithinWeaponRange(actor, target)) return { success: false, message: "O alvo está fora de alcance." };
    const weapon = actor.dnd.equipment.weapon;
    if (!weapon || !weapon.melee) return { success: false, message: "Golpe de misericórdia requer arma corpo a corpo." };
    const validation = canReceiveCoupDeGrace(actor, target);
    if (!validation.valid) return { success: false, message: validation.message };
    const damageRoll = rollDice(weapon.damageDice ?? "1d8");
    const strengthBonus = getStrengthModifier(actor.dnd.abilities.strength);
    const damage = Math.max(1, damageRoll.total + strengthBonus);
    const fortitudeRoll = rollD20();
    const fortitudeBonus = target.dnd.abilities.constitution;
    const fortitude = fortitudeRoll + fortitudeBonus;
    const resolved = resolveCoupDeGrace(actor, target, damage, fortitudeRoll, fortitudeBonus);
    const targetAfter = resolved.target;
    const after = consumeFullRoundAction(state.turn);
    this.setState({ ...this.getState(), entities: this.getState().entities.map(entity => entity.id === targetAfter.id ? targetAfter : entity), turn: after, logs: [...this.getState().logs, `${actor.name} realizou um GOLPE DE MISERICÓRDIA contra ${target.name}.`, `Dano: ${damage}.`, `Fortitude: ${fortitudeRoll} + ${fortitudeBonus} = ${fortitude}. CD: ${resolved.dc}.`, resolved.instantDeath ? `${target.name} falhou no teste de Fortitude e morreu.` : `${target.name} sobreviveu ao golpe de misericórdia.`] });
    if (resolved.instantDeath || isDead(targetAfter)) {
      const combatEnded = this.shouldEndCombatAfterDeath();
      if (combatEnded) this.resolveCombat("DEATH");
      return { success: true, message: combatEnded ? `${target.name} morreu pelo golpe de misericórdia. ${getCombatEndMessage("DEATH")}` : `${target.name} morreu pelo golpe de misericórdia.`, data: { damageRoll, fortitudeRoll, fortitude, damage, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined } };
    }
    return { success: true, message: `${actor.name} realizou um GOLPE DE MISERICÓRDIA.`, data: { damageRoll, fortitudeRoll, fortitude, damage, targetDied: false } };
  }
}
