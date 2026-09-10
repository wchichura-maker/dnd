import {
  playerCharacter
} from "../Character";

import {
  getAbilityModifier
} from "../rules/AbilityRules";

import {
  getBaseAttackBonus,
  getMeleeAttackBonus,
  getWeaponDamage
} from "../rules/AttackRules";

import {
  getArmorClass,
  getTouchArmorClass,
  getFlatFootedArmorClass
} from "../rules/DefenseRules";

import {
  addItem,
  hasItem,
  equipItem,
  unequipShield
} from "../inventory/InventorySystem";

import {
  lightShield
} from "../entities/Shields";

import {
  createTurn
} from "../Turn";

import {
  GameEngine
} from "../core/GameEngine";

import {
  createInitialGameState
} from "../core/createInitialGameState";

import {
  canUseStandardAction,
  canUseMoveAction,
  canUseFullRoundAction,
  canTakeFiveFootStep,
  consumeStandardAction,
  consumeMoveAction,
  consumeFullRoundAction,
  registerMovement,
  resetTurn
} from "../rules/TurnRules";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `TESTE FALHOU: ${message}`
    );
  }
}

export function runRulesTests(): void {

  /*
   * ============================================
   * GAME ENGINE — INÍCIO EM EXPLORAÇÃO
   * ============================================
   */

  const initialGameState =
    createInitialGameState();

  const engine =
    new GameEngine(
      initialGameState
    );


  assert(
    engine.getState().mode ===
      "EXPLORATION",
    "O jogo deveria começar em modo de exploração."
  );


  assert(
    engine.getActiveEntity() ===
      undefined,
    "Durante a exploração não deveria existir uma entidade ativa de combate."
  );


  console.log(
    "✓ GameEngine — início em exploração"
  );


  /*
   * ============================================
   * GAME ENGINE — INÍCIO DO COMBATE
   * ============================================
   */

  const startCombatResult =
    engine.startCombat();


  assert(
    startCombatResult.success,
    "Iniciar combate deveria funcionar."
  );


  assert(
    engine.getState().mode ===
      "COMBAT",
    "Depois de iniciar combate o modo deveria ser COMBAT."
  );


  const initialActive =
    engine.getActiveEntity();


  assert(
    initialActive !==
      undefined,
    "Depois de iniciar combate deveria existir uma entidade ativa."
  );


  const initialActiveId =
    initialActive?.id;


  assert(
    initialActiveId ===
      "player-01" ||
    initialActiveId ===
      "orc-01",
    "A entidade ativa deveria pertencer à ordem de combate."
  );


  console.log(
    "✓ GameEngine — início do combate"
  );


  /*
   * ============================================
   * GAME ENGINE — FINALIZAÇÃO DE TURNO
   * ============================================
   */

  const endTurnResult =
    engine.endTurn();


  assert(
    endTurnResult.success,
    "Finalizar turno deveria funcionar."
  );


  const nextActive =
    engine.getActiveEntity();


  assert(
    nextActive !==
      undefined,
    "Depois de finalizar o turno deveria existir uma nova entidade ativa."
  );


  assert(
    nextActive?.id !==
      initialActiveId,
    "Depois de finalizar o turno deveria mudar a entidade ativa."
  );


  assert(
    engine.getState()
      .turn.characterId ===
      nextActive?.id,
    "O Turn deveria pertencer à nova entidade ativa."
  );


  assert(
    engine.getState()
      .turn.resources.action,
    "A nova entidade deveria começar com ação padrão disponível."
  );


  assert(
    engine.getState()
      .turn.resources.moveAction,
    "A nova entidade deveria começar com ação de movimento disponível."
  );


  assert(
    engine.getState()
      .turn.resources.movement ===
      nextActive?.movement,
    "A nova entidade deveria começar com seu deslocamento completo."
  );


  console.log(
    "✓ GameEngine — finalização de turno"
  );


  /*
   * ============================================
   * GAME ENGINE — RETORNO À EXPLORAÇÃO
   * ============================================
   */

  const endCombatResult =
    engine.endCombat();


  assert(
    endCombatResult.success,
    "Encerrar combate deveria funcionar."
  );


  assert(
    engine.getState().mode ===
      "EXPLORATION",
    "Depois de encerrar combate o modo deveria voltar para exploração."
  );


  assert(
    engine.getActiveEntity() ===
      undefined,
    "Depois de encerrar combate não deveria existir entidade ativa de combate."
  );


  console.log(
    "✓ GameEngine — encerramento do combate"
  );


  /*
   * ============================================
   * GAME ENGINE — NOVO COMBATE
   * ============================================
   */

  const secondCombatResult =
    engine.startCombat();


  assert(
    secondCombatResult.success,
    "Deveria ser possível iniciar um novo combate depois de encerrá-lo."
  );


  assert(
    engine.getState().mode ===
      "COMBAT",
    "O novo combate deveria colocar o jogo novamente em COMBAT."
  );


  assert(
    engine.getActiveEntity() !==
      undefined,
    "O novo combate deveria possuir uma entidade ativa."
  );


  console.log(
    "✓ GameEngine — reinício do combate"
  );


  console.log(
    "=============================="
  );


  console.log(
    "INICIANDO TESTES DO RULES ENGINE"
  );


  console.log(
    "=============================="
  );


  /*
   * ATRIBUTOS
   */

  assert(
    getAbilityModifier(10) === 0,
    "10 deveria gerar modificador 0."
  );

  assert(
    getAbilityModifier(16) === 3,
    "16 deveria gerar modificador +3."
  );

  assert(
    getAbilityModifier(9) === -1,
    "9 deveria gerar modificador -1."
  );

  console.log(
    "✓ Modificadores de atributos"
  );

  /*
   * ATAQUE
   */

  assert(
    getBaseAttackBonus(
      playerCharacter
    ) === 1,
    "Kael deveria possuir BAB +1."
  );

  console.log(
    "✓ BAB"
  );

  assert(
    getMeleeAttackBonus(
      playerCharacter
    ) === 4,
    "Kael deveria possuir ataque corpo a corpo +4."
  );

  console.log(
    "✓ Bônus de ataque"
  );

  assert(
    getWeaponDamage(
      playerCharacter
    ) === "1d8",
    "Espada Longa deveria causar 1d8."
  );

  console.log(
    "✓ Arma"
  );

  /*
   * DEFESA
   */

  assert(
    getArmorClass(
      playerCharacter
    ) === 18,
    "CA de Kael deveria ser 18."
  );

  console.log(
    "✓ Classe de Armadura"
  );

  assert(
    getTouchArmorClass(
      playerCharacter
    ) === 12,
    "CA de toque de Kael deveria ser 12."
  );

  console.log(
    "✓ CA de toque"
  );

  assert(
    getFlatFootedArmorClass(
      playerCharacter
    ) === 16,
    "CA desprevenido de Kael deveria ser 16."
  );

  console.log(
    "✓ CA desprevenido"
  );

  /*
   * TESTE ESPECÍFICO DA CA DE TOQUE
   *
   * DEX alta + armadura com limite baixo.
   */

  const highDexCharacter = {
    ...playerCharacter,

    dnd: {
      ...playerCharacter.dnd,

      abilities: {
        ...playerCharacter.dnd.abilities,
        dexterity: 18
      },

      equipment: {
        ...playerCharacter.dnd.equipment,

        armor: {
          id: "test-full-plate",
          name: "Armadura Completa",
          armorBonus: 8,
          maxDexterityBonus: 1,
          armorCheckPenalty: -6,
          arcaneSpellFailure: 35
        }
      }
    }
  };

  assert(
    getTouchArmorClass(
      highDexCharacter
    ) === 14,
    "CA de toque deve usar a Destreza completa, sem limite da armadura."
  );

  console.log(
    "✓ CA de toque ignora limite de DEX da armadura"
  );

  /*
   * INVENTÁRIO
   */

  assert(
    hasItem(
      playerCharacter,
      "heavy-shield"
    ),
    "Kael deveria possuir o escudo pesado."
  );

  console.log(
    "✓ Inventário"
  );

  const addedItemResult =
    addItem(
      playerCharacter,
      {
        id:
          "test-light-shield",

        templateId:
          "light-shield",

        name:
          lightShield.name,

        type:
          "SHIELD",

        quantity:
          1
      }
    );

  assert(
    addedItemResult.success,
    "Adicionar item deveria funcionar."
  );

  assert(
    hasItem(
      addedItemResult.combatant,
      "light-shield"
    ),
    "O escudo leve deveria estar no inventário."
  );

  console.log(
    "✓ Adição de item"
  );

  const equippedResult =
    equipItem(
      addedItemResult.combatant,
      "test-light-shield"
    );

  assert(
    equippedResult.success,
    "Equipar item deveria funcionar."
  );

  assert(
    equippedResult
      .combatant
      .dnd
      .equipment
      .shield
      ?.id ===
      "light-shield",
    "O escudo leve deveria estar equipado."
  );

  console.log(
    "✓ Equipamento de item"
  );

  const unequippedResult =
    unequipShield(
      equippedResult.combatant
    );

  assert(
    unequippedResult.success,
    "Desequipar escudo deveria funcionar."
  );

  assert(
    unequippedResult
      .combatant
      .dnd
      .equipment
      .shield ===
      undefined,
    "O escudo deveria estar desequipado."
  );

  assert(
    hasItem(
      unequippedResult.combatant,
      "light-shield"
    ),
    "O escudo deveria retornar ao inventário."
  );

  console.log(
    "✓ Desequipamento de item"
  );

  /*
   * ECONOMIA DE AÇÕES
   */

  const initialTurn =
    createTurn(
      playerCharacter
    );

  assert(
    canUseStandardAction(
      initialTurn
    ),
    "O turno deveria começar com ação padrão disponível."
  );

  assert(
    canUseMoveAction(
      initialTurn
    ),
    "O turno deveria começar com ação de movimento disponível."
  );

  assert(
    canUseFullRoundAction(
      initialTurn
    ),
    "O turno deveria começar permitindo ação de rodada completa."
  );

  assert(
    canTakeFiveFootStep(
      initialTurn
    ),
    "O passo de ajuste deveria estar disponível no início."
  );

  console.log(
    "✓ Recursos iniciais do turno"
  );

  /*
   * AÇÃO PADRÃO
   */

  const afterStandardAction =
    consumeStandardAction(
      initialTurn
    );

  assert(
    !afterStandardAction
      .resources
      .action,
    "A ação padrão deveria ser consumida."
  );

  assert(
    afterStandardAction
      .resources
      .moveAction,
    "A ação de movimento deveria continuar disponível."
  );

  assert(
    !canUseFullRoundAction(
      afterStandardAction
    ),
    "Depois da ação padrão não deveria ser possível iniciar uma ação de rodada completa."
  );

  console.log(
    "✓ Consumo da ação padrão"
  );

  /*
   * PRIMEIRA AÇÃO DE MOVIMENTO
   */

  const afterMoveAction =
    consumeMoveAction(
      initialTurn
    );

  assert(
    !afterMoveAction
      .resources
      .moveAction,
    "A ação de movimento deveria ser consumida."
  );

  assert(
    afterMoveAction
      .resources
      .action,
    "A ação padrão deveria continuar disponível."
  );

  console.log(
    "✓ Consumo da ação de movimento"
  );

  /*
   * SEGUNDA AÇÃO DE MOVIMENTO
   *
   * A segunda ação usa a ação padrão.
   */

  const afterSecondMove =
    consumeMoveAction(
      afterMoveAction
    );

  assert(
    !afterSecondMove
      .resources
      .moveAction,
    "A ação de movimento deveria continuar consumida."
  );

  assert(
    !afterSecondMove
      .resources
      .action,
    "A segunda ação de movimento deveria consumir a ação padrão."
  );

  console.log(
    "✓ Segunda ação de movimento"
  );

  /*
   * AÇÃO DE RODADA COMPLETA
   */

  const afterFullRound =
    consumeFullRoundAction(
      initialTurn
    );

  assert(
    !afterFullRound
      .resources
      .action,
    "A ação padrão deveria ser consumida pela ação de rodada completa."
  );

  assert(
    !afterFullRound
      .resources
      .moveAction,
    "A ação de movimento deveria ser consumida pela ação de rodada completa."
  );

  console.log(
    "✓ Ação de rodada completa"
  );

  /*
   * PASSO DE AJUSTE
   */

  const movedTurn =
    registerMovement(
      initialTurn
    );

  assert(
    movedTurn
      .resources
      .hasMoved,
    "O turno deveria registrar que houve movimento."
  );

  assert(
    !canTakeFiveFootStep(
      movedTurn
    ),
    "O passo de ajuste não deveria estar disponível depois de movimento."
  );

  console.log(
    "✓ Controle do passo de ajuste"
  );

  /*
   * RESET DO TURNO
   */

  const spentTurn =
    consumeStandardAction(
      consumeMoveAction(
        initialTurn
      )
    );

  assert(
    !spentTurn.resources.action,
    "O turno gasto deveria estar sem ação padrão."
  );

  assert(
    !spentTurn.resources.moveAction,
    "O turno gasto deveria estar sem ação de movimento."
  );

  const reset =
    resetTurn(
      spentTurn,
      playerCharacter.movement
    );

  assert(
    reset.resources.action,
    "Novo turno deveria restaurar ação padrão."
  );

  assert(
    reset.resources.moveAction,
    "Novo turno deveria restaurar ação de movimento."
  );

  assert(
    reset.resources.freeActions,
    "Novo turno deveria restaurar ações livres."
  );

  assert(
    reset.resources.fiveFootStepAvailable,
    "Novo turno deveria restaurar passo de ajuste."
  );

  assert(
    !reset.resources.hasMoved,
    "Novo turno não deveria registrar movimento."
  );

  assert(
    reset.resources.movement ===
      playerCharacter.movement,
    "Novo turno deveria restaurar o deslocamento completo."
  );

  console.log(
    "✓ Reset do turno"
  );

  /*
   * FINAL
   */

  console.log(
    "=============================="
  );

  console.log(
    "TODOS OS TESTES PASSARAM ✓"
  );

  console.log(
    "=============================="
  );
}