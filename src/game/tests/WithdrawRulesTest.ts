import { createInitialGameState } from "../core/createInitialGameState";
import { getWithdrawAoOTransitions, isProtectedWithdrawExit, withdrawLeavesThreatenedSquare } from "../rules/WithdrawRules";

export function runWithdrawRulesTests(): void {
  console.log("INICIANDO TESTES DE WITHDRAW");

  const state = createInitialGameState();
  const player = state.entities.find(entity => entity.id === "player-01");
  const orc = state.entities.find(entity => entity.id === "orc-01");
  if (!player || !orc) throw new Error("Combatentes iniciais não encontrados.");

  const path = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 3, y: 4 }
  ];

  if (!isProtectedWithdrawExit(path, path[0], 0)) {
    throw new Error("O primeiro quadrado de saída deveria ser protegido durante Withdraw.");
  }

  if (isProtectedWithdrawExit(path, path[1], 1)) {
    throw new Error("Quadrados posteriores não devem receber a proteção do primeiro quadrado.");
  }

  const transitions = getWithdrawAoOTransitions(path);
  if (transitions.length !== 2) {
    throw new Error("Withdraw deveria expor somente as transições posteriores ao primeiro quadrado para o teste de AoO.");
  }
  if (transitions[0].index !== 1 || transitions[1].index !== 2) {
    throw new Error("Índices das transições de Withdraw incorretos.");
  }

  const threatened = withdrawLeavesThreatenedSquare(
    orc,
    { x: orc.position.x + 1, y: orc.position.y },
    { x: orc.position.x + 2, y: orc.position.y },
    1,
    1
  );
  if (!threatened) throw new Error("Uma saída posterior da área ameaçada deveria provocar AoO.");

  const protectedExit = withdrawLeavesThreatenedSquare(
    orc,
    { x: orc.position.x + 1, y: orc.position.y },
    { x: orc.position.x + 2, y: orc.position.y },
    1,
    0
  );
  if (protectedExit) throw new Error("A primeira saída durante Withdraw não deveria provocar AoO.");

  console.log("✓ Primeiro quadrado de saída é protegido");
  console.log("✓ Saídas posteriores podem provocar AoO");
  console.log("✓ TESTES DE WITHDRAW PASSARAM");
}
