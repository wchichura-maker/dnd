import type { Combatant } from "../entities/Combatant";
import type { SkillName } from "../entities/DndData";
import { getAbilityModifier } from "./AbilityRules";

export type SocialCheckResult = {
  skill: SkillName;
  roll: number;
  bonus: number;
  total: number;
  targetRoll?: number;
  targetBonus?: number;
  targetTotal?: number;
  dc?: number;
  success: boolean;
  margin: number;
};

export type DiplomacyAttitude =
  | "HOSTILE"
  | "UNFRIENDLY"
  | "INDIFFERENT"
  | "FRIENDLY"
  | "HELPFUL";

const DIPLOMACY_DC: Record<DiplomacyAttitude, Record<DiplomacyAttitude, number>> = {
  HOSTILE: {
    HOSTILE: Number.NEGATIVE_INFINITY,
    UNFRIENDLY: 20,
    INDIFFERENT: 25,
    FRIENDLY: 35,
    HELPFUL: 50
  },
  UNFRIENDLY: {
    HOSTILE: Number.NEGATIVE_INFINITY,
    UNFRIENDLY: 5,
    INDIFFERENT: 15,
    FRIENDLY: 25,
    HELPFUL: 40
  },
  INDIFFERENT: {
    HOSTILE: Number.NEGATIVE_INFINITY,
    UNFRIENDLY: Number.NEGATIVE_INFINITY,
    INDIFFERENT: 0,
    FRIENDLY: 15,
    HELPFUL: 30
  },
  FRIENDLY: {
    HOSTILE: Number.NEGATIVE_INFINITY,
    UNFRIENDLY: Number.NEGATIVE_INFINITY,
    INDIFFERENT: Number.NEGATIVE_INFINITY,
    FRIENDLY: 0,
    HELPFUL: 20
  },
  HELPFUL: {
    HOSTILE: Number.NEGATIVE_INFINITY,
    UNFRIENDLY: Number.NEGATIVE_INFINITY,
    INDIFFERENT: Number.NEGATIVE_INFINITY,
    FRIENDLY: Number.NEGATIVE_INFINITY,
    HELPFUL: 0
  }
};

const ATTITUDE_ORDER: DiplomacyAttitude[] = [
  "HOSTILE",
  "UNFRIENDLY",
  "INDIFFERENT",
  "FRIENDLY",
  "HELPFUL"
];

function getSkillRanks(combatant: Combatant, skill: SkillName): number {
  return Math.max(0, combatant.dnd.skills?.[skill] ?? 0);
}

function getCharismaSkillBonus(combatant: Combatant, skill: "BLUFF" | "DIPLOMACY" | "INTIMIDATE"): number {
  return getAbilityModifier(combatant.dnd.abilities.charisma) + getSkillRanks(combatant, skill);
}

function getSenseMotiveBonus(combatant: Combatant): number {
  return getAbilityModifier(combatant.dnd.abilities.wisdom) + getSkillRanks(combatant, "SENSE_MOTIVE");
}

export function getSkillBonus(combatant: Combatant, skill: SkillName): number {
  if (skill === "SENSE_MOTIVE") return getSenseMotiveBonus(combatant);
  return getCharismaSkillBonus(combatant, skill);
}

/** Bluff vs Sense Motive. Used for lies and other opposed social deception. */
export function resolveBluff(
  actor: Combatant,
  target: Combatant,
  roll: number,
  targetRoll: number
): SocialCheckResult {
  const bonus = getSkillBonus(actor, "BLUFF");
  const targetBonus = getSkillBonus(target, "SENSE_MOTIVE");
  const total = roll + bonus;
  const targetTotal = targetRoll + targetBonus;

  return {
    skill: "BLUFF",
    roll,
    bonus,
    total,
    targetRoll,
    targetBonus,
    targetTotal,
    success: total > targetTotal,
    margin: total - targetTotal
  };
}

/**
 * Diplomacy attitude table from D&D 3.5.
 * Returns the highest attitude reachable by the rolled check.
 */
export function resolveDiplomacy(
  actor: Combatant,
  initialAttitude: DiplomacyAttitude,
  roll: number,
  rushed = false
): SocialCheckResult & { newAttitude: DiplomacyAttitude; changed: boolean } {
  const bonus = getSkillBonus(actor, "DIPLOMACY") + (rushed ? -10 : 0);
  const total = roll + bonus;
  const initialIndex = ATTITUDE_ORDER.indexOf(initialAttitude);
  let newAttitude = initialAttitude;

  for (let index = ATTITUDE_ORDER.length - 1; index >= initialIndex; index--) {
    const candidate = ATTITUDE_ORDER[index];
    if (total >= DIPLOMACY_DC[initialAttitude][candidate]) {
      newAttitude = candidate;
      break;
    }
  }

  return {
    skill: "DIPLOMACY",
    roll,
    bonus,
    total,
    dc: DIPLOMACY_DC[initialAttitude][newAttitude],
    success: newAttitude !== initialAttitude,
    margin: total - DIPLOMACY_DC[initialAttitude][newAttitude],
    newAttitude,
    changed: newAttitude !== initialAttitude
  };
}

/**
 * Intimidate opposed by the target's modified level/HD check.
 * D&D 3.5 uses level/HD + Wisdom modifier + modifiers on saves against fear.
 */
export function resolveIntimidate(
  actor: Combatant,
  target: Combatant,
  roll: number,
  targetRoll: number,
  sizeModifier = 0
): SocialCheckResult {
  const bonus = getSkillBonus(actor, "INTIMIDATE") + sizeModifier;
  const targetBonus =
    target.dnd.classData.level +
    getAbilityModifier(target.dnd.abilities.wisdom) +
    (target.dnd.fearSaveModifier ?? 0);
  const total = roll + bonus;
  const targetTotal = targetRoll + targetBonus;

  return {
    skill: "INTIMIDATE",
    roll,
    bonus,
    total,
    targetRoll,
    targetBonus,
    targetTotal,
    success: total > targetTotal,
    margin: total - targetTotal
  };
}

/** Negotiations use opposed Diplomacy checks. */
export function resolveNegotiation(
  actor: Combatant,
  target: Combatant,
  roll: number,
  targetRoll: number,
  actorBonusModifier = 0,
  targetBonusModifier = 0
): SocialCheckResult {
  const bonus = getSkillBonus(actor, "DIPLOMACY") + actorBonusModifier;
  const targetBonus = getSkillBonus(target, "DIPLOMACY") + targetBonusModifier;
  const total = roll + bonus;
  const targetTotal = targetRoll + targetBonus;

  return {
    skill: "DIPLOMACY",
    roll,
    bonus,
    total,
    targetRoll,
    targetBonus,
    targetTotal,
    success: total > targetTotal,
    margin: total - targetTotal
  };
}

export function isDiplomacyEndCombatResult(result: SocialCheckResult & { newAttitude: DiplomacyAttitude }): boolean {
  return result.newAttitude === "FRIENDLY" || result.newAttitude === "HELPFUL";
}
