import {
  useMemo,
  useState,
  useEffect,
  useCallback
} from "react";

import GameMap from "./components/GameMap";
import TurnPanel from "./components/TurnPanel";
import ActionLog from "./components/ActionLog";
import InitiativePanel from "./components/InitiativePanel";

import {
  GameEngine
} from "./game/core/GameEngine";

import {
  createInitialGameState
} from "./game/core/createInitialGameState";

import {
  getArmorClass
} from "./game/rules/DefenseRules";

import {
  chooseAction
} from "./game/AI";

import {
  findPath
} from "./game/rules/Pathfinding";

import type {
  Position
} from "./game/world/Position";

import type {
  AnimationState
} from "./game/entities/AnimationState";

import type {
  EntityVisualStates
} from "./game/entities/VisualState";


function App() {

  /*
   * --------------------------------------------------
   * ESTADO PRINCIPAL DO JOGO
   * --------------------------------------------------
   */

  const [
    gameState,
    setGameState
  ] = useState(
    () =>
      createInitialGameState()
  );

  /*
   * --------------------------------------------------
   * ENGINE
   * --------------------------------------------------
   */

  const gameEngine =
    useMemo(
      () =>
        new GameEngine(
          gameState
        ),
      [gameState]
    );


  /*
   * --------------------------------------------------
   * ALVO SELECIONADO
   * --------------------------------------------------
   */

  const [
    selectedTargetId,
    setSelectedTargetId
  ] = useState<
    string | undefined
  >(undefined);


  /*
   * --------------------------------------------------
   * CAMINHO VISUAL
   * --------------------------------------------------
   */

  const [
    movementPath,
    setMovementPath
  ] = useState<Position[]>([]);


  /*
   * --------------------------------------------------
   * ESTADO VISUAL DO PERSONAGEM
   * --------------------------------------------------
   */

  const [
    entityVisualStates,
    setEntityVisualStates
  ] = useState<EntityVisualStates>({});


  /*
   * --------------------------------------------------
   * TIMER DAS ANIMAÇÕES
   * --------------------------------------------------
   *
   * Guardamos o timer para poder cancelar
   * uma animação anterior quando necessário.
   */


  /*
   * --------------------------------------------------
   * DADOS DO JOGO
   * --------------------------------------------------
   */

  const {
    map,
    entities,
    combat,
    turn,
    logs
  } = gameState;


  /*
   * --------------------------------------------------
   * ENTIDADE ATIVA
   * --------------------------------------------------
   */

  const activeEntity =
  entities.find(
    entity =>
      entity.id ===
      combat.turnOrder[
        combat.currentTurnIndex
      ]
  ) ??
  entities.find(
    entity =>
      entity.type ===
      "PLAYER"
  );


  /*
   * --------------------------------------------------
   * PERSONAGEM DO JOGADOR
   * --------------------------------------------------
   */

  const character =
    entities.find(
      entity =>
        entity.type ===
        "PLAYER"
    );


  /*
   * --------------------------------------------------
   * INIMIGO
   * --------------------------------------------------
   */

  const enemy =
    entities.find(
      entity =>
        entity.type ===
        "MONSTER"
    );


  /*
   * --------------------------------------------------
   * SEGURANÇA
   * --------------------------------------------------
   */

  if (
    !activeEntity ||
    !character ||
    !enemy
  ) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial"
        }}
      >
        Erro: entidades do jogo
        não encontradas.
      </div>
    );
  }


  /*
   * --------------------------------------------------
   * ALVO SELECIONADO
   * --------------------------------------------------
   */

  const selectedTarget =
    entities.find(
      entity =>
        entity.id ===
        selectedTargetId
    );


  /*
   * --------------------------------------------------
   * MOVIMENTO EM ANDAMENTO
   * --------------------------------------------------
   */

  const isMovementAnimating =
    movementPath.length > 0;


  /*
   * --------------------------------------------------
   * BLOQUEIO VISUAL DE AÇÃO
   * --------------------------------------------------
   */

  const isAnimationPlaying =
    Object.values(entityVisualStates).some(
      visual => visual.animation !== "IDLE"
    );


  const playAnimation = useCallback((
    entityId: string,
    animation: AnimationState,
    persistent = false
  ) => {
    setEntityVisualStates(current => ({
      ...current,
      [entityId]: {
        animation,
        direction: current[entityId]?.direction ?? "SOUTH",
        spriteId: current[entityId]?.spriteId ?? entityId,
        persistent,
        statusEffects: current[entityId]?.statusEffects ?? []
      }
    }));
  }, []);

  const handleAnimationComplete = useCallback((entityId: string) => {
    setEntityVisualStates(current => ({
      ...current,
      [entityId]: {
        animation: "IDLE",
        direction: current[entityId]?.direction ?? "SOUTH",
        spriteId: current[entityId]?.spriteId ?? entityId,
        persistent: false,
        statusEffects: current[entityId]?.statusEffects ?? []
      }
    }));
  }, []);

  /*
   * --------------------------------------------------
   * SINCRONIZA ESTADO
   * --------------------------------------------------
   */

  const syncState =
    () => {
      setGameState(
        gameEngine.getState()
      );
    };


  /*
   * --------------------------------------------------
   * FINALIZA ANIMAÇÃO DE COMBATE
   * --------------------------------------------------
   */

  /*
   * --------------------------------------------------
   * CLIQUE NO MAPA
   * --------------------------------------------------
   */

  const handleTileClick = (
    x: number,
    y: number
  ) => {

    /*
     * Não permite ação durante
     * animação de movimento.
     */

    if (
      isMovementAnimating
    ) {
      return;
    }

    /*
     * Não permite nova ação durante
     * animação de combate.
     */

    if (
      isAnimationPlaying
    ) {
      return;
    }

    /*
     * Somente o jogador pode controlar
     * o personagem durante seu turno.
     */

    if (
      activeEntity.id !==
      character.id
    ) {
      console.log(
        "Não é o turno do jogador."
      );

      return;
    }

    /*
     * Procura entidade na casa clicada.
     */

    const clickedEntity =
      entities.find(
        entity =>
          entity.position.x === x &&
          entity.position.y === y
      );

    /*
     * Clique em outra entidade:
     * seleciona como alvo.
     */

    if (
      clickedEntity &&
      clickedEntity.id !==
        character.id
    ) {

      setSelectedTargetId(
        clickedEntity.id
      );

      console.log(
        `Alvo selecionado: ${clickedEntity.name}`
      );

      return;
    }

    /*
     * Clique em casa vazia:
     * limpa seleção.
     */

    setSelectedTargetId(
      undefined
    );


    /*
     * --------------------------------------------------
     * CALCULA CAMINHO
     * --------------------------------------------------
     */

    const pathResult =
      findPath(
        map,
        entities,
        character.position,
        {
          x,
          y
        },
        character.id
      );


    /*
     * Não existe caminho.
     */

    if (!pathResult) {

      console.log(
        "Não existe caminho válido até o destino."
      );

      return;
    }


    /*
     * Já estamos na casa.
     */

    if (
      pathResult.path.length === 0
    ) {
      return;
    }


    /*
     * --------------------------------------------------
     * EXECUTA MOVIMENTO
     * --------------------------------------------------
     */

    const result =
      gameEngine.executeAction({
        type: "MOVE",

        actorId:
          character.id,

        destination: {
          x,
          y
        }
      });


    /*
     * Movimento rejeitado.
     */

    if (
      !result.success
    ) {

      console.log(
        result.message
      );

      return;
    }


    /*
     * --------------------------------------------------
     * INICIA ANIMAÇÃO DE CAMINHADA
     * --------------------------------------------------
     */

    playAnimation(
      character.id,
      "WALK"
    );

    setMovementPath(
      pathResult.path
    );


    /*
     * Atualiza estado lógico.
     */

    syncState();
  };


  /*
   * --------------------------------------------------
   * FIM DA ANIMAÇÃO DE MOVIMENTO
   * --------------------------------------------------
   */

  const handleMovementAnimationComplete =
    () => {

      setMovementPath([]);

      handleAnimationComplete(character.id);
    };


  /*
   * --------------------------------------------------
   * INICIAR COMBATE
   * --------------------------------------------------
   */

  const handleStartCombat = () => {

    if (
      gameState.mode !==
      "EXPLORATION"
    ) {
      return;
    }

    if (
      !selectedTargetId
    ) {
      console.log(
        "Nenhum alvo selecionado."
      );

      return;
    }

    const target =
      entities.find(
        entity =>
          entity.id ===
          selectedTargetId
      );

    if (!target) {
      return;
    }

    if (
      target.type !==
      "MONSTER"
    ) {
      console.log(
        "O alvo selecionado não pode iniciar um combate."
      );

      return;
    }

    const result =
      gameEngine.startCombat([
        character.id,
        target.id
      ]);

    if (
      !result.success
    ) {
      console.log(
        result.message
      );

      return;
    }

    setSelectedTargetId(
      undefined
    );

    setEntityVisualStates({});

    syncState();
  };


  /*
   * --------------------------------------------------
   * ATAQUE
   * --------------------------------------------------
   */

  const handleAttack = () => {

    /*
     * Ataques só existem durante o combate.
     *
     * Esta proteção fica na própria função,
     * independentemente do estado visual do botão.
     */

    if (
      gameState.mode !==
      "COMBAT"
    ) {
      return;
    }

    if (
      isMovementAnimating ||
      isAnimationPlaying
    ) {
      return;
    }

    if (
      activeEntity.id !==
      character.id
    ) {

      console.log(
        "Não é o turno do jogador."
      );

      return;
    }

    if (
      !selectedTargetId
    ) {

      console.log(
        "Nenhum alvo selecionado."
      );

      return;
    }


    /*
     * Guarda o HP antes do ataque.
     */

    const targetBefore =
      entities.find(
        entity =>
          entity.id ===
          selectedTargetId
      );

    if (!targetBefore) {
      return;
    }

    const hpBefore =
      targetBefore.hp;


    /*
     * --------------------------------------------------
     * EXECUTA ATAQUE
     * --------------------------------------------------
     */

    const result =
      gameEngine.executeAction({
        type: "ATTACK",

        actorId:
          character.id,

        targetId:
          selectedTargetId
      });


    /*
     * Ataque rejeitado.
     */

    if (
      !result.success
    ) {

      console.log(
        result.message
      );

      return;
    }


    /*
     * Estado depois do ataque.
     */

    const updatedState =
      gameEngine.getState();

    const targetAfter =
      updatedState.entities.find(
        entity =>
          entity.id ===
          selectedTargetId
      );


    /*
     * --------------------------------------------------
     * ANIMAÇÃO DO ATACANTE
     * --------------------------------------------------
     */

    playAnimation(
      character.id,
      "ATTACK"
    );


    /*
     * --------------------------------------------------
     * ANIMAÇÃO DO ALVO
     * --------------------------------------------------
     */

    if (targetAfter) {

      if (
        targetAfter.hp <= 0
      ) {

        playAnimation(
          selectedTargetId,
          "DEATH",
          true
        );

      } else if (
        targetAfter.hp < hpBefore
      ) {

        playAnimation(
          selectedTargetId,
          "HIT"
        );
      }
    }


    /*
     * Atualiza o estado.
     */

    setGameState(
      updatedState
    );
  };


  /*
   * --------------------------------------------------
   * FINALIZAR TURNO
   * --------------------------------------------------
   */

  const handleEndTurn = () => {

    if (
      gameState.mode !==
      "COMBAT"
    ) {
      return;
    }

    /*
     * O movimento precisa terminar antes de trocar
     * de turno. Animações de combate não podem
     * deixar o turno permanentemente travado.
     */

    if (
      isMovementAnimating
    ) {
      return;
    }

    if (
      activeEntity.id !==
      character.id
    ) {
      return;
    }

    /*
     * Limpa qualquer estado visual residual antes
     * de trocar o turno.
     */

    if (isAnimationPlaying) {
      setEntityVisualStates({});
    }

    const result =
      gameEngine.endTurn();

    if (
      !result.success
    ) {

      console.log(
        result.message
      );

      return;
    }

    setSelectedTargetId(
      undefined
    );

    syncState();
  };


  /*
   * --------------------------------------------------
   * IA
   * --------------------------------------------------
   */

  useEffect(() => {

    if (
      gameState.mode !==
      "COMBAT"
    ) {
      return;
    }

    if (
      activeEntity.controller !==
      "AI"
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {

        const currentState =
          gameEngine.getState();

        const currentActive =
          currentState.entities.find(
            entity =>
              entity.id ===
              currentState
                .combat
                .turnOrder[
                  currentState
                    .combat
                    .currentTurnIndex
                ]
          );

        if (
          !currentActive
        ) {
          return;
        }

        if (
          currentActive.controller !==
          "AI"
        ) {
          return;
        }

        const player =
          currentState.entities.find(
            entity =>
              entity.type ===
              "PLAYER"
          );

        if (
          !player
        ) {
          return;
        }

        const action =
          chooseAction(
            currentActive,
            currentState.entities,
            currentState.relationships
          );

        const result =
          gameEngine.executeAction(
            action
          );

        if (
          !result.success
        ) {

          console.log(
            `IA: ${result.message}`
          );
        }

        gameEngine.endTurn();

        setGameState(
          gameEngine.getState()
        );

      }, 500);

    return () => {
      window.clearTimeout(
        timer
      );
    };

  }, [
    activeEntity.id
  ]);


  /*
   * --------------------------------------------------
   * INTERFACE
   * --------------------------------------------------
   */

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial",
        overflow: "hidden"
      }}
    >

      <header
        style={{
          height: "60px",
          background: "#1b1b1b",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom:
            "1px solid #333"
        }}
      >

        <h1>
          D&D ONLINE
        </h1>

      </header>


      <main
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0
        }}
      >

        <section
          style={{
            flex: 1,
            background: "#181818",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto"
          }}
        >

          <GameMap

            map={
              map
            }

            character={
              character
            }

            enemy={
              enemy
            }

            entities={
              entities
            }

            selectedTargetId={
              selectedTargetId
            }

            movementRemaining={
              turn.resources.movement
            }

            actionAvailable={
              turn.resources.action
            }

            fiveFootStepAvailable={
              turn.resources.fiveFootStepAvailable
            }

            isPlayerTurn={
            activeEntity.id === character.id
            }

            onTileClick={
              handleTileClick
            }

            movementPath={
              movementPath
            }

            onMovementAnimationComplete={
              handleMovementAnimationComplete
            }

            entityVisualStates={
              entityVisualStates
            }

            onAnimationComplete={
              handleAnimationComplete
            }
          />

        </section>


        <aside
          style={{
            width: "300px",
            background: "#202020",
            borderLeft:
              "1px solid #333",
            padding: "20px",
            overflowY: "auto"
          }}
        >

          <h2>
            PERSONAGEM
          </h2>


          <InitiativePanel
            combatants={
              entities
            }

            currentTurnIndex={
              combat.currentTurnIndex
            }
          />


          <TurnPanel
            turn={
              turn
            }

            characterName={
              activeEntity.name
            }

            onEndTurn={
              handleEndTurn
            }

            onAttack={
              handleAttack
            }

            isPlayerTurn={
              activeEntity.id ===
              character.id
            }
          />


          <hr />


          <h3>
            PERSONAGEM
          </h3>


          <p>
            Nome:{" "}
            {character.name}
          </p>


          <p>
            HP:{" "}
            {character.hp}
            {" / "}
            {character.maxHp}
          </p>


          <p>
            CA:{" "}
            {getArmorClass(
              character
            )}
          </p>


          <p>
            Deslocamento:{" "}
            {character.movement}
          </p>


          <p>
            Movimento restante:{" "}
            {turn.resources.movement}
          </p>


          <p>
            Posição:{" "}
            {character.position.x}
            {", "}
            {character.position.y}
          </p>


          <hr />


          <h3>
            ALVO
          </h3>


          {selectedTarget ? (

            <>
              <p>
                Nome:{" "}
                {selectedTarget.name}
              </p>

              <p>
                HP:{" "}
                {selectedTarget.hp}
                {" / "}
                {selectedTarget.maxHp}
              </p>

              {gameState.mode ===
                "EXPLORATION" &&
              selectedTarget.type ===
                "MONSTER" ? (

                <button
                  onClick={
                    handleStartCombat
                  }

                  style={{
                    background:
                      "transparent",

                    color:
                      "inherit",

                    border:
                      "1px solid currentColor",

                    padding:
                      "8px 14px",

                    cursor:
                      "pointer"
                  }}
                >
                  INICIAR COMBATE
                </button>

              ) : gameState.mode ===
                "COMBAT" ? (

                <button
                  onClick={
                    handleAttack
                  }

                  disabled={
                    activeEntity.id !==
                      character.id ||
                    !turn.resources.action ||
                    isMovementAnimating ||
                    isAnimationPlaying
                  }

                  style={{
                    background:
                      "transparent",

                    color:
                      "inherit",

                    border:
                      "1px solid currentColor",

                    padding:
                      "8px 14px",

                    cursor:
                      activeEntity.id ===
                        character.id &&
                      turn.resources.action &&
                      !isMovementAnimating &&
                      !isAnimationPlaying
                        ? "pointer"
                        : "not-allowed"
                  }}
                >
                  ATACAR
                </button>

              ) : null}
            </>

          ) : (

            <p>
              Nenhum alvo selecionado.
            </p>

          )}


          <hr />


          <h3>
            INIMIGO
          </h3>


          <p>
            Nome:{" "}
            {enemy.name}
          </p>

        </aside>

      </main>


      <footer
        style={{
          height: "180px",
          background: "#151515",
          borderTop:
            "1px solid #333",
          display: "flex"
        }}
      >

        <section
          style={{
            flex: 1,
            padding: "20px"
          }}
        >

          <h3>
            CHAT
          </h3>

          <p>
            O chat aparecerá aqui.
          </p>

        </section>


        <section
          style={{
            width: "350px",
            padding: "20px",
            borderLeft:
              "1px solid #333",
            overflow: "hidden"
          }}
        >

          <h3>
            REGISTRO
          </h3>

          <ActionLog
            logs={
              logs
            }
          />

        </section>

      </footer>

    </div>
  );
}

export default App;