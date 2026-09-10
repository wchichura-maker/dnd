import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { GameEngine } from "../core/GameEngine";
import { createInitialGameState } from "../core/createInitialGameState";
import { findPath, getReachablePositions } from "../rules/Pathfinding";
import type { GameAction } from "../actions/Action";

const HOST = "127.0.0.1";
const PORT = Number(process.env.GAME_CORE_PORT ?? 8787);
const PLAYER_ID = "player-01";

let engine = new GameEngine(createInitialGameState());

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
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

function getPresentationState(): {
  playerId: string;
  reachablePositions: { x: number; y: number }[];
} {
  const state = engine.getState();
  const player = state.entities.find(entity => entity.id === PLAYER_ID);

  if (!player) {
    return {
      playerId: PLAYER_ID,
      reachablePositions: []
    };
  }

  return {
    playerId: PLAYER_ID,
    reachablePositions: getReachablePositions(
      state.map,
      state.entities,
      player.position,
      player.movement,
      player.id
    )
  };
}

function getSnapshot(): object {
  return {
    state: engine.getState(),
    presentation: getPresentationState()
  };
}

function sendActionResult(
  response: ServerResponse,
  result: ReturnType<GameEngine["startCombat"]>
): void {
  sendJson(response, result.success ? 200 : 400, {
    actionResult: result,
    ...getSnapshot()
  });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");

  if (!body) {
    return undefined;
  }

  return JSON.parse(body);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "dnd-game-core"
      });
      return;
    }

    if (request.method === "GET" && request.url === "/state") {
      sendJson(response, 200, getSnapshot());
      return;
    }

    if (request.method === "POST" && request.url === "/reset") {
      engine = new GameEngine(createInitialGameState());
      sendJson(response, 200, getSnapshot());
      return;
    }

    if (request.method === "POST" && request.url === "/combat/start") {
      const result = engine.startCombat();
      sendActionResult(response, result);
      return;
    }

    if (request.method === "POST" && request.url === "/combat/end") {
      const result = engine.endCombat();
      sendActionResult(response, result);
      return;
    }

    if (request.method === "POST" && request.url === "/turn/end") {
      const result = engine.endTurn();
      sendActionResult(response, result);
      return;
    }

    if (request.method === "POST" && request.url === "/action") {
      const action = await readJsonBody(request) as GameAction;
      const stateBeforeAction = engine.getState();
      const actorBeforeAction = stateBeforeAction.entities.find(
        entity => entity.id === action.actorId
      );

      let movementPath: { x: number; y: number }[] = [];

      if (actorBeforeAction && action.destination) {
        const pathResult = findPath(
          stateBeforeAction.map,
          stateBeforeAction.entities,
          actorBeforeAction.position,
          action.destination,
          actorBeforeAction.id
        );

        movementPath = pathResult?.path ?? [];

        if (action.type === "MOVE") {
          const reachablePositions = getReachablePositions(
            stateBeforeAction.map,
            stateBeforeAction.entities,
            actorBeforeAction.position,
            actorBeforeAction.movement,
            actorBeforeAction.id
          );

          const destinationIsReachable = reachablePositions.some(
            position =>
              position.x === action.destination?.x &&
              position.y === action.destination?.y
          );

          if (!destinationIsReachable) {
            sendJson(response, 400, {
              actionResult: {
                success: false,
                message: `Destino excede o deslocamento máximo de ${actorBeforeAction.movement} quadrado(s).`
              },
              ...getSnapshot(),
              movementPath: []
            });
            return;
          }
        }
      }

      const result = engine.executeAction(action);
      const snapshot = getSnapshot();

      sendJson(response, result.success ? 200 : 400, {
        actionResult: result,
        ...snapshot,
        movementPath: result.success ? movementPath : []
      });
      return;
    }

    sendJson(response, 404, {
      success: false,
      message: "Endpoint não encontrado."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";

    sendJson(response, 500, {
      success: false,
      message
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`D&D Game Core listening on http://${HOST}:${PORT}`);
});
