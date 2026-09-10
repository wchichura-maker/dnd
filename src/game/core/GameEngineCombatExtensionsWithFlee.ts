import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { GameEngineCombatExtensionsWithCoupAoO } from "./GameEngineCombatExtensionsWithCoupAoO";

/**
 * FLEE is a game-level combat resolution command.
 *
 * The actual movement still uses the D&D 3.5 RUN rules through the
 * existing combat engine, including path validation and attacks of
 * opportunity. Once the run succeeds, the encounter is resolved as a
 * deliberate flight rather than leaving the game stuck in COMBAT.
 */
export class GameEngineCombatExtensionsWithFlee extends GameEngineCombatExtensionsWithCoupAoO {
  override executeAction(action: GameAction): ActionResult {
    if (action.type !== "FLEE") return super.executeAction(action);

    if (!this.isCombatMode()) {
      return { success: false, message: "Fuga só pode ser usada durante um combate." };
    }

    if (!action.destination) {
      return { success: false, message: "Destino da fuga não informado." };
    }

    const runResult = super.executeAction({
      type: "RUN",
      actorId: action.actorId,
      destination: action.destination
    });

    if (!runResult.success) {
      return {
        ...runResult,
        message: `Fuga falhou: ${runResult.message}`
      };
    }

    const resolved = this.resolveCombat("FLEE");
    if (!resolved.success) {
      return {
        ...runResult,
        message: `A fuga foi executada, mas o combate não pôde ser encerrado: ${resolved.message}`
      };
    }

    return {
      ...runResult,
      message: `${runResult.message} ${resolved.message}`,
      data: {
        ...(runResult.data ?? {}),
        combatEnded: true,
        combatEndReason: "FLEE"
      }
    };
  }
}
