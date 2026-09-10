import type { ActionResult } from "../actions/ActionResult";
import { GameEngineCombatExtensionsWithCoupAoO } from "./GameEngineCombatExtensionsWithCoupAoO";

export class GameEngineEncounter extends GameEngineCombatExtensionsWithCoupAoO {
  isEncounterMode(): boolean { return this.getState().mode === "ENCOUNTER"; }
  isInitiativeMode(): boolean { return this.getState().mode === "INITIATIVE"; }

  startEncounter(combatantIds: string[], reason = "HOSTILITY"): ActionResult {
    if (!this.isExplorationMode()) return { success: false, message: "Um encontro já está em andamento." };
    const participantIds = [...new Set(combatantIds)].filter(id => { const entity = this.getEntity(id); return !!entity && entity.hp > -10; });
    if (participantIds.length < 1) return { success: false, message: "O encontro precisa de pelo menos um participante válido." };
    this.setState({ ...this.getState(), mode: "ENCOUNTER", encounter: { participantIds, reason, active: true }, logs: [...this.getState().logs, `Encontro iniciado: ${reason}.`] });
    return { success: true, message: "Encontro iniciado.", data: { phase: "ENCOUNTER", participantIds, reason } };
  }

  startInitiative(): ActionResult {
    if (!this.isEncounterMode()) return { success: false, message: "A iniciativa só pode ser determinada durante um encontro." };
    const participantIds = this.getState().encounter?.participantIds ?? [];
    if (participantIds.length < 2) return { success: false, message: "São necessários pelo menos dois participantes para determinar a iniciativa." };
    const combatResult = super.startCombat(participantIds);
    if (!combatResult.success) return combatResult;
    this.setState({ ...this.getState(), mode: "INITIATIVE", logs: [...this.getState().logs, "Iniciativa determinada."] });
    return { success: true, message: "Iniciativa determinada.", data: { phase: "INITIATIVE", turnOrder: this.getState().combat.turnOrder, currentTurnIndex: this.getState().combat.currentTurnIndex } };
  }

  beginCombat(): ActionResult {
    if (!this.isInitiativeMode()) return { success: false, message: "O combate só pode começar após a iniciativa." };
    this.setState({ ...this.getState(), mode: "COMBAT", logs: [...this.getState().logs, "Combate iniciado."] });
    return { success: true, message: "Combate iniciado.", data: { phase: "COMBAT" } };
  }

  /** Resolves a non-combat encounter and returns the world to exploration. */
  endEncounter(reason = "OTHER"): ActionResult {
    if (!this.isEncounterMode()) return { success: false, message: "Não existe um encontro ativo para resolver." };
    const previous = this.getState().encounter;
    this.setState({ ...this.getState(), mode: "EXPLORATION", encounter: undefined, logs: [...this.getState().logs, `Encontro resolvido: ${reason}.`] });
    return { success: true, message: "Encontro resolvido.", data: { phase: "EXPLORATION", reason, participantIds: previous?.participantIds ?? [] } };
  }

  override startCombat(combatantIds?: string[]): ActionResult {
    if (this.isCombatMode()) return { success: false, message: "O jogo já está em combate." };
    if (this.isEncounterMode()) { const initiative = this.startInitiative(); return initiative.success ? this.beginCombat() : initiative; }
    if (this.isInitiativeMode()) return this.beginCombat();
    const ids = combatantIds ?? this.getState().entities.filter(entity => entity.hp > -10).map(entity => entity.id);
    const encounter = this.startEncounter(ids, "HOSTILITY");
    if (!encounter.success) return encounter;
    const initiative = this.startInitiative();
    return initiative.success ? this.beginCombat() : initiative;
  }

  override endCombat(): ActionResult {
    const result = super.endCombat();
    if (!result.success) return result;
    this.setState({ ...this.getState(), encounter: undefined });
    return result;
  }
}
