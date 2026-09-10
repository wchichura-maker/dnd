import type { GameState } from "./GameState";
import type { GameAction } from "../actions/Action";
import type { ActionResult } from "../actions/ActionResult";

import {
  findPath
} from "../rules/Pathfinding";

import {
  attack
} from "../CombatRules";

import {
  equipItem,
  unequipWeapon,
  unequipArmor,
  unequipShield
} from "../inventory/InventorySystem";

import {
  getArmorClass
} from "../rules/DefenseRules";

import {
  isWithinWeaponRange,
  getCombatDistance
} from "../rules/RangeRules";

import {
  getEntityAtPosition
} from "../rules/OccupancyRules";

import {
  canUseStandardAction,
  canUseMoveAction,
  canTakeFiveFootStep,
  consumeStandardAction,
  consumeMoveAction,
  consumeFiveFootStep,
  registerMovement
} from "../rules/TurnRules";

import {
  createTurn
} from "../Turn";

import {
  createCombat
} from "../CombatState";

import {
  canAct,
  canMove,
  getHitPointState,
  isDead,
  resolveDyingState
} from "../rules/ConditionRules";

import {
  rollDie
} from "../Dice";


export class GameEngine {

  private state: GameState;


  constructor(
    initialState: GameState
  ) {
    this.state =
      initialState;
  }


  getState(): GameState {
    return this.state;
  }


  setState(
    state: GameState
  ): void {
    this.state =
      state;
  }


  isExplorationMode(): boolean {
    return this.state.mode === "EXPLORATION";
  }


  isCombatMode(): boolean {
    return this.state.mode === "COMBAT";
  }


  startCombat(combatantIds?: string[]): ActionResult {
    if (this.isCombatMode()) {
      return { success: false, message: "O jogo já está em combate." };
    }

    const selectedIds = combatantIds ?? this.state.entities.filter(entity => !isDead(entity)).map(entity => entity.id);
    const combatants = this.state.entities.filter(entity => selectedIds.includes(entity.id) && !isDead(entity));

    if (combatants.length < 2) {
      return { success: false, message: "São necessários pelo menos dois combatentes para iniciar o combate." };
    }

    const createdCombat = createCombat(combatants);
    const firstCombatant = createdCombat.combatants[createdCombat.combat.currentTurnIndex];

    if (!firstCombatant) {
      return { success: false, message: "Não foi possível determinar o primeiro combatente." };
    }

    this.state = {
      ...this.state,
      mode: "COMBAT",
      entities: this.state.entities.map(entity => createdCombat.combatants.find(item => item.id === entity.id) ?? entity),
      combat: createdCombat.combat,
      turn: createTurn(firstCombatant),
      logs: [...this.state.logs, "Combate iniciado.", `Turno de ${firstCombatant.name}.`]
    };

    return {
  success: true,
  message: "Combate iniciado."
};
  }


  endCombat(): ActionResult {
    if (this.isExplorationMode()) {
      return { success: false, message: "O jogo já está em exploração." };
    }

    this.state = {
      ...this.state,
      mode: "EXPLORATION",
      combat: { ...this.state.combat, turnOrder: [], currentTurnIndex: 0, active: false },
      turn: {
        ...this.state.turn,
        characterId: "",
        resources: {
          ...this.state.turn.resources,
          action: false,
          moveAction: false,
          freeActions: false,
          fiveFootStepAvailable: false,
          hasMoved: false,
          hasTakenFiveFootStep: false,
          movement: 0
        }
      },
      logs: [...this.state.logs, "Combate encerrado."]
    };

    return { success: true, message: "Combate encerrado." };
  }


  /*
   * --------------------------------------------------
   * ENTIDADE ATIVA
   * --------------------------------------------------
   */

  getActiveEntity() {

    const activeEntityId =
      this.state.combat
        .turnOrder[
          this.state.combat
            .currentTurnIndex
        ];


    if (
      !activeEntityId
    ) {
      return undefined;
    }


    return this.getEntity(
      activeEntityId
    );
  }


  /*
   * --------------------------------------------------
   * EXECUTA AÇÃO
   * --------------------------------------------------
   */

  executeAction(
    action: GameAction
  ): ActionResult {

    if (this.isExplorationMode()) {
      return this.executeExplorationAction(action);
    }

    const activeEntity =
      this.getActiveEntity();


    if (!activeEntity) {
      return {
        success: false,
        message:
          "Entidade ativa não encontrada."
      };
    }


    if (
      action.actorId !==
      activeEntity.id
    ) {
      return {
        success: false,
        message:
          "Não é o turno desta entidade."
      };
    }


    /*
     * Uma criatura morta, morrendo ou inconsciente
     * não pode executar ações.
     */

    if (
      !canAct(activeEntity)
    ) {
      return {
        success: false,
        message:
          `${activeEntity.name} não pode realizar ações neste estado.`
      };
    }


    switch (
      action.type
    ) {

      case "MOVE":
        return this.executeMove(
          action,
          false
        );

      case "FIVE_FOOT_STEP":
        return this.executeMove(
          action,
          true
        );


      case "ATTACK":
        return this.executeAttack(
          action
        );


      case "EQUIP":
        return this.executeEquip(
          action
        );


      case "UNEQUIP":
        return this.executeUnequip(
          action
        );


      case "WAIT":
        return {
          success: true,
          message:
            `${activeEntity.name} aguardou.`
        };


      default:
        return {
          success: false,
          message:
            "Ação desconhecida."
        };
    }
  }


  /*
   * --------------------------------------------------
   * FINALIZA TURNO
   * --------------------------------------------------
   */

  endTurn(): ActionResult {

    if (this.isExplorationMode()) {
      return { success: false, message: "Não existem turnos durante a exploração." };
    }

    const currentEntity =
      this.getActiveEntity();


    if (!currentEntity) {
      return {
        success: false,
        message:
          "Entidade ativa não encontrada."
      };
    }


    let turnOrder =
      [
        ...this.state.combat
          .turnOrder
      ];


    if (
      turnOrder.length === 0
    ) {
      return {
        success: false,
        message:
          "A ordem de iniciativa está vazia."
      };
    }


    /*
     * --------------------------------------------------
     * REMOVE MORTOS
     * --------------------------------------------------
     *
     * Uma criatura DEAD deixa de participar
     * da iniciativa.
     *
     * Ela continua existindo em entities para
     * representar o cadáver no mundo.
     */

    turnOrder =
      turnOrder.filter(
        entityId => {

          const entity =
            this.getEntity(
              entityId
            );

          if (!entity) {
            return false;
          }

          return !isDead(
            entity
          );
        }
      );


    /*
     * Se não existem mais combatentes suficientes
     * para continuar o encontro, encerra o combate.
     */

    if (
      turnOrder.length === 0
    ) {

      this.endCombat();


      return {
        success: true,
        message:
          "Combate encerrado."
      };
    }


    /*
     * --------------------------------------------------
     * DESCOBRE O ÍNDICE DO ATUAL
     * --------------------------------------------------
     */

    const currentIndex =
      turnOrder.indexOf(
        currentEntity.id
      );


    /*
     * Caso a entidade atual tenha sido removida
     * da iniciativa, começa pelo primeiro combatente.
     */

    const baseIndex =
      currentIndex >= 0
        ? currentIndex
        : -1;


    /*
     * --------------------------------------------------
     * PROCURA PRÓXIMO COMBATENTE
     * --------------------------------------------------
     */

    let nextIndex =
      (
        baseIndex + 1
      ) % turnOrder.length;


    let nextEntity =
      this.getEntity(
        turnOrder[
          nextIndex
        ]
      );


    /*
     * Segurança contra referências inválidas.
     */

    let attempts = 0;


    while (
      !nextEntity &&
      attempts <
        turnOrder.length
    ) {

      nextIndex =
        (
          nextIndex + 1
        ) % turnOrder.length;

      nextEntity =
        this.getEntity(
          turnOrder[
            nextIndex
          ]
        );

      attempts++;
    }


    if (!nextEntity) {

      this.endCombat();
      this.state = { ...this.state, logs: [...this.state.logs, "Combate encerrado: nenhum combatente válido."] };


      return {
        success: true,
        message:
          "Combate encerrado."
      };
    }


    /*
     * --------------------------------------------------
     * PROCESSAMENTO DE DYING
     * --------------------------------------------------
     *
     * Criaturas Dying não realizam ações.
     *
     * No início do turno delas fazemos o teste
     * de estabilização.
     */

    const processed =
      this.processStartOfTurn(
        nextEntity
      );

    if (!processed) {
      this.endCombat();
      this.state = { ...this.state, logs: [...this.state.logs, "Combate encerrado: combatente inválido."] };

      return {
        success: true,
        message: "Combate encerrado."
      };
    }


    /*
     * A criatura pode ter morrido durante o
     * processamento do turno.
     */

    if (
      isDead(processed)
    ) {

      turnOrder =
        turnOrder.filter(
          id =>
            id !==
            processed.id
        );


      if (
        turnOrder.length === 0
      ) {

        this.endCombat();
        this.state = { ...this.state, logs: [...this.state.logs, `${processed.name} morreu.`] };


        return {
          success: true,
          message:
            "Combate encerrado."
        };
      }


      /*
       * Procura novamente o próximo combatente.
       */

      nextIndex =
        nextIndex %
        turnOrder.length;

      nextEntity =
        this.getEntity(
          turnOrder[
            nextIndex
          ]
        );


      if (!nextEntity) {

        nextEntity =
          this.getFirstLivingCombatant(
            turnOrder
          );
      }


      if (!nextEntity) {

        this.state = {
          ...this.state,

          combat: {
            ...this.state.combat,

            turnOrder: [],
            currentTurnIndex: 0
          },

          logs: [
            ...this.state.logs,

            "Combate encerrado."
          ]
        };


        return {
          success: true,
          message:
            "Combate encerrado."
        };
      }
    }


    /*
     * --------------------------------------------------
     * ATUALIZA TURNO
     * --------------------------------------------------
     */

    const finalIndex =
      turnOrder.indexOf(
        nextEntity.id
      );


    const nextTurn =
      createTurn(
        nextEntity
      );


    this.state = {
      ...this.state,

      entities:
        this.state.entities.map(
          entity =>
            entity.id ===
            processed.id
              ? processed
              : entity
        ),

      combat: {
        ...this.state.combat,

        turnOrder,

        currentTurnIndex:
          finalIndex >= 0
            ? finalIndex
            : 0
      },

      turn:
        nextTurn,

      logs: [
        ...this.state.logs,

        `${currentEntity.name} encerrou o turno.`,

        `Turno de ${nextEntity.name}.`
      ]
    };


    /*
     * --------------------------------------------------
     * STATUS QUE IMPEDE AÇÃO
     * --------------------------------------------------
     *
     * O turno continua existindo na iniciativa,
     * mas é automaticamente encerrado quando a
     * criatura não pode agir.
     */

    if (
      !canAct(nextEntity)
    ) {

      this.state = {
        ...this.state,

        logs: [
          ...this.state.logs,

          `${nextEntity.name} não pode realizar ações. Turno passado automaticamente.`
        ]
      };


      return this.endTurn();
    }


    /*
     * --------------------------------------------------
     * RETORNO
     * --------------------------------------------------
     */

    return {
      success: true,

      message:
        `Turno de ${nextEntity.name}.`,

      data: {
        position:
          nextEntity.position
      }
    };
  }


  /*
   * --------------------------------------------------
   * INÍCIO DO TURNO
   * --------------------------------------------------
   */

  private processStartOfTurn(
  entity: ReturnType<GameEngine["getEntity"]>
): ReturnType<GameEngine["getEntity"]> {

  if (!entity) {
    return undefined;
  }

  /*
   * DEAD não deveria chegar aqui,
   * mas mantemos a proteção.
   */

  if (
    isDead(entity)
  ) {
    return entity;
  }

  /*
   * --------------------------------------------------
   * DYING
   * --------------------------------------------------
   */

  if (
    getHitPointState(entity) ===
    "DYING"
  ) {

    /*
     * D&D 3.5:
     * 10% de chance de estabilizar.
     */

    const stabilizationRoll =
      rollDie(100);

    const result =
      resolveDyingState(
        entity,
        stabilizationRoll
      );

    /*
     * --------------------------------------------------
     * ESTABILIZOU
     * --------------------------------------------------
     */

    if (
      result.stabilized
    ) {

      this.state = {
        ...this.state,

        logs: [
          ...this.state.logs,

          `${entity.name} fez um teste de estabilização: ${stabilizationRoll}%.`,

          `${entity.name} está ESTABILIZADO.`
        ]
      };

      return result.combatant;
    }

    /*
     * --------------------------------------------------
     * FALHOU
     * --------------------------------------------------
     */

    this.state = {
      ...this.state,

      logs: [
        ...this.state.logs,

        `${entity.name} fez um teste de estabilização: ${stabilizationRoll}%.`,

        `${entity.name} falhou e perdeu 1 HP. ${entity.hp} → ${result.combatant.hp} HP.`
      ]
    };

    return result.combatant;
  }

  return entity;
}


  /*
   * --------------------------------------------------
   * PRIMEIRO COMBATENTE VIVO
   * --------------------------------------------------
   */

  private getFirstLivingCombatant(
    turnOrder: string[]
  ) {

    for (
      const entityId of turnOrder
    ) {

      const entity =
        this.getEntity(
          entityId
        );


      if (
        entity &&
        !isDead(entity)
      ) {
        return entity;
      }
    }


    return undefined;
  }


  /*
   * --------------------------------------------------
   * MOVIMENTO
   * --------------------------------------------------
   */

  private executeMove(
  action: GameAction,
  isFiveFootStep: boolean
): ActionResult {

  if (
    !action.destination
  ) {
    return {
      success: false,
      message:
        "Destino não informado."
    };
  }

  const actor =
    this.getEntity(
      action.actorId
    );

  if (!actor) {
    return {
      success: false,
      message:
        "Entidade não encontrada."
    };
  }

  if (
    !canMove(actor)
  ) {
    return {
      success: false,
      message:
        `${actor.name} não pode se mover neste estado.`
    };
  }

  /*
 * O tipo da ação determina se estamos
 * executando movimento normal ou
 * 5-foot step.
 *
 * MOVE:
 * movimento normal usando o deslocamento
 * disponível.
 *
 * FIVE_FOOT_STEP:
 * exatamente 1 casa, sem consumir
 * deslocamento.
 */
if (isFiveFootStep) {

  /*
   * O 5-foot step só pode acontecer
   * depois que a ação padrão já foi
   * utilizada.
   *
   * Isso impede que o primeiro movimento
   * do turno seja interpretado como
   * 5-foot step.
   */
  if (
    this.state.turn.resources.action
  ) {
    return {
      success: false,
      message:
        "O 5-foot step só pode ser realizado após a ação padrão."
    };
  }

  if (
    !canTakeFiveFootStep(
      this.state.turn
    )
  ) {
    return {
      success: false,
      message:
        "O 5-foot step não está disponível."
    };
  }

} else {

  /*
   * Movimento normal utiliza a ação
   * de movimento ou a ação padrão
   * como segunda ação de movimento.
   */
  if (
    !canUseMoveAction(
      this.state.turn
    )
  ) {
    return {
      success: false,
      message:
        "Nenhum movimento disponível."
    };
  }

  if (
    this.state.turn.resources.movement <= 0
  ) {
    return {
      success: false,
      message:
        "Nenhum movimento disponível."
    };
  }
}

  /*
   * Apenas movimento normal depende
   * do movimento restante.
   */
  if (
    !isFiveFootStep &&
    this.state.turn.resources.movement <= 0
  ) {
    return {
      success: false,
      message:
        "Nenhum movimento disponível."
    };
  }

  const destination =
    action.destination;

  if (
    destination.x ===
      actor.position.x &&
    destination.y ===
      actor.position.y
  ) {
    return {
      success: false,
      message:
        "Destino igual à posição atual."
    };
  }

  const occupyingEntity =
    getEntityAtPosition(
      destination,
      this.state.entities,
      actor.id
    );

  if (
    occupyingEntity
  ) {
    return {
      success: false,
      message:
        `Movimento bloqueado. ${occupyingEntity.name} ocupa esta casa.`
    };
  }

  const pathResult =
    findPath(
      this.state.map,
      this.state.entities,
      actor.position,
      destination,
      actor.id
    );

  if (
    !pathResult
  ) {
    return {
      success: false,
      message:
        "Não existe caminho válido até o destino."
    };
  }

  const distance =
    pathResult.cost;

  /*
   * 5-foot step precisa ser exatamente
   * uma casa de custo.
   */
  if (
    isFiveFootStep &&
    distance !== 1
  ) {
    return {
      success: false,
      message:
        "O passo de ajuste permite somente 1 casa."
    };
  }

  /*
   * Movimento normal não pode ultrapassar
   * o deslocamento restante.
   */
  if (
    !isFiveFootStep &&
    distance >
      this.state.turn.resources.movement
  ) {
    return {
      success: false,
      message:
        `Movimento insuficiente. Caminho custa ${distance}.`
    };
  }

  /*
   * O 5-foot step preserva o movimento restante.
   */
  const remainingMovement =
    isFiveFootStep
      ? this.state.turn.resources.movement
      : this.state.turn.resources.movement - distance;

  const updatedEntities =
    this.state.entities.map(
      entity => {

        if (
          entity.id !==
          actor.id
        ) {
          return entity;
        }

        return {
          ...entity,
          position:
            destination
        };
      }
    );

  let updatedTurn =
    this.state.turn;

  if (
    isFiveFootStep
  ) {

    /*
     * O 5-foot step consome apenas
     * o próprio recurso.
     */
    updatedTurn =
      consumeFiveFootStep(
        updatedTurn
      );

  } else {

    /*
     * Movimento normal consome
     * ação de movimento.
     *
     * Caso ela já tenha sido usada,
     * consumeMoveAction() utiliza
     * a ação padrão.
     */
    updatedTurn =
      consumeMoveAction(
        updatedTurn
      );

    updatedTurn =
      registerMovement(
        updatedTurn
      );

    updatedTurn = {
      ...updatedTurn,
      resources: {
        ...updatedTurn.resources,
        movement:
          remainingMovement
      }
    };
  }

  this.state = {
    ...this.state,

    entities:
      updatedEntities,

    turn:
      updatedTurn,

    logs: [
      ...this.state.logs,

      `${actor.name} percorreu ${pathResult.path.length} casa(s).`,

      `Custo do movimento: ${distance}.`,

      `Movimento restante: ${remainingMovement}.`
    ]
  };

  return {
    success: true,

    message:
      `${actor.name} moveu ${distance} quadrado(s).`,

    data: {
      distance,

      remainingMovement,

      position:
        destination
    }
  };
}


  /*
   * --------------------------------------------------
   * ATAQUE
   * --------------------------------------------------
   */

  private executeAttack(
    action: GameAction
  ): ActionResult {

    if (
      !action.targetId
    ) {
      return {
        success: false,
        message:
          "Alvo não informado."
      };
    }


    if (
      !canUseStandardAction(
        this.state.turn
      )
    ) {
      return {
        success: false,
        message:
          "Ação padrão já utilizada."
      };
    }


    const attacker =
      this.getEntity(
        action.actorId
      );


    const target =
      this.getEntity(
        action.targetId
      );


    if (!attacker) {
      return {
        success: false,
        message:
          "Atacante não encontrado."
      };
    }


    if (!target) {
      return {
        success: false,
        message:
          "Alvo não encontrado."
      };
    }


    /*
     * Não é possível atacar uma criatura morta.
     */

    if (
      isDead(target)
    ) {
      return {
        success: false,
        message:
          `${target.name} está morto e não pode ser atacado.`
      };
    }


    if (
      !isWithinWeaponRange(
        attacker,
        target
      )
    ) {

      const distance =
        getCombatDistance(
          attacker,
          target
        );


      return {
        success: false,

        message:
          `Alvo fora do alcance. Distância: ${distance}.`
      };
    }


    const result =
      attack(
        attacker,
        target
      );


    /*
     * --------------------------------------------------
     * DANO
     * --------------------------------------------------
     *
     * IMPORTANTE:
     *
     * Não usamos mais Math.max(0,...).
     *
     * O HP pode ficar negativo.
     */

    const newHp =
      result.hit
        ? target.hp -
          result.damage
        : target.hp;


    const targetAfterDamage = {
      ...target,

      hp:
        newHp
    };


    /*
     * Estado derivado depois do dano.
     */

    const hpState =
      getHitPointState(
        targetAfterDamage
      );


    const logEntries = [

      `${attacker.name} atacou ${target.name}.`,

      `D20: ${result.roll} + ${result.attackBonus} = ${result.total}.`,

      `CA do ${target.name}: ${getArmorClass(target)}.`
    ];


    if (
      result.roll === 1
    ) {

      logEntries.push(
        "1 NATURAL — FALHA AUTOMÁTICA."
      );
    }


    if (
      result.critical
    ) {

      logEntries.push(
        "CRÍTICO!"
      );
    }


    if (
      result.hit
    ) {

      logEntries.push(
        "ACERTO.",

        `Dano: ${result.damage}.`,

        `${target.name}: ${target.hp} → ${newHp} HP.`,

        `Estado: ${hpState}.`
      );


      /*
       * Morte definitiva.
       */

      if (
        hpState ===
        "DEAD"
      ) {

        logEntries.push(
          `${target.name} morreu.`
        );
      }


      /*
       * Disabled.
       */

      else if (
        hpState ===
        "DISABLED"
      ) {

        logEntries.push(
          `${target.name} está INCAPACITADO (0 HP).`
        );
      }


      /*
       * Dying.
       */

      else if (
        hpState ===
        "DYING"
      ) {

        logEntries.push(
          `${target.name} está MORRENDO.`
        );
      }

    } else {

      logEntries.push(
        "ERRO."
      );
    }


    /*
     * --------------------------------------------------
     * ATUALIZA ENTIDADES
     * --------------------------------------------------
     */

    let updatedEntities =
      this.state.entities.map(
        entity => {

          if (
            entity.id ===
            target.id
          ) {

            return targetAfterDamage;
          }


          return entity;
        }
      );


    /*
     * --------------------------------------------------
     * REMOVE MORTO DA INICIATIVA
     * --------------------------------------------------
     *
     * O cadáver continua em entities,
     * mas deixa de ocupar um turno.
     */

    let updatedTurnOrder =
      [
        ...this.state.combat
          .turnOrder
      ];


    let updatedCurrentIndex =
      this.state.combat
        .currentTurnIndex;


    if (
      hpState ===
      "DEAD"
    ) {

      const removedIndex =
        updatedTurnOrder.indexOf(
          target.id
        );


      updatedTurnOrder =
        updatedTurnOrder.filter(
          id =>
            id !==
            target.id
        );


      if (
        updatedTurnOrder.length === 0
      ) {

        updatedCurrentIndex = 0;

      } else if (
        removedIndex >= 0 &&
        removedIndex <
          updatedCurrentIndex
      ) {

        updatedCurrentIndex--;
      }


      if (
        updatedCurrentIndex >=
        updatedTurnOrder.length
      ) {

        updatedCurrentIndex = 0;
      }
    }


    const updatedTurn =
      consumeStandardAction(
        this.state.turn
      );


    /*
     * --------------------------------------------------
     * ATUALIZA ESTADO
     * --------------------------------------------------
     */

    this.state = {
      ...this.state,

      entities:
        updatedEntities,

      combat: {
        ...this.state.combat,

        turnOrder:
          updatedTurnOrder,

        currentTurnIndex:
          updatedCurrentIndex
      },

      turn:
        updatedTurn,

      logs: [
        ...this.state.logs,
        ...logEntries
      ]
    };


    /*
     * --------------------------------------------------
     * VERIFICA FIM DO COMBATE
     * --------------------------------------------------
     *
     * Nesta primeira implementação,
     * o combate termina quando não existe mais
     * nenhum participante além de um único
     * combatente na iniciativa.
     */

    if (
      updatedTurnOrder.length <= 1
    ) {

      this.endCombat();
    }


    return {
      success: true,

      message:
        result.hit
          ? `ACERTO. Dano: ${result.damage}.`
          : "ERRO.",

      data: {
        attack:
          result
      }
    };
  }


  /*
   * --------------------------------------------------
   * EQUIPAR
   * --------------------------------------------------
   */

  private executeEquip(
    action: GameAction
  ): ActionResult {

    if (
      !action.itemId
    ) {
      return {
        success: false,
        message:
          "Item não informado."
      };
    }


    if (
      !canUseStandardAction(
        this.state.turn
      )
    ) {
      return {
        success: false,
        message:
          "Ação padrão já utilizada."
      };
    }


    const actor =
      this.getEntity(
        action.actorId
      );


    if (!actor) {
      return {
        success: false,
        message:
          "Entidade não encontrada."
      };
    }


    const result =
      equipItem(
        actor,
        action.itemId
      );


    if (!result.success) {
      return {
        success: false,
        message:
          result.message
      };
    }


    const updatedEntities =
      this.state.entities.map(
        entity => {

          if (
            entity.id !==
            actor.id
          ) {
            return entity;
          }


          return result.combatant;
        }
      );


    const updatedTurn =
      consumeStandardAction(
        this.state.turn
      );


    this.state = {
      ...this.state,

      entities:
        updatedEntities,

      turn:
        updatedTurn,

      logs: [
        ...this.state.logs,
        result.message
      ]
    };


    return {
      success: true,

      message:
        result.message,

      data: {
        itemId:
          action.itemId
      }
    };
  }


  /*
   * --------------------------------------------------
   * DESEQUIPAR
   * --------------------------------------------------
   */

  private executeUnequip(
    action: GameAction
  ): ActionResult {

    if (
      !action.equipmentSlot
    ) {
      return {
        success: false,
        message:
          "Slot de equipamento não informado."
      };
    }


    if (
      !canUseStandardAction(
        this.state.turn
      )
    ) {
      return {
        success: false,
        message:
          "Ação padrão já utilizada."
      };
    }


    const actor =
      this.getEntity(
        action.actorId
      );


    if (!actor) {
      return {
        success: false,
        message:
          "Entidade não encontrada."
      };
    }


    let result;


    switch (
      action.equipmentSlot
    ) {

      case "WEAPON":

        result =
          unequipWeapon(
            actor
          );

        break;


      case "ARMOR":

        result =
          unequipArmor(
            actor
          );

        break;


      case "SHIELD":

        result =
          unequipShield(
            actor
          );

        break;


      default:

        return {
          success: false,
          message:
            "Slot de equipamento inválido."
        };
    }


    if (!result.success) {
      return {
        success: false,
        message:
          result.message
      };
    }


    const updatedEntities =
      this.state.entities.map(
        entity => {

          if (
            entity.id !==
            actor.id
          ) {
            return entity;
          }


          return result.combatant;
        }
      );


    const updatedTurn =
      consumeStandardAction(
        this.state.turn
      );


    this.state = {
      ...this.state,

      entities:
        updatedEntities,

      turn:
        updatedTurn,

      logs: [
        ...this.state.logs,
        result.message
      ]
    };


    return {
      success: true,

      message:
        result.message,

      data: {
        equipmentSlot:
          action.equipmentSlot
      }
    };
  }


  /*
   * --------------------------------------------------
   * EXPLORAÇÃO
   * --------------------------------------------------
   */

  private executeExplorationAction(action: GameAction): ActionResult {
    const actor = this.getEntity(action.actorId);

    if (!actor) return { success: false, message: "Entidade não encontrada." };

    switch (action.type) {
      case "MOVE":
        return this.executeExplorationMove(actor, action.destination);
      case "WAIT":
        this.state = { ...this.state, logs: [...this.state.logs, `${actor.name} aguardou.`] };
        return { success: true, message: `${actor.name} aguardou.` };
      case "EQUIP":
        return this.executeExplorationEquip(action, actor);
      case "UNEQUIP":
        return this.executeExplorationUnequip(action, actor);
      case "ATTACK":
        return { success: false, message: "Ataques só podem ser realizados durante o combate." };
      default:
        return { success: false, message: "Ação desconhecida." };
    }
  }


  private executeExplorationMove(
    actor: NonNullable<ReturnType<GameEngine["getEntity"]>>,
    destination: GameAction["destination"]
  ): ActionResult {
    if (!destination) return { success: false, message: "Destino não informado." };
    if (destination.x === actor.position.x && destination.y === actor.position.y) {
      return { success: false, message: "Destino igual à posição atual." };
    }

    const occupyingEntity = getEntityAtPosition(destination, this.state.entities, actor.id);
    if (occupyingEntity) {
      return { success: false, message: `Movimento bloqueado. ${occupyingEntity.name} ocupa esta casa.` };
    }

    const pathResult = findPath(this.state.map, this.state.entities, actor.position, destination, actor.id);
    if (!pathResult) return { success: false, message: "Não existe caminho válido até o destino." };

    this.state = {
      ...this.state,
      entities: this.state.entities.map(entity => entity.id === actor.id ? { ...entity, position: destination } : entity),
      logs: [...this.state.logs, `${actor.name} percorreu ${pathResult.path.length} casa(s).`]
    };

    return {
      success: true,
      message: `${actor.name} moveu ${pathResult.cost} quadrado(s).`,
      data: { distance: pathResult.cost, remainingMovement: 0, position: destination }
    };
  }


  private executeExplorationEquip(
    action: GameAction,
    actor: NonNullable<ReturnType<GameEngine["getEntity"]>>
  ): ActionResult {
    if (!action.itemId) return { success: false, message: "Item não informado." };
    const result = equipItem(actor, action.itemId);
    if (!result.success) return { success: false, message: result.message };
    this.state = { ...this.state, entities: this.state.entities.map(entity => entity.id === actor.id ? result.combatant : entity), logs: [...this.state.logs, result.message] };
    return { success: true, message: result.message, data: { itemId: action.itemId } };
  }


  private executeExplorationUnequip(
    action: GameAction,
    actor: NonNullable<ReturnType<GameEngine["getEntity"]>>
  ): ActionResult {
    if (!action.equipmentSlot) return { success: false, message: "Slot de equipamento não informado." };
    let result;
    switch (action.equipmentSlot) {
      case "WEAPON": result = unequipWeapon(actor); break;
      case "ARMOR": result = unequipArmor(actor); break;
      case "SHIELD": result = unequipShield(actor); break;
      default: return { success: false, message: "Slot de equipamento inválido." };
    }
    if (!result.success) return { success: false, message: result.message };
    this.state = { ...this.state, entities: this.state.entities.map(entity => entity.id === actor.id ? result.combatant : entity), logs: [...this.state.logs, result.message] };
    return { success: true, message: result.message, data: { equipmentSlot: action.equipmentSlot } };
  }


  /*
   * --------------------------------------------------
   * BUSCA ENTIDADE
   * --------------------------------------------------
   */

  private getEntity(
    id: string
  ) {

    return this.state.entities.find(
      entity =>
        entity.id ===
        id
    );
  }
}