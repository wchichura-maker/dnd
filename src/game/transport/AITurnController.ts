import { chooseAction } from "../AI";
import { findPath } from "../rules/Pathfinding";
import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";
import type { GameEngineEncounterActions } from "../core/GameEngineEncounterActions";

export type AiTurnEvent = {
  action: GameAction;
  result: ActionResult;
  movementPath: Array<{ x: number; y: number }>;
  endTurn?: ActionResult;
};

export type AiTurnRunResult = {
  events: AiTurnEvent[];
  stoppedByGuard: boolean;
  stoppedBecauseCombatEnded: boolean;
};

const DEFAULT_AI_TURN_GUARD = 20;

/**
 * Executa a cadeia de turnos AI de forma autoritativa.
 *
 * A IA somente escolhe uma intenção. A execução continua passando pelo
 * GameEngineEncounterActions, que é a fonte de verdade das regras.
 */
export function runAiTurns(
  engine: GameEngineEncounterActions,
  maxTurns = DEFAULT_AI_TURN_GUARD
): AiTurnRunResult {
  const events: AiTurnEvent[] = [];
  let guard = 0;

  while (engine.isCombatMode() && guard < maxTurns) {
    const state = engine.getState();
    const active = engine.getActiveEntity();

    if (!active || active.controller !== "AI") {
      return {
        events,
        stoppedByGuard: false,
        stoppedBecauseCombatEnded: false
      };
    }

    const action = chooseAction(
      active,
      state.entities,
      state.relationships,
      state.map
    ) as GameAction;

    const movementPath = action.destination
      ? findPath(
          state.map,
          state.entities,
          active.position,
          action.destination,
          active.id
        )?.path ?? []
      : [];

    const result = engine.executeAction(action);
    const event: AiTurnEvent = { action, result, movementPath };
    events.push(event);

    if (!result.success) {
      return {
        events,
        stoppedByGuard: false,
        stoppedBecauseCombatEnded: !engine.isCombatMode()
      };
    }

    if (!engine.isCombatMode()) {
      return {
        events,
        stoppedByGuard: false,
        stoppedBecauseCombatEnded: true
      };
    }

    const endTurn = engine.endTurn();
    event.endTurn = endTurn;

    if (!endTurn.success) {
      return {
        events,
        stoppedByGuard: false,
        stoppedBecauseCombatEnded: !engine.isCombatMode()
      };
    }

    guard++;
  }

  return {
    events,
    stoppedByGuard: engine.isCombatMode() && guard >= maxTurns,
    stoppedBecauseCombatEnded: !engine.isCombatMode()
  };
}
