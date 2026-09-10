import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { GameEngineEncounterWithFlee } from "./GameEngineEncounterWithFlee";

/**
 * Contextual interaction layer for ENCOUNTER.
 * Non-offensive interactions remain in the encounter; ATTACK escalates through
 * the authoritative ENCOUNTER -> INITIATIVE -> COMBAT flow.
 */
export class GameEngineEncounterActions extends GameEngineEncounterWithFlee {
  override executeAction(action: GameAction): ActionResult {
    if (action.type === "TALK") return this.executeTalk(action);
    if (action.type === "OBSERVE") return this.executeObserve(action);

    if (action.type === "ATTACK" && this.isEncounterMode()) {
      const combat = this.startCombat(this.getState().encounter?.participantIds);
      if (!combat.success) return combat;
    }

    return super.executeAction(action);
  }

  private executeTalk(action: GameAction): ActionResult {
    if (!this.isEncounterMode()) return { success: false, message: "Conversar requer um encontro ativo." };
    if (!action.targetId) return { success: false, message: "Conversa requer um alvo." };

    const actor = this.getEntity(action.actorId);
    const target = this.getEntity(action.targetId);
    const participants = this.getState().encounter?.participantIds ?? [];
    if (!actor || !target || !participants.includes(actor.id) || !participants.includes(target.id)) {
      return { success: false, message: "Ator ou alvo não participa deste encontro." };
    }
    if (actor.hp <= -10 || target.hp <= -10) return { success: false, message: "Alvo inválido para conversa." };

    this.setState({
      ...this.getState(),
      logs: [...this.getState().logs, `${actor.name} iniciou uma conversa com ${target.name}.`]
    });
    return { success: true, message: `Conversa iniciada com ${target.name}.`, data: { phase: "ENCOUNTER", interaction: "TALK", targetId: target.id } };
  }

  private executeObserve(action: GameAction): ActionResult {
    if (!this.isEncounterMode() && !this.isExplorationMode()) {
      return { success: false, message: "Observação não está disponível durante iniciativa ou combate." };
    }
    const actor = this.getEntity(action.actorId);
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    if (!actor || actor.hp <= -10) return { success: false, message: "Observador inválido." };
    if (action.targetId && (!target || target.hp <= -10)) return { success: false, message: "Alvo inválido para observação." };

    const subject = target ? target.name : "o ambiente";
    this.setState({ ...this.getState(), logs: [...this.getState().logs, `${actor.name} observou ${subject}.`] });
    return { success: true, message: `${actor.name} observou ${subject}.`, data: { phase: this.getState().mode, interaction: "OBSERVE", targetId: target?.id ?? null } };
  }
}
