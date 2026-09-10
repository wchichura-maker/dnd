import { playerCharacter } from "../Character";
import { orc } from "../Combat";
import {
  getSkillBonus,
  isDiplomacyEndCombatResult,
  resolveBluff,
  resolveDiplomacy,
  resolveIntimidate,
  resolveNegotiation
} from "../rules/SocialRules";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`TESTE FALHOU: ${message}`);
}

export function runSocialRulesTests(): void {
  console.log("INICIANDO TESTES DE REGRAS SOCIAIS");

  const actor = {
    ...playerCharacter,
    dnd: {
      ...playerCharacter.dnd,
      abilities: { ...playerCharacter.dnd.abilities, charisma: 16, wisdom: 12 },
      skills: {
        BLUFF: 4,
        DIPLOMACY: 5,
        INTIMIDATE: 3,
        SENSE_MOTIVE: 2
      }
    }
  };

  const target = {
    ...orc,
    dnd: {
      ...orc.dnd,
      abilities: { ...orc.dnd.abilities, wisdom: 10, charisma: 10 },
      skills: {
        BLUFF: 0,
        DIPLOMACY: 2,
        INTIMIDATE: 0,
        SENSE_MOTIVE: 1
      }
    }
  };

  assert(getSkillBonus(actor, "BLUFF") === 7, "Bluff deveria somar Carisma + ranks.");
  assert(getSkillBonus(actor, "DIPLOMACY") === 8, "Diplomacia deveria somar Carisma + ranks.");
  assert(getSkillBonus(actor, "INTIMIDATE") === 6, "Intimidar deveria somar Carisma + ranks.");
  assert(getSkillBonus(target, "SENSE_MOTIVE") === 1, "Sentir Motivação deveria somar Sabedoria + ranks.");

  const bluff = resolveBluff(actor, target, 12, 10);
  assert(bluff.total === 19, "Bluff deveria expor o total do teste.");
  assert(bluff.targetTotal === 11, "Sense Motive deveria expor o total oposto.");
  assert(bluff.success, "Bluff maior que Sense Motive deveria vencer.");

  const diplomacy = resolveDiplomacy(actor, "HOSTILE", 17);
  assert(diplomacy.total === 25, "Diplomacia deveria calcular D20 + bônus.");
  assert(diplomacy.newAttitude === "INDIFFERENT", "25 contra Hostile deveria alcançar Indifferent.");
  assert(!isDiplomacyEndCombatResult(diplomacy), "Indifferent não deveria encerrar combate automaticamente.");

  const diplomacyFriendly = resolveDiplomacy(actor, "HOSTILE", 27);
  assert(diplomacyFriendly.newAttitude === "FRIENDLY", "35 ou mais deveria alcançar Friendly para Hostile.");
  assert(isDiplomacyEndCombatResult(diplomacyFriendly), "Friendly pode permitir resolução pacífica do confronto.");

  const rushed = resolveDiplomacy(actor, "HOSTILE", 35, true);
  assert(rushed.total === 33, "Diplomacia apressada deveria aplicar -10.");

  const intimidate = resolveIntimidate(actor, target, 15, 10);
  assert(intimidate.targetBonus === target.dnd.classData.level + 0, "Intimidate deveria usar nível + Sabedoria + bônus contra medo.");
  assert(intimidate.success, "Intimidate deveria vencer quando o total supera o level check.");

  const intimidationWithFearBonus = resolveIntimidate(
    actor,
    { ...target, dnd: { ...target.dnd, fearSaveModifier: 4 } },
    15,
    10
  );
  assert(intimidationWithFearBonus.targetBonus === target.dnd.classData.level + 4, "Bônus contra medo deveria entrar no level check.");

  const negotiation = resolveNegotiation(actor, target, 14, 12);
  assert(negotiation.total === 22, "Negociação deveria usar Diplomacia do ator.");
  assert(negotiation.targetTotal === 14, "Negociação deveria usar Diplomacia do alvo.");
  assert(negotiation.success, "A maior Diplomacia deveria vencer a negociação.");

  console.log("✓ Bluff vs Sense Motive");
  console.log("✓ Diplomacia usa tabela de atitudes D&D 3.5");
  console.log("✓ Diplomacia apressada aplica -10");
  console.log("✓ Intimidate usa level check + Sabedoria + bônus contra medo");
  console.log("✓ Negociação usa testes opostos de Diplomacia");
  console.log("✓ TESTES DE REGRAS SOCIAIS PASSARAM");
}
