import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { GameEngineEncounter } from "./GameEngineEncounter";

/** Complete encounter coordinator with FLEE preserved in the same inheritance chain. */
export class GameEngineEncounterWithFlee extends GameEngineEncounter {
  override executeAction(action: GameAction): ActionResult {
    if (action.type !== "FLEE") return super.executeAction(action);
    if (!this.isCombatMode()) return { success: false, message: "Fuga só pode ser usada durante um combate." };
    if (!action.destination) return { success: false, message: "Destino da fuga não informado." };

    const runResult = super.executeAction({ type: "RUN", actorId: action.actorId, destination: action.destination });
    if (!runResult.success) return { ...runResult, message: `Fuga falhou: ${runResult.message}` };

    const resolved = this.resolveCombat("FLEE");
    if (!resolved.success) return { ...runResult, message: `A fuga foi executada, mas o combate não pôde ser encerrado: ${resolved.message}` };
    return {
      ...runResult,
      message: `${runResult.message} ${resolved.message}`,
      data: { ...(runResult.data ?? {}), combatEnded: true, combatEndReason: "FLEE" }
    };
  }

  override startCombat(combatantIds?: string[]): ActionResult {
    return super.startCombat(combatantIds);
  }
}
