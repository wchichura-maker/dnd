export function getAbilityModifier(
  abilityScore: number
): number {
  return Math.floor(
    (abilityScore - 10) / 2
  );
}