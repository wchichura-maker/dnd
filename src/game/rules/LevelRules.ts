export function getExperienceForNextLevel(
  level: number
): number {
  return level * 1000;
}

export function canLevelUp(
  level: number,
  experience: number
): boolean {
  return (
    experience >=
    getExperienceForNextLevel(
      level
    )
  );
}