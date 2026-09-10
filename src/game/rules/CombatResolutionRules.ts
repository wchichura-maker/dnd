export type CombatEndReason =
  | "DEATH"
  | "SURRENDER"
  | "FLEE"
  | "ARREST"
  | "BLUFF"
  | "PERSUASION"
  | "INTIMIDATION"
  | "NEGOTIATION"
  | "OTHER";

export function getCombatEndMessage(reason: CombatEndReason): string {
  switch (reason) {
    case "DEATH":
      return "Combate encerrado por morte dos combatentes de um dos lados.";
    case "SURRENDER":
      return "Combate encerrado por rendição.";
    case "FLEE":
      return "Combate encerrado por fuga ou retirada do confronto.";
    case "ARREST":
      return "Combate encerrado por prisão ou captura.";
    case "BLUFF":
      return "Combate encerrado após um blefe alterar o confronto.";
    case "PERSUASION":
      return "Combate encerrado após persuasão ou negociação.";
    case "INTIMIDATION":
      return "Combate encerrado após intimidação ou ameaça.";
    case "NEGOTIATION":
      return "Combate encerrado por negociação.";
    default:
      return "Combate encerrado.";
  }
}
