import type { GameState } from "./GameState";

import { createMap } from "../Map";
import { playerCharacter } from "../Character";
import { orc } from "../Combat";
import { createTurn } from "../Turn";
import { createWorldClock } from "../time/WorldClock";

export function createInitialGameState(): GameState {
  // Prototype exploration area: 120 x 80 squares.
  // One square remains 5 ft; the logical grid is unchanged.
  const map = createMap(
    120,
    80
  );

  const blockedTiles = [
    [8, 5], [9, 5], [10, 5],
    [8, 6],           [10, 6],
    [8, 7], [9, 7], [10, 7],
    [17, 9], [18, 9], [19, 9],
    [17, 10],          [19, 10],
    [17, 11], [18, 11], [19, 11]
  ];

  for (const [x, y] of blockedTiles) {
    const tile = map.tiles[y]?.[x];

    if (tile) {
      tile.walkable = false;
    }
  }

  const entities = [
    playerCharacter,
    orc
  ];

  const worldClock = createWorldClock();

  /*
   * O jogo começa em EXPLORAÇÃO.
   *
   * Ainda não existe combate ativo.
   * A iniciativa será criada somente quando
   * startCombat() for chamado pelo GameEngine.
   */
  const combat = {
    turnOrder: [],
    currentTurnIndex: 0,
    active: false
  };

  /*
   * Durante exploração o Turn não controla
   * recursos de ação.
   *
   * Mantemos um Turn válido no GameState porque
   * a estrutura atual exige esse campo.
   */
  const turn = createTurn(
    playerCharacter
  );

  return {
    map,

    entities,

    relationships: [
      {
        id: "relationship-player-orc",

        entityAId:
          playerCharacter.id,

        entityBId:
          orc.id,

        friendship: 0,
        trust: 0,
        respect: 0,
        fear: 0,
        attraction: 0,
        loyalty: 0,

        hostile: true,
        allied: false,
        rival: false,
        romantic: false
      }
    ],

    relationshipEvents: [],

    mode: "EXPLORATION",

    combat,

    turn,

    worldClock,

    hunger: {
      [playerCharacter.id]: {
        lastFoodAtSeconds: worldClock.totalSeconds,
        starvationChecks: 0,
        nonlethalDamage: 0
      },
      [orc.id]: {
        lastFoodAtSeconds: worldClock.totalSeconds,
        starvationChecks: 0,
        nonlethalDamage: 0
      }
    },

    logs: [
      "Exploração iniciada.",
      "Relógio do mundo iniciado no dia 1, 00:00."
    ]
  };
}
