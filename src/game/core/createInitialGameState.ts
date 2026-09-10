import type { GameState } from "./GameState";

import { createMap } from "../Map";
import { playerCharacter } from "../Character";
import { orc } from "../Combat";
import { createTurn } from "../Turn";

export function createInitialGameState(): GameState {
  const map = createMap(
    20,
    12
  );

  const entities = [
    playerCharacter,
    orc
  ];

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

    /*
     * ESTADO INICIAL:
     *
     * EXPLORAÇÃO
     */
    mode: "EXPLORATION",

    combat,

    turn,

    logs: [
      "Exploração iniciada."
    ]
  };
}