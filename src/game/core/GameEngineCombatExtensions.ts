import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import type { Combatant } from "../entities/Combatant";
import { GameEngine } from "./GameEngine";
import { applyDamage, canAct, getHitPointState, isDead } from "../rules/ConditionRules";
import { canUseFullRoundAction, consumeFullRoundAction } from "../rules/TurnRules";
import { canReceiveCoupDeGrace, resolveCoupDeGrace } from "../rules/CoupDeGraceRules";
import { isWithinWeaponRange, getCombatDistance } from "../rules/RangeRules";
import { findPath } from "../rules/Pathfinding";
import { getStrengthModifier } from "../rules/DndRules";
import { attack } from "../CombatRules";
import { getArmorClass } from "../rules/DefenseRules";
import { getEntityAtPosition } from "../rules/OccupancyRules";
import { rollD20, rollDice } from "../Dice";
import { validateCharge, isStraightLinePath, getChargeMovement, validateRun, getRunMovement, validateWithdraw, getWithdrawMovement } from "../rules/CombatMovementRules";
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
    const restoredEntities = state.entities.map(entity =>
      this.chargeAcPenaltyActive.has(entity.id)
        ? { ...entity, dnd: { ...entity.dnd, defense: { ...entity.dnd.defense, miscBonus: entity.dnd.defense.miscBonus + 2 } } }
        : entity
    );
    this.chargeAcPenaltyActive.clear();
    this.opportunityAttacksUsed.clear();
    this.setState({ ...state, entities: restoredEntities });
    return super.endCombat();
  }

  ensureAutomaticCombat(): ActionResult | null {
    if (!this.isExplorationMode()) return null;
    const living = this.getState().entities.filter(entity => !isDead(entity) && canAct(entity));
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i];
        const b = living[j];
        if (!this.isHostile(this.getState(), a.id, b.id)) continue;
        if (!this.canMeaningfullyAttack(a, b) && !this.canMeaningfullyAttack(b, a)) continue;
        const result = this.startCombat([a.id, b.id]);
        if (result.success) {
          this.setState({ ...this.getState(), logs: [...this.getState().logs, `${a.name} e ${b.name} entraram em combate automaticamente.`] });
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
    if (result.success) {
      this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actor.name} iniciou o confronto ao realizar ${action.type}.`] });
    }
    return result;
  }

  private canMeaningfullyAttack(attacker: Combatant, target: Combatant): boolean {
    const weapon = attacker.dnd.equipment.weapon;
    return !!weapon && isWithinWeaponRange(attacker, target);
  }

  resolveCombat(reason: CombatEndReason): ActionResult {
    if (this.isExplorationMode()) return { success: false, message: "O jogo já está em exploração." };
    const result = this.endCombat();
    if (!result.success) return result;
    const message = getCombatEndMessage(reason);
    this.setState({ ...this.getState(), logs: [...this.getState().logs, message] });
    return { ...result, message, data: { combatEndReason: reason } };
  }

  override endTurn(): ActionResult {
    const before = this.getState();
    const lastIndex = before.combat.turnOrder.length - 1;
    const currentIndex = before.combat.currentTurnIndex;
    const result = super.endTurn();
    if (result.success && lastIndex >= 0 && currentIndex >= lastIndex) this.opportunityAttacksUsed.clear();
    if (result.success) {
      const id = this.getState().turn.characterId;
      if (this.chargeAcPenaltyActive.has(id)) {
        const entity = this.getEntity(id);
        if (entity) {
          this.setState({
            ...this.getState(),
            entities: this.getState().entities.map(item =>
              item.id === id
                ? { ...item, dnd: { ...item.dnd, defense: { ...item.dnd.defense, miscBonus: item.dnd.defense.miscBonus + 2 } } }
                : item
            ),
            logs: [...this.getState().logs, `${entity.name}: penalidade de CA da investida terminou.`]
          });
        }
        this.chargeAcPenaltyActive.delete(id);
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
      const opportunity = this.resolveOpportunityAttacksBeforeMove(action);
      if (opportunity) return opportunity;
    }

    const result = super.executeAction(action);
    if (action.type === "ATTACK" && result.success && this.shouldEndCombatAfterDeath()) {
      const combatEnd = this.resolveCombat("DEATH");
      return {
        ...result,
        message: `${result.message} ${combatEnd.message}`,
        data: { ...(result.data ?? {}), combatEnded: true, combatEndReason: "DEATH" }
      };
    }
    return result;
  }

  private executeWithdraw(action: GameAction): ActionResult {
    const state = this.getState();
    const actor = this.getEntity(action.actorId);
    if (state.mode !== "COMBAT") return { success: false, message: "Retirada só pode ser usada em combate." };
    if (!actor) return { success: false, message: "Personagem não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Retirada requer a ação de rodada completa disponível." };
    if (!action.destination) return { success: false, message: "Destino da retirada não informado." };

    const validation = validateWithdraw(actor);
    if (!validation.valid) return { success: false, message: validation.message };
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return { success: false, message: "Retirada bloqueada: a casa de destino está ocupada." };

    const path = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!path) return { success: false, message: "Não existe caminho válido para a retirada." };
    if (path.cost > validation.maxMovement) return { success: false, message: `Retirada excede o deslocamento máximo de ${validation.maxMovement} casas.` };
    if (path.cost < 1) return { success: false, message: "A retirada exige deslocamento." };

    const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
      ? path.path
      : [actor.position, ...path.path];
    const originalTurn = state.turn;
    this.setState({
      ...this.getState(),
      turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getWithdrawMovement(actor.movement) } }
    });

    const opportunity = this.resolveOpportunityAttacksForPath(action.actorId, steps, getWithdrawAoOTransitions(steps));
    if (opportunity) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunity;
    }

    const move = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!move.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Retirada falhou: ${move.message}` };
    }

    const after = consumeFullRoundAction(this.getState().turn);
    this.setState({
      ...this.getState(),
      turn: after,
      logs: [...this.getState().logs, `${actor.name} realizou RETIRADA e moveu ${path.cost} casas.`]
    });
    return { success: true, message: `${actor.name} realizou uma RETIRADA.`, data: { withdraw: true, position: action.destination, distance: path.cost } };
  }

  private executeRun(action: GameAction): ActionResult {
    const state = this.getState();
    const actor = this.getEntity(action.actorId);
    if (state.mode !== "COMBAT") return { success: false, message: "Corrida só pode ser usada em combate." };
    if (!actor) return { success: false, message: "Personagem não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Corrida requer a ação de rodada completa disponível." };
    if (!action.destination) return { success: false, message: "Destino da corrida não informado." };

    const validation = validateRun(actor);
    if (!validation.valid) return { success: false, message: validation.message };
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return { success: false, message: "Corrida bloqueada: a casa de destino está ocupada." };

    const path = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!path) return { success: false, message: "Não existe caminho válido para a corrida." };
    if (path.cost < 1) return { success: false, message: "A corrida exige deslocamento." };
    if (path.cost > validation.maxMovement) return { success: false, message: `Corrida excede o deslocamento máximo de ${validation.maxMovement} casas.` };

    const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
      ? path.path
      : [actor.position, ...path.path];
    if (!isStraightLinePath(steps)) return { success: false, message: "A corrida deve seguir uma linha reta." };

    const originalTurn = state.turn;
    this.setState({
      ...this.getState(),
      turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getRunMovement(actor.movement) } }
    });

    const opportunity = this.resolveOpportunityAttacksForPath(action.actorId, steps);
    if (opportunity) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunity;
    }

    const move = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!move.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Corrida falhou: ${move.message}` };
    }

    const after = consumeFullRoundAction(this.getState().turn);
    this.setState({
      ...this.getState(),
      turn: after,
      logs: [...this.getState().logs, `${actor.name} realizou CORRIDA e moveu ${path.cost} casas.`]
    });
    return { success: true, message: `${actor.name} realizou uma CORRIDA.`, data: { run: true, position: action.destination, distance: path.cost } };
  }

  private resolveOpportunityAttacksForPath(
    actorId: string,
    steps: Array<{ x: number; y: number }>,
    allowedTransitions?: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; index: number }>
  ): ActionResult | null {
    const state = this.getState();
    let actor = state.entities.find(entity => entity.id === actorId);
    if (!actor || !canAct(actor)) return null;

    const opportunityAttacks: NonNullable<NonNullable<ActionResult["data"]>["opportunityAttacks"]> = [];

    for (const defender of state.entities) {
      actor = this.getEntity(actorId);
      if (!actor || !canAct(actor)) {
        return {
          success: false,
          message: `${state.entities.find(entity => entity.id === actorId)?.name ?? actorId} não pode concluir o movimento após o ataque de oportunidade.`,
          data: { opportunityAttacks }
        };
      }
      if (defender.id === actor.id || isDead(defender) || !canAct(defender)) continue;
      if (this.opportunityAttacksUsed.has(defender.id)) continue;
      if (!this.isHostile(state, defender.id, actor.id)) continue;

      const weapon = defender.dnd.equipment.weapon;
      if (!weapon || !weapon.melee) continue;

      const transitions = allowedTransitions ?? steps.slice(0, -1).map((from, index) => ({ from, to: steps[index + 1], index }));
      if (!transitions.some(transition => this.distance(defender.position, transition.from) <= weapon.range && this.distance(defender.position, transition.to) > weapon.range)) continue;

      this.opportunityAttacksUsed.add(defender.id);
      const attackResult = attack(defender, actor);
      const newHp = attackResult.hit ? actor.hp - attackResult.damage : actor.hp;
      const updatedActor = { ...actor, hp: newHp };

      opportunityAttacks.push({
        attackerId: defender.id,
        targetId: actor.id,
        roll: attackResult.roll,
        attackBonus: attackResult.attackBonus,
        total: attackResult.total,
        critical: attackResult.critical,
        hit: attackResult.hit,
        damage: attackResult.damage,
        hpBefore: actor.hp,
        hpAfter: newHp
      });

      this.setState({
        ...this.getState(),
        entities: this.getState().entities.map(entity => entity.id === actor.id ? updatedActor : entity),
        logs: [
          ...this.getState().logs,
          `${defender.name} realizou um ATAQUE DE OPORTUNIDADE contra ${actor.name}.`,
          `D20: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total}.`,
          `CA de ${actor.name}: ${getArmorClass(actor)}.`,
          attackResult.critical ? "CRÍTICO!" : "",
          attackResult.hit ? `ACERTO. Dano: ${attackResult.damage}. ${actor.name}: ${actor.hp} → ${newHp} HP.` : "ERRO.",
          `Estado de ${actor.name}: ${getHitPointState(updatedActor)}.`
        ].filter(Boolean)
      });

      if (isDead(updatedActor)) {
        const combatEnded = this.shouldEndCombatAfterDeath();
        if (combatEnded) this.resolveCombat("DEATH");
        return {
          success: false,
          message: combatEnded
            ? `${actor.name} morreu por um ataque de oportunidade. ${getCombatEndMessage("DEATH")}`
            : `${actor.name} morreu por um ataque de oportunidade e não pode concluir o movimento.`,
          data: { opportunityAttacks, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined }
        };
      }

      if (!canAct(updatedActor)) {
        return {
          success: false,
          message: `${updatedActor.name} ficou ${getHitPointState(updatedActor)} após o ataque de oportunidade e não pode concluir o movimento.`,
          data: { opportunityAttacks, targetDied: false, targetState: getHitPointState(updatedActor) }
        };
      }
    }

    return null;
  }

  private executeCharge(action: GameAction): ActionResult {
    const state = this.getState();
    const actor = this.getEntity(action.actorId);
    if (state.mode !== "COMBAT") return { success: false, message: "Investida só pode ser usada em combate." };
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
    if (getEntityAtPosition(action.destination, state.entities, actor.id)) return { success: false, message: "Investida bloqueada. A casa de destino está ocupada." };

    const path = findPath(state.map, state.entities, actor.position, action.destination, actor.id);
    if (!path) return { success: false, message: "Não existe caminho válido para a investida." };
    if (path.cost < 2) return { success: false, message: "A investida exige pelo menos 10 pés de deslocamento." };
    if (path.cost > validation.maxMovement) return { success: false, message: `Investida excede o deslocamento máximo de ${validation.maxMovement} casas.` };

    const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
      ? path.path
      : [actor.position, ...path.path];
    if (!isStraightLinePath(steps)) return { success: false, message: "A investida deve seguir uma linha reta sem contornar obstáculos." };

    const destinationEntity = { ...actor, position: action.destination };
    if (!isWithinWeaponRange(destinationEntity, target)) return { success: false, message: "A investida deve terminar em uma posição de onde o alvo possa ser atacado." };

    const originalTurn = state.turn;
    this.setState({
      ...this.getState(),
      turn: { ...this.getState().turn, resources: { ...this.getState().turn.resources, movement: getChargeMovement(actor.movement) } }
    });

    const opportunity = this.resolveOpportunityAttacksBeforeMove({ ...action, type: "MOVE" });
    if (opportunity) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return opportunity;
    }

    const move = super.executeAction({ type: "MOVE", actorId: actor.id, destination: action.destination });
    if (!move.success) {
      this.setState({ ...this.getState(), turn: originalTurn });
      return { success: false, message: `Investida falhou: ${move.message}` };
    }

    const movedActor = this.getEntity(actor.id);
    const movedTarget = this.getEntity(target.id);
    if (!movedActor || !movedTarget) return { success: false, message: "Estado inválido após o movimento da investida." };

    const chargedActor = {
      ...movedActor,
      dnd: { ...movedActor.dnd, defense: { ...movedActor.dnd.defense, miscBonus: movedActor.dnd.defense.miscBonus - 2 } }
    };
    this.setState({ ...this.getState(), entities: this.getState().entities.map(entity => entity.id === chargedActor.id ? chargedActor : entity) });
    this.chargeAcPenaltyActive.add(chargedActor.id);

    const attackResult = attack(chargedActor, movedTarget, { attackBonus: 2 });
    const targetAfterAttack = attackResult.hit ? applyDamage(movedTarget, attackResult.damage) : movedTarget;
    const turnAfterCharge = consumeFullRoundAction(this.getState().turn);
    const attackLog = [
      `${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}.`,
      `D20: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total}.`,
      `CA de ${movedTarget.name}: ${attackResult.targetArmorClass}.`,
      attackResult.critical ? "CRÍTICO!" : "",
      attackResult.hit ? `ACERTO. Dano: ${attackResult.damage}. ${movedTarget.name}: ${movedTarget.hp} → ${targetAfterAttack.hp} HP.` : "ERRO.",
      `Estado de ${getHitPointState(targetAfterAttack)}.`,
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
        data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: path.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined }
      };
    }

    return {
      success: true,
      message: `${chargedActor.name} realizou uma INVESTIDA contra ${movedTarget.name}. ${attackResult.hit ? `Acerto por ${attackResult.total} contra CA ${attackResult.targetArmorClass}, causando ${attackResult.damage} de dano.` : `Errou o ataque (${attackResult.total} contra CA ${attackResult.targetArmorClass}).`}`,
      data: { charge: true, chargeAttackBonus: 2, chargeAcPenalty: -2, position: action.destination, distance: path.cost, damage: attackResult.damage, roll: attackResult.roll, attackBonus: attackResult.attackBonus, total: attackResult.total, targetId: movedTarget.id }
    };
  }

  private shouldEndCombatAfterDeath(): boolean {
    const state = this.getState();
    const living = state.entities.filter(entity => !isDead(entity));
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        if (this.isHostile(state, living[i].id, living[j].id)) return false;
      }
    }
    return true;
  }

  private isExplorationMode(): boolean {
    return this.getState().mode === "EXPLORATION";
  }

  private getActiveEntity(): Combatant | undefined {
    return this.getState().entities.find(entity => entity.id === this.getState().turn.characterId);
  }

  private isHostile(state: ReturnType<GameEngine["getState"]>, a: string, b: string): boolean {
    return state.relationships.some(relationship =>
      ((relationship.entityAId === a && relationship.entityBId === b) || (relationship.entityAId === b && relationship.entityBId === a)) && relationship.hostile
    );
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const diagonal = Math.min(dx, dy);
    const straight = Math.max(dx, dy) - diagonal;
    return Math.floor(diagonal / 2) * 3 + (diagonal % 2) + straight;
  }

  private resolveOpportunityAttacksBeforeMove(action: GameAction): ActionResult | null {
    if (this.getState().mode !== "COMBAT") return null;
    const actor = this.getEntity(action.actorId);
    if (!actor || !action.destination) return null;
    const path = findPath(this.getState().map, this.getState().entities, actor.position, action.destination, actor.id);
    if (!path) return null;
    const steps = path.path.length && path.path[0].x === actor.position.x && path.path[0].y === actor.position.y
      ? path.path
      : [actor.position, ...path.path];
    return this.resolveOpportunityAttacksForPath(actor.id, steps);
  }

  private executeCoupDeGrace(action: GameAction): ActionResult {
    const state = this.getState();
    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (state.mode !== "COMBAT") return { success: false, message: "Golpe de misericórdia só pode ser usado em combate." };
    if (!actor || !target) return { success: false, message: "Atacante ou alvo não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };
    if (!canUseFullRoundAction(state.turn)) return { success: false, message: "Golpe de misericórdia requer a ação de rodada completa disponível." };
    if (!isWithinWeaponRange(actor, target)) return { success: false, message: "O alvo está fora de alcance." };
    const weapon = actor.dnd.equipment.weapon;
    if (!weapon || !weapon.melee) return { success: false, message: "Golpe de misericórdia requer arma corpo a corpo." };
    if (!canReceiveCoupDeGrace(target)) return { success: false, message: "O alvo não está indefeso ou é imune a acertos críticos." };

    const damageRoll = rollDice(weapon.damageDice ?? "1d8");
    const strengthBonus = getStrengthModifier(actor);
    const damage = Math.max(1, damageRoll.total + strengthBonus);
    const targetAfterDamage = applyDamage(target, damage);
    const fortitudeRoll = rollD20();
    const resolved = resolveCoupDeGrace(target, damage, targetAfterDamage, fortitudeRoll);
    if (!resolved.success) return { success: false, message: resolved.message };

    const finalTarget: Combatant = resolved.targetDied ? { ...targetAfterDamage, hp: -10 } : targetAfterDamage;
    const after = consumeFullRoundAction(state.turn);
    const fortitude = resolved.fortitude;
    const fortitudeTotal = fortitude?.total ?? fortitudeRoll;
    const fortitudeBonus = fortitude ? fortitude.total - fortitude.roll : 0;

    this.setState({
      ...this.getState(),
      entities: this.getState().entities.map(entity => entity.id === finalTarget.id ? finalTarget : entity),
      turn: after,
      logs: [
        ...this.getState().logs,
        `${actor.name} realizou um GOLPE DE MISERICÓRDIA contra ${target.name}.`,
        `Dano: ${damage}.`,
        `Fortitude: ${fortitudeRoll} + ${fortitudeBonus} = ${fortitudeTotal}. CD: ${10 + damage}.`,
        resolved.message
      ]
    });

    if (resolved.targetDied || isDead(finalTarget)) {
      const combatEnded = this.shouldEndCombatAfterDeath();
      if (combatEnded) this.resolveCombat("DEATH");
      return {
        success: true,
        message: combatEnded ? `${target.name} morreu pelo golpe de misericórdia. ${getCombatEndMessage("DEATH")}` : `${target.name} morreu pelo golpe de misericórdia.`,
        data: { damageRoll, fortitudeRoll, fortitude: fortitudeTotal, damage, targetDied: true, combatEnded, combatEndReason: combatEnded ? "DEATH" : undefined }
      };
    }

    return {
      success: true,
      message: `${actor.name} realizou um GOLPE DE MISERICÓRDIA.`,
      data: { damageRoll, fortitudeRoll, fortitude: fortitudeTotal, damage, targetDied: false }
    };
  }
}
