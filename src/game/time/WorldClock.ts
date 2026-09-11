export const WORLD_DAY_SECONDS = 24 * 60 * 60;
export const COMBAT_ROUND_SECONDS = 6;

export type WorldClockState = {
  totalSeconds: number;
};

export function createWorldClock(initialSeconds = 0): WorldClockState {
  return {
    totalSeconds: Math.max(0, Math.floor(initialSeconds))
  };
}

export function advanceWorldClock(clock: WorldClockState, seconds: number): WorldClockState {
  return {
    totalSeconds: Math.max(clock.totalSeconds, clock.totalSeconds + Math.max(0, Math.floor(seconds)))
  };
}

export function getWorldDay(totalSeconds: number): number {
  return Math.floor(Math.max(0, totalSeconds) / WORLD_DAY_SECONDS) + 1;
}

export function getTimeOfDay(totalSeconds: number): { hour: number; minute: number; second: number } {
  const normalized = Math.max(0, Math.floor(totalSeconds)) % WORLD_DAY_SECONDS;
  return {
    hour: Math.floor(normalized / 3600),
    minute: Math.floor((normalized % 3600) / 60),
    second: normalized % 60
  };
}
