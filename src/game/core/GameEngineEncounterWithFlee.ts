import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import { isDead } from "../rules/ConditionRules";
import { GameEngineEncounter } from "./GameEngineEncounter";

const MIN_ESCAPE_DISTANCE_SQUARES = 12;

function distance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

/** Complete encounter coordinator with FLEE preserved in the same inheritance chain. */
export class GameEngineEncounterWithFlee extends GameEngineEncounter {
  override executeAction(action: GameAction): ActionResult {
    if (action.type !== "FLEE") return super.executeAction(action);
    if (!this.isCombatMode()) return { success: false, message: "Fuga só pode ser usada durante um combate." };

    const state = this.getState();
    const actor = state.entities.find(entity => entity.id === action.actorId);
    if (!actor || isDead(actor)) return { success: false, message: "Criatura inválida ou morta não pode fugir." };

    const hostileTargets = state.entities.filter(entity => {
      if (entity.id === actor.id || isDead(entity)) return false;
      const relationship = state.relationships.find(item =>
        (item.entityAId === actor.id && item.entityBId === entity.id) ||
        (item.entityAId === entity.id && item.entityBId === actor.id)
      );
      return relationship?.hostile === true;
    });

    const alreadyEscaped = hostileTargets.length > 0 && hostileTargets.every(target =>
      distance(actor.position, target.position) >= MIN_ESCAPE_DISTANCE_SQUARES
    );

    if (alreadyEscaped && !action.destination) {
      const resolved = this.resolveCombat("FLEE");
      if (!resolved.success) return resolved;
      return {
        success: true,
        message: `Fuga concluída: ${actor.name} rompeu contato a ${MIN_ESCAPE_DISTANCE_SQUARES * 5} pés.` ,
        data: { combatEnded: true, combatEndReason: "FLEE", escapeDistanceSquares: MIN_ESCAPE_DISTANCE_SQUARES }
      };
    }

    if (!action.destination) return { success: false, message: "Destino da fuga não informado." };

    const runResult = super.executeAction({ type: "RUN", actorId: action.actorId, destination: action.destination });
    if (!runResult.success) return { ...runResult, message: `Fuga falhou: ${runResult.message}` };

    const movedActor = this.getState().entities.find(entity => entity.id === action.actorId);
    const movedTargets = this.getState().entities.filter(entity => {
      if (entity.id === action.actorId || isDead(entity)) return false;
      const relationship = this.getState().relationships.find(item =>
        (item.entityAId === action.actorId && item.entityBId === entity.id) ||
        (item.entityAId === entity.id && item.entityBId === action.actorId)
      );
      return relationship?.hostile === true;
    });
    const escapedAfterRun = movedActor && movedTargets.length > 0 && movedTargets.every(target =>
      distance(movedActor.position, target.position) >= MIN_ESCAPE_DISTANCE_SQUARES
    );

    if (!escapedAfterRun) {
      return {
        ...runResult,
        message: `${runResult.message} Fuga continua: é necessário romper contato a pelo menos ${MIN_ESCAPE_DISTANCE_SQUARES * 5} pés.`
      };
    }

    const resolved = this.resolveCombat("FLEE");
    if (!resolved.success) return { ...runResult, message: `A fuga foi executada, mas o combate não pôde ser encerrado: ${resolved.message}` };
    return {
      ...runResult,
      message: `${runResult.message} ${resolved.message} Contato rompido a ${MIN_ESCAPE_DISTANCE_SQUARES * 5} pés.`,
      data: { ...(runResult.data ?? {}), combatEnded: true, combatEndReason: "FLEE", escapeDistanceSquares: MIN_ESCAPE_DISTANCE_SQUARES }
    };
  }

  override startCombat(combatantIds?: string[]): ActionResult {
    return super.startCombat(combatantIds);
  }
}
