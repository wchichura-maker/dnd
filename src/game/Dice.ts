export interface DiceRoll {
  count: number;
  sides: number;
  total: number;
}

export function rollD20(): number {
  return Math.floor(
    Math.random() * 20
  ) + 1;
}

export function rollDie(
  sides: number
): number {
  return Math.floor(
    Math.random() * sides
  ) + 1;
}

export function rollDice(
  count: number,
  sides: number
): number;
export function rollDice(
  dice: string
): DiceRoll;
export function rollDice(
  countOrDice: number | string,
  sides?: number
): number | DiceRoll {
  if (typeof countOrDice === "string") {
    const match = /^(\d+)d(\d+)$/.exec(countOrDice.trim().toLowerCase());
    if (!match) {
      throw new Error(`Formato de dado inválido: ${countOrDice}`);
    }

    const count = Number(match[1]);
    const parsedSides = Number(match[2]);
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(parsedSides) || parsedSides < 1) {
      throw new Error(`Expressão de dado inválida: ${countOrDice}`);
    }

    return {
      count,
      sides: parsedSides,
      total: rollDice(count, parsedSides)
    };
  }

  if (sides === undefined) {
    throw new Error("O número de lados é obrigatório quando a quantidade é numérica.");
  }

  let total = 0;

  for (
    let i = 0;
    i < countOrDice;
    i++
  ) {
    total += rollDie(sides);
  }

  return total;
}
