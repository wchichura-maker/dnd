import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { attack } from "../CombatRules";
import { applyDamage, canAct, getHitPointState, isDead } from "../rules/ConditionRules";
import { getArmorClass } from "../rules/DefenseRules";
import { getCombatDistance } from "../rules/RangeRules";
import { getCombatEndMessage } from "../rules/CombatResolutionRules";
import { GameEngineCombatExtensions } from "./GameEngineCombatExtensions";

/** D&D 3.5: delivering a coup de grace provokes attacks of opportunity. */
export class GameEngineCombatExtensionsWithCoupAoO extends GameEngineCombatExtensions {
  private lastCoupOpportunityAttacks: NonNullable<NonNullable<ActionResult["data"]>["opportunityAttacks"]> = [];

  override executeAction(action: GameAction): ActionResult {
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

  private resolveCoupDeGraceOpportunityAttacks(actorId: string): ActionResult | null {
    this.lastCoupOpportunityAttacks = [];
    const state = this.getState();
    const actor = this.getEntity(actorId);
    if (!actor || !canAct(actor)) return null;

    // Reuse the base extension's per-round AoO registry so a defender cannot
    // make a second AoO during the same round.
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
