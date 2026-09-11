import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { GameEngineEncounterActions } from "../core/GameEngineEncounterActions";
import { createInitialGameState } from "../core/createInitialGameState";
import { runAiTurns as executeAiTurns } from "./AITurnController";
import { findPath, getReachablePositions } from "../rules/Pathfinding";
import { calculatePerception, pointsToKeys } from "../rules/PerceptionRules";
import { isDead } from "../rules/ConditionRules";
import { advanceWorldClock } from "../time/WorldClock";
import { advanceHunger, eatFood } from "../survival/HungerSystem";
import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";

const HOST = "127.0.0.1";
const PORT = Number(process.env.GAME_CORE_PORT ?? 8787);
const PLAYER_ID = "player-01";
const MAX_ACTION_LOG_ENTRIES = 100;
const EXPLORATION_SECONDS_PER_TILE = 1;
const EAT_ACTION_SECONDS = 10 * 60;
const COMBAT_ROUND_SECONDS = 6;
let engine = new GameEngineEncounterActions(createInitialGameState());
let actionLog: Array<Record<string, unknown>> = [];

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });
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
  return { characterId: state.turn.characterId, activeId: getActiveId(state), action: state.turn.resources.action, moveAction: state.turn.resources.moveAction, movement: state.turn.resources.movement, hasMoved: state.turn.resources.hasMoved, fiveFootStepAvailable: state.turn.resources.fiveFootStepAvailable, hasTakenFiveFootStep: state.turn.resources.hasTakenFiveFootStep, disabled: state.turn.resources.disabled };
}

function recordAction(action: GameAction, result: ActionResult, before: ReturnType<typeof engine.getState>, movementPath: Array<{ x: number; y: number }>, source: "PLAYER" | "AI" | "SYSTEM"): void {
  const after = engine.getState();
  const actorBefore = before.entities.find(entity => entity.id === action.actorId);
  const actorAfter = after.entities.find(entity => entity.id === action.actorId);
  appendActionLog({ source, type: action.type, actorId: action.actorId, targetId: action.targetId ?? null, destination: action.destination ?? null, success: result.success, message: result.message, data: result.data ?? null, logMessages: after.logs.slice(before.logs.length), movementPath, positionBefore: actorBefore?.position ?? null, positionAfter: actorAfter?.position ?? null, hpBefore: actorBefore?.hp ?? null, hpAfter: actorAfter?.hp ?? null, foodBefore: actorBefore?.food ?? null, foodAfter: actorAfter?.food ?? null, turnBefore: getTurnDebug(before), turnAfter: getTurnDebug(after), worldTimeBefore: before.worldClock.totalSeconds, worldTimeAfter: after.worldClock.totalSeconds });
}

function getPresentationState() {
  const state = engine.getState();
  const player = state.entities.find(entity => entity.id === PLAYER_ID);
  const activeId = getActiveId(state);
  const movementBudget = activeId === PLAYER_ID ? state.turn.resources.movement : 0;
  const perception = player ? calculatePerception(state.map, player.position) : { visibleTiles: [], exploredTiles: [] };
  return {
    playerId: PLAYER_ID,
    activeId,
    movementBudget,
    worldTimeSeconds: state.worldClock.totalSeconds,
    reachablePositions: activeId === PLAYER_ID && player ? getReachablePositions(state.map, state.entities, player.position, movementBudget, player.id) : [],
    perception: {
      visibleTiles: pointsToKeys(perception.visibleTiles),
      exploredTiles: pointsToKeys(perception.exploredTiles)
    }
  };
}

function getSnapshot(): object { return { state: engine.getState(), presentation: getPresentationState(), actionLog }; }

function processAutomaticCombatStart(): Array<object> {
  const events: Array<object> = [];
  const before = engine.getState();
  const result = engine.ensureAutomaticCombat();
  if (result) appendActionLog({ source: "SYSTEM", type: "AUTO_COMBAT_START", actorId: null, success: result.success, message: result.message, logMessages: engine.getState().logs.slice(before.logs.length), turnAfter: getTurnDebug() });
  if (result?.success) events.push({ type: "AUTO_COMBAT_START", result });
  return events;
}

function hasRemainingHostilePair(): boolean {
  const state = engine.getState();
  const living = state.entities.filter(entity => !isDead(entity));
  for (let i = 0; i < living.length; i++) {
    for (let j = i + 1; j < living.length; j++) {
      const hostile = state.relationships.some(relationship =>
        ((relationship.entityAId === living[i].id && relationship.entityBId === living[j].id) ||
          (relationship.entityAId === living[j].id && relationship.entityBId === living[i].id)) && relationship.hostile
      );
      if (hostile) return true;
    }
  }
  return false;
}

function normalizeCombatAfterAction(): ActionResult | null {
  if (!engine.isCombatMode() || hasRemainingHostilePair()) return null;
  return engine.resolveCombat("DEATH");
}

function advanceGameTime(seconds: number, reason: string): void {
  if (seconds <= 0) return;

  const before = engine.getState();
  const nextClock = advanceWorldClock(before.worldClock, seconds);
  let entities = before.entities;
  let hunger = before.hunger;
  const survivalLogs: string[] = [];

  for (const entity of before.entities) {
    const currentHunger = hunger[entity.id];
    if (!currentHunger) continue;
    const result = advanceHunger(entity, currentHunger, nextClock.totalSeconds);
    entities = entities.map(item => item.id === entity.id ? result.entity : item);
    hunger = { ...hunger, [entity.id]: result.hunger };
    survivalLogs.push(...result.messages);
  }

  const clockTime = new Date(nextClock.totalSeconds * 1000).toISOString();
  engine.setState({
    ...before,
    worldClock: nextClock,
    hunger,
    entities,
    logs: [...before.logs, `Relógio do mundo avançou ${seconds}s (${reason}).`, ...survivalLogs]
  });

  appendActionLog({ source: "SYSTEM", type: "WORLD_TIME_ADVANCE", seconds, reason, worldTimeBefore: before.worldClock.totalSeconds, worldTimeAfter: nextClock.totalSeconds, worldTimeIso: clockTime, survivalEvents: survivalLogs });
}

function eatForEntity(entityId: string): ActionResult {
  const state = engine.getState();
  const entity = state.entities.find(item => item.id === entityId);
  const currentHunger = state.hunger[entityId];
  if (!entity || !currentHunger) return { success: false, message: "Estado de fome do personagem não encontrado." };
  if (isDead(entity)) return { success: false, message: `${entity.name} não pode se alimentar enquanto está morto.` };

  const result = eatFood(entity, currentHunger, state.worldClock.totalSeconds);
  engine.setState({
    ...state,
    entities: state.entities.map(item => item.id === entityId ? result.entity : item),
    hunger: { ...state.hunger, [entityId]: result.hunger },
    logs: [...state.logs, ...result.messages]
  });
  return { success: true, message: result.messages[0] };
}

function runAiTurns(): Array<object> {
  const run = executeAiTurns(engine);
  return run.events.map(event => {
    const actorBefore = event.before.entities.find(entity => entity.id === event.action.actorId);
    if (event.result.success && event.movementPath.length > 0) {
      advanceGameTime(event.movementPath.length * EXPLORATION_SECONDS_PER_TILE, `movimento AI de ${event.action.actorId}`);
    }
    if (event.endTurn?.success) advanceGameTime(COMBAT_ROUND_SECONDS, `fim de turno AI de ${event.action.actorId}`);
    recordAction(event.action, event.result, event.before, event.movementPath, "AI");
    if (event.endTurn) appendActionLog({ source: "AI", type: "END_TURN", actorId: event.action.actorId, success: event.endTurn.success, message: event.endTurn.message, data: event.endTurn.data ?? null, turnAfter: getTurnDebug() });
    return { action: event.action, result: event.result, movementPath: event.movementPath, positionBefore: actorBefore?.position ?? null, positionAfter: engine.getState().entities.find(entity => entity.id === event.action.actorId)?.position ?? null, endTurn: event.endTurn ?? null };
  });
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
    if (request.method === "GET" && request.url === "/state") return sendJson(response, 200, getSnapshot());
    if (request.method === "POST" && request.url === "/reset") {
      engine = new GameEngineEncounterActions(createInitialGameState()); actionLog = [];
      appendActionLog({ source: "SYSTEM", type: "RESET", success: true, message: "Jogo reiniciado." });
      return sendJson(response, 200, getSnapshot());
    }
    if (request.method === "POST" && request.url === "/player/respawn") {
      const current = engine.getState(); const initial = createInitialGameState(); const initialPlayer = initial.entities.find(entity => entity.id === PLAYER_ID);
      if (!initialPlayer) return sendJson(response, 500, { success: false, message: "Personagem inicial não encontrado." });
      engine.setState({ ...current, mode: "EXPLORATION", encounter: undefined, entities: current.entities.map(entity => entity.id === PLAYER_ID ? { ...initialPlayer } : entity), combat: { turnOrder: [], currentTurnIndex: 0, active: false }, turn: initial.turn, worldClock: current.worldClock, hunger: { ...current.hunger, [PLAYER_ID]: initial.hunger[PLAYER_ID] }, logs: [...current.logs, `${initialPlayer.name} criou um novo personagem e retornou ao ponto inicial.`] });
      appendActionLog({ source: "PLAYER", type: "RESPAWN", actorId: PLAYER_ID, success: true, message: "Novo personagem criado no ponto inicial." });
      return sendJson(response, 200, { actionResult: { success: true, message: "Novo personagem criado no ponto inicial." }, ...getSnapshot() });
    }
    if (request.method === "POST" && request.url === "/world/advance") {
      const body = await readJsonBody(request) as { seconds?: number } | undefined;
      const seconds = Math.max(0, Math.floor(Number(body?.seconds ?? 0)));
      if (seconds <= 0) return sendJson(response, 400, { success: false, message: "Informe um número de segundos maior que zero." });
      advanceGameTime(seconds, "avanço manual de teste");
      return sendJson(response, 200, { actionResult: { success: true, message: `Relógio avançou ${seconds} segundo(s).` }, ...getSnapshot() });
    }
    if (request.method === "POST" && request.url === "/turn/end") {
      const before = engine.getState(); const actorId = getActiveId(before); const result = engine.endTurn();
      if (result.success) advanceGameTime(COMBAT_ROUND_SECONDS, `fim de turno de ${actorId}`);
      appendActionLog({ source: "PLAYER", type: "END_TURN", actorId, success: result.success, message: result.message, logMessages: engine.getState().logs.slice(before.logs.length), turnBefore: getTurnDebug(before), turnAfter: getTurnDebug() });
      const aiActions = result.success ? runAiTurns() : [];
      return sendJson(response, result.success ? 200 : 400, { actionResult: result, aiActions, ...getSnapshot() });
    }
    if (request.method === "POST" && request.url === "/action") {
      const action = await readJsonBody(request) as GameAction;
      const automaticEvents = processAutomaticCombatStart();
      const stateBeforeAction = engine.getState();
      const actorBeforeAction = stateBeforeAction.entities.find(entity => entity.id === action.actorId);

      if (action.type === "EAT") {
        if (action.actorId !== PLAYER_ID) return sendJson(response, 403, { success: false, message: "Somente o jogador pode usar a ação de alimentação neste protótipo." });
        const result = eatForEntity(action.actorId);
        if (result.success) advanceGameTime(EAT_ACTION_SECONDS, `alimentação de ${action.actorId}`);
        recordAction(action, result, stateBeforeAction, [], "PLAYER");
        return sendJson(response, result.success ? 200 : 400, { actionResult: result, autoCombatEvents: automaticEvents, ...getSnapshot(), movementPath: [] });
      }

      let movementPath: { x: number; y: number }[] = [];
      if (actorBeforeAction && action.destination) {
        movementPath = findPath(stateBeforeAction.map, stateBeforeAction.entities, actorBeforeAction.position, action.destination, actorBeforeAction.id)?.path ?? [];
        if (action.type === "MOVE") {
          const activeId = getActiveId(stateBeforeAction); const movementBudget = activeId === action.actorId ? stateBeforeAction.turn.resources.movement : actorBeforeAction.movement;
          const reachable = getReachablePositions(stateBeforeAction.map, stateBeforeAction.entities, actorBeforeAction.position, movementBudget, actorBeforeAction.id);
          if (!reachable.some(position => position.x === action.destination?.x && position.y === action.destination?.y)) {
            const rejection: ActionResult = { success: false, message: `Destino excede o deslocamento disponível de ${movementBudget} quadrado(s).` };
            recordAction(action, rejection, stateBeforeAction, movementPath, "PLAYER");
            return sendJson(response, 400, { actionResult: rejection, autoCombatEvents: automaticEvents, ...getSnapshot(), movementPath: [] });
          }
        }
      }
      const result = engine.executeAction(action);
      if (result.success && movementPath.length > 0) {
        const seconds = movementPath.length * EXPLORATION_SECONDS_PER_TILE;
        advanceGameTime(seconds, `movimento de ${action.actorId}`);
      }
      const combatResolution = result.success ? normalizeCombatAfterAction() : null;
      const finalResult: ActionResult = combatResolution?.success
        ? { ...result, message: `${result.message} ${combatResolution.message}`, data: { ...(result.data ?? {}), combatEnded: true, combatEndReason: "DEATH" } }
        : result;
      recordAction(action, finalResult, stateBeforeAction, movementPath, action.actorId === PLAYER_ID ? "PLAYER" : "SYSTEM");
      const postActionAutomaticEvents = processAutomaticCombatStart();
      const aiActions = finalResult.success ? runAiTurns() : [];
      return sendJson(response, finalResult.success ? 200 : 400, { actionResult: finalResult, autoCombatEvents: [...automaticEvents, ...postActionAutomaticEvents], aiActions, ...getSnapshot(), movementPath: finalResult.success ? movementPath : [] });
    }
    return sendJson(response, 404, { success: false, message: "Endpoint não encontrado." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    appendActionLog({ source: "SYSTEM", type: "ERROR", success: false, message });
    return sendJson(response, 500, { success: false, message, ...getSnapshot() });
  }
});

server.listen(PORT, HOST, () => console.log(`D&D Game Core listening on http://${HOST}:${PORT}`));
