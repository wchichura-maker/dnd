export type ConditionType =
  | "STABLE"
  | "STUNNED"
  | "PARALYZED"
  | "UNCONSCIOUS"
  | "DAZED"
  | "HELPLESS"
  | "BLINDED"
  | "DEAFENED"
  | "FATIGUED"
  | "EXHAUSTED"
  | "FRIGHTENED"
  | "PANICKED"
  | "SHAKEN"
  | "SICKENED"
  | "NAUSEATED"
  | "ENTANGLED"
  | "PRONE"
  | "GRAPPLED"
  | "PINNED"
  | "PETRIFIED"
  | "CONFUSED"
  | "FASCINATED"
  | "COWERING";

export type Condition = {
  type: ConditionType;

  /**
   * Duração em rodadas.
   *
   * undefined = duração controlada por outra regra
   * ou efeito permanente até ser removido.
   */
  remainingRounds?: number;

  /**
   * Identifica a origem do efeito.
   *
   * Exemplo:
   * "sleep-spell"
   * "orc-stun"
   * "poison-spider"
   */
  sourceId?: string;
};