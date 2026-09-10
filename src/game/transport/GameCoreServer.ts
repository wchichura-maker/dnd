import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { GameEngineCombatExtensionsWithCoupAoO } from "../core/GameEngineCombatExtensionsWithCoupAoO";
import { createInitialGameState } from "../core/createInitialGameState";
import { chooseAction } from "../AI";
import { findPath, getReachablePositions } from "../rules/Pathfinding";
import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";

const HOST = "127.0.0.1";
const PORT = Number(process.env.GAME_CORE_PORT ?? 8787);
const PLAYER_ID = "player-01";
const MAX_ACTION_LOG_ENTRIES = 100;

let engine = new GameEngineCombatExtensionsWithCoupAoO(createInitialGameState());
let actionLog: Array<Record<string, unknown>> = [];

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(body);
}

function appendActionLog(entry: Record<string, unknown>): void {
  actionLog.push({ timestamp: new Date().toISOString(), ...entry });
  if (actionLog.length > MAX_ACTION_LOG_ENTRIES) actionLog = actionLog.slice(-MAX_ACTION_LOG_ENTRIES);
}

function getActiveId(state = engine.getState()): string {
  const turnOrder = state.combat.turnOrder;
  const index = state.combat.currentTurnIndex;
  return index >= 0 && index < turnOrder.length ? turnOrder[index] : "";
}

function getTurnDebug(state = engine.getState()): Record<string, unknown> {
  return {
    characterId: state.turn.characterId,
    activeId: getActiveId(state),
    action: state.turn.resources.action,
    moveAction: state.turn.resources.moveAction,
    movement: state.turn.resources.movement,
    hasMoved: state.turn.resources.hasMoved,
    fiveFootStepAvailable: state.turn.resources.fiveFootStepAvailable,
    hasTakenFiveFootStep: state.turn.resources.hasTakenFiveFootStep,
    disabled: state.turn.resources.disabled
  };
}

function recordAction(action: GameAction, result: ActionResult, before: ReturnType<typeof engine.getState>, movementPath: Array<{ x: number; y: number }>, source: "PLAYER" | "AI" | "SYSTEM"): void {
  const after = engine.getState();
  const actorBefore = before.entities.find(entity => entity.id === action.actorId);
  const actorAfter = after.entities.find(entity => entity.id === action.actorId);
  const logMessages = after.logs.slice(before.logs.length);

  appendActionLog({
    source,
    type: action.type,
    actorId: action.actorId,
    targetId: action.targetId ?? null,
    destination: action.destination ?? null,
    success: result.success,
    message: result.message,
    data: result.data ?? null,
    logMessages,
    movementPath,
    positionBefore: actorBefore?.position ?? null,
    positionAfter: actorAfter?.position ?? null,
    hpBefore: actorBefore?.hp ?? null,
    hpAfter: actorAfter?.hp ?? null,
    turnBefore: getTurnDebug(before),
    turnAfter: getTurnDebug(after)
  });
}

function getPresentationState() {
  const state = engine.getState();
  const player = state.entities.find(entity => entity.id === PLAYER_ID);
  const activeId = getActiveId(state);
  const movementBudget = activeId === PLAYER_ID ? state.turn.resources.movement : 0;
  return {
    playerId: PLAYER_ID,
    activeId,
    movementBudget,
    reachablePositions: activeId === PLAYER_ID && player
      ? getReachablePositions(state.map, state.entities, player.position, movementBudget, player.id)
      : []
  };
}

function getSnapshot(): object {
  return { state: engine.getState(), presentation: getPresentationState(), actionLog };
}

function processAutomaticCombat(): Array<object> {
  const events: Array<object> = [];
  const before = engine.getState();
  const result = engine.ensureAutomaticCombat();

  if (result) {
    appendActionLog({
      source: "SYSTEM",
      type: "AUTO_COMBAT_START",
      actorId: null,
      success: result.success,
      message: result.message,
      logMessages: engine.getState().logs.slice(before.logs.length),
      turnAfter: getTurnDebug()
    });
  }

  if (result?.success) events.push({ type: "AUTO_COMBAT_START", result });
  if (engine.isCombatMode()) events.push(...runAiTurns());
  return events;
}

function runAiTurns(): Array<object> {
  const aiActions: Array<object> = [];
  let guard = 0;
  while (engine.isCombatMode() && guard < 20) {
    const state = engine.getState();
    const active = engine.getActiveEntity();
    if (!active || active.controller !== "AI") break;
    const action = chooseAction(active, state.entities, state.relationships, state.map) as GameAction;
    const movementPath = action.destination ? findPath(state.map, state.entities, active.position, action.destination, active.id)?.path ?? [] : [];
    const result = engine.executeAction(action);
    recordAction(action, result, state, movementPath, "AI");
    aiActions.push({ action, result, movementPath });
    if (!result.success) break;
    const endResult = engine.endTurn();
    appendActionLog({ source: "AI", type: "END_TURN", actorId: active.id, success: endResult.success, message: endResult.message, data: endResult.data ?? null, logMessages: engine.getState().logs.slice(state.logs.length), turnAfter: getTurnDebug() });
    if (!endResult.success) break;
    guard++;
  }
  return aiActions;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : undefined;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") return sendJson(response, 204, {});
    if (request.method === "GET" && request.url === "/health") return sendJson(response, 200, { ok: true, service: "dnd-game-core" });

    if (request.method === "GET" && request.url === "/state") {
      processAutomaticCombat();
      return sendJson(response, 200, getSnapshot());
    }

    if (request.method === "POST" && request.url === "/reset") {
      engine = new GameEngineCombatExtensionsWithCoupAoO(createInitialGameState());
      actionLog = [];
      appendActionLog({ source: "SYSTEM", type: "RESET", success: true, message: "Jogo reiniciado." });
      return sendJson(response, 200, getSnapshot());
    }

    if (request.method === "POST" && request.url === "/player/respawn") {
      const current = engine.getState();
      const initial = createInitialGameState();
      const initialPlayer = initial.entities.find(entity => entity.id === PLAYER_ID);
      if (!initialPlayer) return sendJson(response, 500, { success: false, message: "Personagem inicial não encontrado." });

      engine.setState({
        ...current,
        mode: "EXPLORATION",
        entities: current.entities.map(entity => entity.id === PLAYER_ID ? { ...initialPlayer } : entity),
        combat: { turnOrder: [], currentTurnIndex: 0, active: false },
        turn: initial.turn,
        logs: [...current.logs, `${initialPlayer.name} criou um novo personagem e retornou ao ponto inicial.`]
      });
      appendActionLog({ source: "PLAYER", type: "RESPAWN", actorId: PLAYER_ID, success: true, message: "Novo personagem criado no ponto inicial." });
      return sendJson(response, 200, { actionResult: { success: true, message: "Novo personagem criado no ponto inicial." }, ...getSnapshot() });
    }

    if (request.method === "POST" && request.url === "/turn/end") {
      const before = engine.getState();
      const actorId = getActiveId(before);
      const result = engine.endTurn();
      appendActionLog({ source: "PLAYER", type: "END_TURN", actorId, success: result.success, message: result.message, logMessages: engine.getState().logs.slice(before.logs.length), turnBefore: getTurnDebug(before), turnAfter: getTurnDebug() });
      const aiActions = result.success ? runAiTurns() : [];
      return sendJson(response, result.success ? 200 : 400, { actionResult: result, aiActions, ...getSnapshot() });
    }

    if (request.method === "POST" && request.url === "/action") {
      const action = await readJsonBody(request) as GameAction;
      const automaticEvents = processAutomaticCombat();
      const stateBeforeAction = engine.getState();
      const actorBeforeAction = stateBeforeAction.entities.find(entity => entity.id === action.actorId);
      let movementPath: { x: number; y: number }[] = [];

      if (actorBeforeAction && action.destination) {
        movementPath = findPath(stateBeforeAction.map, stateBeforeAction.entities, actorBeforeAction.position, action.destination, actorBeforeAction.id)?.path ?? [];
        if (action.type === "MOVE") {
          const activeId = getActiveId(stateBeforeAction);
          const movementBudget = activeId === action.actorId ? stateBeforeAction.turn.resources.movement : actorBeforeAction.movement;
          const reachable = getReachablePositions(stateBeforeAction.map, stateBeforeAction.entities, actorBeforeAction.position, movementBudget, actorBeforeAction.id);
          if (!reachable.some(position => position.x === action.destination?.x && position.y === action.destination?.y)) {
            const rejection: ActionResult = { success: false, message: `Destino excede o deslocamento disponível de ${movementBudget} quadrado(s).` };
            recordAction(action, rejection, stateBeforeAction, movementPath, "PLAYER");
            return sendJson(response, 400, { actionResult: rejection, autoCombatEvents: automaticEvents, ...getSnapshot(), movementPath: [] });
          }
        }
      }

      const result = engine.executeAction(action);
      recordAction(action, result, stateBeforeAction, movementPath, action.actorId === PLAYER_ID ? "PLAYER" : "SYSTEM");

      const postActionAutomaticEvents = processAutomaticCombat();
      const aiActions = result.success ? runAiTurns() : [];
      return sendJson(response, result.success ? 200 : 400, { actionResult: result, autoCombatEvents: [...automaticEvents, ...postActionAutomaticEvents], aiActions, ...getSnapshot(), movementPath: result.success ? movementPath : [] });
    }

    return sendJson(response, 404, { success: false, message: "Endpoint não encontrado." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    appendActionLog({ source: "SYSTEM", type: "ERROR", success: false, message });
    return sendJson(response, 500, { success: false, message, ...getSnapshot() });
  }
});

server.listen(PORT, HOST, () => console.log(`D&D Game Core listening on http://${HOST}:${PORT}`));
