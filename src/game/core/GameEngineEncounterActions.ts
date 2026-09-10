import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { GameEngineCombatExtensionsWithFlee } from "./GameEngineCombatExtensionsWithFlee";

/**
 * Encounter interaction layer.
 *
 * Non-hostile interactions remain in ENCOUNTER. Offensive actions transition
 * through the authoritative ENCOUNTER -> INITIATIVE -> COMBAT flow.
 */
export class GameEngineEncounterActions extends GameEngineCombatExtensionsWithFlee {
  override executeAction(action: GameAction): ActionResult {
    if (action.type === "TALK") return this.executeTalk(action);
    if (action.type === "OBSERVE") return this.executeObserve(action);

    if (action.type === "ATTACK") {
      if (this.isEncounterMode()) {
        const combat = this.startCombat(this.getState().encounter?.participantIds);
        if (!combat.success) return combat;
      }
    }

    return super.executeAction(action);
  }

  private executeTalk(action: GameAction): ActionResult {
    if (this.isCombatMode() || this.isInitiativeMode()) {
      return { success: false, message: "Não é possível conversar durante o combate." };
    }
    if (!this.isEncounterMode()) {
      return { success: false, message: "Conversar requer um encontro ativo." };
    }
    if (!action.targetId) {
      return { success: false, message: "Conversa requer um alvo." };
    }
    const target = this.getEntity(action.targetId);
    if (!target || target.hp <= -10) {
      return { success: false, message: "Alvo inválido para conversa." };
    }

    this.setState({
      ...this.getState(),
      logs: [...this.getState().logs, `${this.getEntity(action.actorId)?.name ?? action.actorId} iniciou uma conversa com ${target.name}.`]
    });

    return {
      success: true,
      message: `Conversa iniciada com ${target.name}.`,
      data: { phase: "ENCOUNTER", interaction: "TALK", targetId: target.id }
    };
  }

  private executeObserve(action: GameAction): ActionResult {
    if (!this.isEncounterMode() && !this.isExplorationMode()) {
      return { success: false, message: "Observação não está disponível durante iniciativa ou combate." };
    }
    const target = action.targetId ? this.getEntity(action.targetId) : undefined;
    const actor = this.getEntity(action.actorId);
    if (!actor || actor.hp <= -10) return { success: false, message: "Observador inválido." };
    if (action.targetId && (!target || target.hp <= -10)) {
      return { success: false, message: "Alvo inválido para observação." };
    }

    const subject = target ? target.name : "o ambiente";
    this.setState({
      ...this.getState(),
      logs: [...this.getState().logs, `${actor.name} observou ${subject}.`]
    });

    return {
      success: true,
      message: `${actor.name} observou ${subject}.`,
      data: { phase: this.getState().mode, interaction: "OBSERVE", targetId: target?.id ?? null }
    };
  }
}
