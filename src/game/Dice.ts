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
): number {
  let total = 0;

  for (
    let i = 0;
    i < count;
    i++
  ) {
    total += rollDie(sides);
  }

  return total;
}