import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { canAct } from "../rules/ConditionRules";
import { canUseFullRoundAction, canUseStandardAction, consumeFullRoundAction, consumeStandardAction } from "../rules/TurnRules";
import { rollDie } from "../Dice";
import { isDiplomacyEndCombatResult, resolveBluff, resolveDiplomacy, resolveIntimidate, resolveNegotiation } from "../rules/SocialRules";
import { GameEngineEncounterWithFlee } from "./GameEngineEncounterWithFlee";

/** Contextual interaction layer for ENCOUNTER. */
export class GameEngineEncounterActions extends GameEngineEncounterWithFlee {
  override executeAction(action: GameAction): ActionResult {
    if (action.type === "TALK") return this.executeTalk(action);
    if (action.type === "OBSERVE") return this.executeObserve(action);
    if (["BLUFF", "DIPLOMACY", "INTIMIDATE", "NEGOTIATE"].includes(action.type) && this.isEncounterMode()) return this.executeEncounterSocial(action);
    if (action.type === "ATTACK" && this.isEncounterMode()) {
      const combat = this.startCombat(this.getState().encounter?.participantIds);
      if (!combat.success) return combat;
    }
    return super.executeAction(action);
  }

  private executeEncounterSocial(action: GameAction): ActionResult {
    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    const participants = this.getState().encounter?.participantIds ?? [];
    if (!actor || !target) return { success: false, message: "Ator ou alvo não encontrado." };
    if (!participants.includes(actor.id) || !participants.includes(target.id)) return { success: false, message: "Ator ou alvo não participa deste encontro." };
    if (!canAct(actor) || actor.hp <= -10 || target.hp <= -10) return { success: false, message: "Ator ou alvo não pode participar da interação." };
    const relationship = this.getState().relationships.find(item => this.relationshipContains(item, actor.id, target.id));
    if (!relationship) return { success: false, message: "Não existe relação definida entre ator e alvo." };

    if (action.type === "INTIMIDATE") {
      if (!canUseStandardAction(this.getState().turn)) return { success: false, message: "Intimidar exige uma ação padrão disponível." };
      const roll = rollDie(20);
      const targetRoll = rollDie(20);
      const result = resolveIntimidate(actor, target, roll, targetRoll);
      this.setState({ ...this.getState(), turn: consumeStandardAction(this.getState().turn) });
      if (result.success) {
        this.setState({ ...this.getState(), relationships: this.getState().relationships.map(item => this.relationshipContains(item, actor.id, target.id) ? { ...item, fear: Math.min(100, item.fear + 20), hostile: false } : item) });
      }
      this.appendSocialLog(actor.name, target.name, `INTIMIDATE: ${result.total} contra ${result.targetTotal}. ${result.success ? "SUCESSO" : "FALHA"}.`);
      return { success: true, message: result.success ? `${actor.name} intimidou ${target.name}.` : `${actor.name} tentou intimidar ${target.name}, mas falhou.`, data: { phase: "ENCOUNTER", targetId: target.id, socialCheck: result, combatEnded: false } };
    }

    if (!canUseFullRoundAction(this.getState().turn)) return { success: false, message: "Esta interação social exige uma ação de rodada completa." };
    const roll = rollDie(20);
    const targetRoll = rollDie(20);

    if (action.type === "BLUFF") {
      const result = resolveBluff(actor, target, roll, targetRoll);
      this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });
      this.appendSocialLog(actor.name, target.name, `BLUFF: ${result.total} contra Sense Motive ${result.targetTotal}. ${result.success ? "SUCESSO" : "FALHA"}.`);
      return { success: true, message: result.success ? `${actor.name} enganou ${target.name}.` : `${actor.name} não conseguiu enganar ${target.name}.`, data: { phase: "ENCOUNTER", targetId: target.id, socialCheck: result, combatEnded: false } };
    }

    if (action.type === "NEGOTIATE") {
      const result = resolveNegotiation(actor, target, roll, targetRoll);
      this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });
      if (result.success) this.setState({ ...this.getState(), relationships: this.getState().relationships.map(item => this.relationshipContains(item, actor.id, target.id) ? { ...item, hostile: false, friendship: Math.min(100, item.friendship + 10), trust: Math.min(100, item.trust + 5) } : item) });
      this.appendSocialLog(actor.name, target.name, `NEGOCIAÇÃO: ${result.total} contra ${result.targetTotal}. ${result.success ? "SUCESSO" : "FALHA"}.`);
      return { success: true, message: result.success ? `${actor.name} chegou a um acordo com ${target.name}.` : `${actor.name} não conseguiu negociar com ${target.name}.`, data: { phase: "ENCOUNTER", targetId: target.id, socialCheck: result, combatEnded: false } };
    }

    const initialAttitude = this.getDiplomacyAttitude(relationship);
    const result = resolveDiplomacy(actor, initialAttitude, roll, action.rushed === true);
    this.setState({ ...this.getState(), turn: consumeFullRoundAction(this.getState().turn) });
    if (isDiplomacyEndCombatResult(result)) this.setState({ ...this.getState(), relationships: this.getState().relationships.map(item => this.relationshipContains(item, actor.id, target.id) ? { ...item, hostile: false, friendship: Math.min(100, item.friendship + 15), trust: Math.min(100, item.trust + 10) } : item) });
    this.appendSocialLog(actor.name, target.name, `DIPLOMACIA: ${result.total} contra DC ${result.dc}. ${result.newAttitude}.`);
    return { success: true, message: isDiplomacyEndCombatResult(result) ? `${actor.name} alterou a atitude de ${target.name} para ${result.newAttitude}.` : `${actor.name} tentou melhorar a atitude de ${target.name}.`, data: { phase: "ENCOUNTER", targetId: target.id, socialCheck: { ...result, initialAttitude }, combatEnded: false } };
  }

  private executeTalk(action: GameAction): ActionResult {
    if (!this.isEncounterMode()) return { success: false, message: "Conversar requer um encontro ativo." };
    if (!action.targetId) return { success: false, message: "Conversa requer um alvo." };
    const actor = this.getEntity(action.actorId); const target = this.getEntity(action.targetId);
    const participants = this.getState().encounter?.participantIds ?? [];
    if (!actor || !target || !participants.includes(actor.id) || !participants.includes(target.id)) return { success: false, message: "Ator ou alvo não participa deste encontro." };
    if (actor.hp <= -10 || target.hp <= -10) return { success: false, message: "Alvo inválido para conversa." };
    this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actor.name} iniciou uma conversa com ${target.name}.`] });
    return { success: true, message: `Conversa iniciada com ${target.name}.`, data: { phase: "ENCOUNTER", interaction: "TALK", targetId: target.id } };
  }

  private executeObserve(action: GameAction): ActionResult {
    if (!this.isEncounterMode() && !this.isExplorationMode()) return { success: false, message: "Observação não está disponível durante iniciativa ou combate." };
    const actor = this.getEntity(action.actorId); const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (!actor || actor.hp <= -10) return { success: false, message: "Observador inválido." };
    if (action.targetId && (!target || target.hp <= -10)) return { success: false, message: "Alvo inválido para observação." };
    const subject = target ? target.name : "o ambiente";
    this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actor.name} observou ${subject}.`] });
    return { success: true, message: `${actor.name} observou ${subject}.`, data: { phase: this.getState().mode, interaction: "OBSERVE", targetId: target?.id ?? null } };
  }

  private relationshipContains(relationship: { entityAId: string; entityBId: string }, a: string, b: string): boolean { return (relationship.entityAId === a && relationship.entityBId === b) || (relationship.entityAId === b && relationship.entityBId === a); }
  private getDiplomacyAttitude(relationship: { hostile: boolean; friendship: number }): "HOSTILE" | "UNFRIENDLY" | "INDIFFERENT" | "FRIENDLY" | "HELPFUL" { if (relationship.hostile) return "HOSTILE"; if (relationship.friendship >= 60) return "HELPFUL"; if (relationship.friendship >= 30) return "FRIENDLY"; if (relationship.friendship >= 0) return "INDIFFERENT"; return "UNFRIENDLY"; }
  private appendSocialLog(actorName: string, targetName: string, message: string): void { this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actorName} → ${targetName}: ${message}`] }); }
}
