export type EncounterResolutionReason =
  | "ARREST"
  | "SURRENDER"
  | "FLEE"
  | "BLUFF"
  | "PERSUASION"
  | "INTIMIDATION"
  | "NEGOTIATION"
  | "OTHER";

export type EncounterResponse = "ACCEPT" | "REJECT";

export type EncounterResolution = {
  success: boolean;
  response: EncounterResponse;
  reason: EncounterResolutionReason;
  message: string;
};

export function resolveEncounterResponse(
  reason: EncounterResolutionReason,
  accepted: boolean
): EncounterResolution {
  return {
    success: accepted,
    response: accepted ? "ACCEPT" : "REJECT",
    reason,
    message: accepted ? "O alvo aceitou a proposta." : "O alvo recusou a proposta."
  };
}
