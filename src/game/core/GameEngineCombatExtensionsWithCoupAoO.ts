import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { attack } from "../CombatRules";
import { applyDamage, canAct, getHitPointState, isDead } from "../rules/ConditionRules";
import { canUseFullRoundAction, canUseStandardAction, consumeFullRoundAction, consumeStandardAction } from "../rules/TurnRules";
import { getArmorClass } from "../rules/DefenseRules";
import { getCombatDistance } from "../rules/RangeRules";
import { getCombatEndMessage } from "../rules/CombatResolutionRules";
import { getSkillBonus, isDiplomacyEndCombatResult, resolveBluff, resolveDiplomacy, resolveIntimidate, resolveNegotiation, type DiplomacyAttitude } from "../rules/SocialRules";
import { rollDie } from "../Dice";
import { GameEngineCombatExtensions } from "./GameEngineCombatExtensions";

/** D&D 3.5: delivering a coup de grace provokes attacks of opportunity. */
export class GameEngineCombatExtensionsWithCoupAoO extends GameEngineCombatExtensions {
  private lastCoupOpportunityAttacks: NonNullable<NonNullable<ActionResult["data"]>["opportunityAttacks"]> = [];

  override executeAction(action: GameAction): ActionResult {
    if (["SURRENDER", "BLUFF", "DIPLOMACY", "INTIMIDATE", "NEGOTIATE"].includes(action.type)) {
      return this.executeSocialCombatAction(action);
    }

    if (action.type !== "COUP_DE_GRACE") return super.executeAction(action);

    const opportunity = this.resolveCoupDeGraceOpportunityAttacks(action.actorId);
    if (opportunity) return opportunity;

    const result = super.executeAction(action);
    if (!result.success || this.lastCoupOpportunityAttacks.length === 0) return result;

    return {
      ...result,
      data: {
        ...(result.data ?? {}),
        opportunityAttacks: this.lastCoupOpportunityAttacks
      }
    };
  }

  private executeSocialCombatAction(action: GameAction): ActionResult {
    if (!this.isCombatMode()) return { success: false, message: "Esta ação social só pode ser usada durante um combate." };

    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (!actor || !target) return { success: false, message: "Ator ou alvo não encontrado." };
    if (actor.id !== this.getActiveEntity()?.id) return { success: false, message: "Não é o turno desta entidade." };
    if (!canAct(actor)) return { success: false, message: `${actor.name} não pode realizar ações neste estado.` };

    if (action.type === "SURRENDER") {
      this.setState({
        ...this.getState(),
        relationships: this.getState().relationships.map(relationship =>
          this.relationshipContains(relationship, actor.id, target.id)
            ? { ...relationship, hostile: false, fear: relationship.fear + 1 }
            : relationship
        ),
        logs: [...this.getState().logs, `${actor.name} se rendeu a ${target.name}.`, getCombatEndMessage("SURRENDER")]
      });
      const ended = this.resolveCombat("SURRENDER");
      return {
        ...ended,
        message: `${actor.name} se rendeu. ${ended.message}`,
        data: { ...(ended.data ?? {}), combatEnded: ended.success, combatEndReason: ended.success ? "SURRENDER" : undefined, targetId: target.id }
      };
    }

    const targetRelationship = this.getState().relationships.find(relationship => this.relationshipContains(relationship, actor.id, target.id));
    if (!targetRelationship) return { success: false, message: "Não existe relação definida entre ator e alvo." };

    if (action.type === "INTIMIDATE") {
      if (!canUseStandardAction(this.getState().turn)) return { success: false, message: "Intimidar exige uma ação padrão disponível." };
      const roll = rollDie(20);
      const targetRoll = rollDie(20);
      const result = resolveIntimidate(actor, target, roll, targetRoll);
      const consumed = consumeStandardAction(this.getState().turn);
      this.setState({ ...this.getState(), turn: consumed });

      if (!result.success) {
        this.appendSocialLog(actor.name, target.name, `INTIMIDATE falhou: ${result.total} contra ${result.targetTotal}.`);
        return { success: true, message: `${actor.name} tentou intimidar ${target.name}, mas falhou.`, data: { targetId: target.id, socialCheck: result } };
      }

      this.setState({
        ...this.getState(),
        relationships: this.getState().relationships.map(relationship =>
          this.relationshipContains(relationship, actor.id, target.id)
            ? { ...relationship, hostile: false, fear: Math.min(100, relationship.fear + 20) }
            : relationship
        )
      });

      const ended = this.resolveCombat("INTIMIDATION");
      return {
        success: ended.success,
        message: `${actor.name} intimidou ${target.name}. ${ended.message}`,
        data: { targetId: target.id, socialCheck: result, combatEnded: ended.success, combatEndReason: ended.success ? "INTIMIDATION" : undefined }
      };
    }

    if (!canUseFullRoundAction(this.getState().turn)) return { success: false, message: "Esta interação social exige uma ação de rodada completa." };

    const roll = rollDie(20);
    const targetRoll = rollDie(20);
    let result: ReturnType<typeof resolveBluff> | ReturnType<typeof resolveDiplomacy> | ReturnType<typeof resolveNegotiation>;

    if (action.type === "BLUFF") {
      result = resolveBluff(actor, target, roll, targetRoll);
      this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });
      this.appendSocialLog(actor.name, target.name, `BLUFF: ${result.total} contra Sense Motive ${result.targetTotal}. ${result.success ? "SUCESSO" : "FALHA"}.`);
      return { success: true, message: result.success ? `${actor.name} enganou ${target.name}.` : `${actor.name} não conseguiu enganar ${target.name}.`, data: { targetId: target.id, socialCheck: result } };
    }

    if (action.type === "NEGOTIATE") {
      result = resolveNegotiation(actor, target, roll, targetRoll);
      this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });
      if (!result.success) {
        this.appendSocialLog(actor.name, target.name, `NEGOCIAÇÃO: ${result.total} contra ${result.targetTotal}. FALHA.`);
        return { success: true, message: `${actor.name} perdeu a negociação contra ${target.name}.`, data: { targetId: target.id, socialCheck: result } };
      }

      this.setState({
        ...this.getState(),
        relationships: this.getState().relationships.map(relationship =>
          this.relationshipContains(relationship, actor.id, target.id)
            ? { ...relationship, hostile: false, friendship: relationship.friendship + 10, trust: relationship.trust + 5 }
            : relationship
        )
      });
      const ended = this.resolveCombat("NEGOTIATION");
      return { success: ended.success, message: `${actor.name} venceu a negociação. ${ended.message}`, data: { targetId: target.id, socialCheck: result, combatEnded: ended.success, combatEndReason: ended.success ? "NEGOTIATION" : undefined } };
    }

    const initialAttitude = this.getDiplomacyAttitude(targetRelationship);
    result = resolveDiplomacy(actor, initialAttitude, roll, true);
    this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });

    if (!isDiplomacyEndCombatResult(result)) {
      this.appendSocialLog(actor.name, target.name, `DIPLOMACIA: ${result.total} contra DC ${result.dc}. Atitude permaneceu ${result.newAttitude}.`);
      return { success: true, message: `${actor.name} não conseguiu encerrar o confronto por Diplomacia.`, data: { targetId: target.id, socialCheck: { ...result, initialAttitude } } };
    }

    this.setState({
      ...this.getState(),
      relationships: this.getState().relationships.map(relationship =>
        this.relationshipContains(relationship, actor.id, target.id)
          ? { ...relationship, hostile: false, friendship: Math.min(100, relationship.friendship + 15), trust: Math.min(100, relationship.trust + 10) }
          : relationship
      )
    });

    const ended = this.resolveCombat("PERSUASION");
    return { success: ended.success, message: `${actor.name} alterou a atitude de ${target.name} para ${result.newAttitude}. ${ended.message}`, data: { targetId: target.id, socialCheck: { ...result, initialAttitude }, combatEnded: ended.success, combatEndReason: ended.success ? "PERSUASION" : undefined } };
  }

  private relationshipContains(relationship: { entityAId: string; entityBId: string }, a: string, b: string): boolean {
    return (relationship.entityAId === a && relationship.entityBId === b) || (relationship.entityAId === b && relationship.entityBId === a);
  }

  private getDiplomacyAttitude(relationship: { hostile: boolean; friendship: number }): DiplomacyAttitude {
    if (relationship.hostile) return "HOSTILE";
    if (relationship.friendship >= 60) return "HELPFUL";
    if (relationship.friendship >= 30) return "FRIENDLY";
    if (relationship.friendship >= 0) return "INDIFFERENT";
    return "UNFRIENDLY";
  }

  private appendSocialLog(actorName: string, targetName: string, message: string): void {
    this.setState({
      ...this.getState(),
      logs: [...this.getState().logs, `${actorName} → ${targetName}: ${message}`]
    });
  }

  private resolveCoupDeGraceOpportunityAttacks(actorId: string): ActionResult | null {
    this.lastCoupOpportunityAttacks = [];
    const state = this.getState();
    const actor = this.getEntity(actorId);
    if (!actor || !canAct(actor)) return null;

    const used = (this as unknown as { opportunityAttacksUsed: Set<string> }).opportunityAttacksUsed;

    for (const defender of state.entities) {
      const currentActor = this.getEntity(actorId);
      if (!currentActor || !canAct(currentActor)) {
        return {
          success: false,
          message: `${actor.name} não pode concluir o Golpe de Misericórdia após o ataque de oportunidade.`,
          data: { opportunityAttacks: this.lastCoupOpportunityAttacks }
        };
      }

      if (defender.id === actorId || isDead(defender) || !canAct(defender)) continue;
      if (used.has(defender.id)) continue;

      const hostile = state.relationships.some(item =>
        ((item.entityAId === defender.id && item.entityBId === actorId) ||
          (item.entityAId === actorId && item.entityBId === defender.id)) && item.hostile
      );
      if (!hostile) continue;

      const weapon = defender.dnd.equipment.weapon;
      if (!weapon || !weapon.melee) continue;
      if (getCombatDistance(defender, currentActor) > weapon.range) continue;

      used.add(defender.id);
      const attackResult = attack(defender, currentActor);
      const updatedActor = attackResult.hit
        ? applyDamage(currentActor, attackResult.damage)
        : currentActor;

      this.lastCoupOpportunityAttacks.push({
        attackerId: defender.id,
        targetId: actorId,
        roll: attackResult.roll,
        attackBonus: attackResult.attackBonus,
        total: attackResult.total,
        critical: attackResult.critical,
        hit: attackResult.hit,
        damage: attackResult.damage,
        hpBefore: currentActor.hp,
        hpAfter: updatedActor.hp
      });

      this.setState({
        ...this.getState(),
        entities: this.getState().entities.map(entity => entity.id === actorId ? updatedActor : entity),
        logs: [
          ...this.getState().logs,
          `${defender.name} realizou um ATAQUE DE OPORTUNIDADE contra ${currentActor.name} antes do GOLPE DE MISERICÓRDIA.`,
          `D20: ${attackResult.roll} + ${attackResult.attackBonus} = ${attackResult.total}.`,
          `CA de ${currentActor.name}: ${getArmorClass(currentActor)}.`,
          attackResult.critical ? "CRÍTICO!" : "",
          attackResult.hit ? `ACERTO. Dano: ${attackResult.damage}. ${currentActor.name}: ${currentActor.hp} → ${updatedActor.hp} HP.` : "ERRO.",
          `Estado de ${currentActor.name}: ${getHitPointState(updatedActor)}.`
        ].filter(Boolean)
      });

      if (isDead(updatedActor)) {
        const combatEnded = this.shouldEndCombatAfterDeathForCoup();
        if (combatEnded) this.resolveCombat("DEATH");
        return {
          success: false,
          message: combatEnded
            ? `${currentActor.name} morreu pelo ataque de oportunidade. ${getCombatEndMessage("DEATH")}`
            : `${currentActor.name} morreu pelo ataque de oportunidade e não pode realizar o Golpe de Misericórdia.`,
          data: {
            opportunityAttacks: this.lastCoupOpportunityAttacks,
            targetDied: true,
            combatEnded,
            combatEndReason: combatEnded ? "DEATH" : undefined
          }
        };
      }

      if (!canAct(updatedActor)) {
        return {
          success: false,
          message: `${updatedActor.name} ficou ${getHitPointState(updatedActor)} após o ataque de oportunidade e não pode realizar o Golpe de Misericórdia.`,
          data: {
            opportunityAttacks: this.lastCoupOpportunityAttacks,
            targetDied: false,
            targetState: getHitPointState(updatedActor)
          }
        };
      }
    }

    return null;
  }

  private shouldEndCombatAfterDeathForCoup(): boolean {
    const state = this.getState();
    const living = state.entities.filter(entity => !isDead(entity));
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const hostile = state.relationships.some(relationship =>
          ((relationship.entityAId === living[i].id && relationship.entityBId === living[j].id) ||
            (relationship.entityAId === living[j].id && relationship.entityBId === living[i].id)) && relationship.hostile
        );
        if (hostile) return false;
      }
    }
    return true;
  }
}
