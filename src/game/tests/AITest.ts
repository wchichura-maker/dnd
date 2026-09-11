import { chooseAction, MIN_ESCAPE_DISTANCE_SQUARES } from "../AI";
import { playerCharacter } from "../Character";
import { orc } from "../Combat";
import { createMap } from "../Map";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`TESTE FALHOU: ${message}`);
}

function hostileRelationship(actorId: string, targetId: string) {
  return [{
    id: `rel-${actorId}-${targetId}`,
    entityAId: actorId,
    entityBId: targetId,
    friendship: -50,
    trust: 0,
    respect: 0,
    fear: 0,
    attraction: 0,
    loyalty: 0,
    hostile: true,
    allied: false,
    rival: true,
    romantic: false
  }];
}

export function runAITests(): void {
  console.log("INICIANDO TESTES DE IA");

  const map = createMap(26, 16);

  const helplessPlayer = { ...playerCharacter, position: { ...orc.position }, hp: -1 };
  const coupAction = chooseAction(orc, [helplessPlayer, orc], [], map);
  assert(coupAction.type === "COUP_DE_GRACE", "IA prioriza Golpe de Misericórdia contra alvo helpless ao alcance");
  assert(coupAction.targetId === helplessPlayer.id, "IA escolhe o alvo helpless correto");

  const healthyPlayer = { ...playerCharacter, position: { ...orc.position }, hp: playerCharacter.maxHp };
  const attackAction = chooseAction(orc, [healthyPlayer, orc], [], map);
  assert(attackAction.type === "ATTACK", "IA mantém Ataque normal contra alvo não helpless");

  const alliedPlayer = { ...healthyPlayer, id: "player-allied" };
  const hostileNpc = { ...healthyPlayer, id: "npc-hostile", type: "NPC" as const, position: { x: orc.position.x + 2, y: orc.position.y } };
  const relationships = [
    { id: "rel-player", entityAId: orc.id, entityBId: alliedPlayer.id, friendship: 80, trust: 80, respect: 50, fear: 0, attraction: 0, loyalty: 80, hostile: false, allied: true, rival: false, romantic: false },
    { id: "rel-npc", entityAId: orc.id, entityBId: hostileNpc.id, friendship: -50, trust: 0, respect: 0, fear: 0, attraction: 0, loyalty: 0, hostile: true, allied: false, rival: true, romantic: false }
  ];
  const relationshipAwareAction = chooseAction(orc, [alliedPlayer, hostileNpc, orc], relationships, map);
  assert(relationshipAwareAction.targetId === hostileNpc.id, "IA não escolhe aliado quando existe um alvo hostil válido");
  assert(relationshipAwareAction.type === "ATTACK" || relationshipAwareAction.type === "MOVE", "IA escolhe uma ação ofensiva ou de aproximação contra o hostil");

  const noHostileAction = chooseAction(orc, [alliedPlayer, orc], relationships, map);
  assert(noHostileAction.type === "WAIT", "IA aguarda quando não existem alvos hostis");

  const chargeTarget = { ...healthyPlayer, id: "charge-target", position: { x: orc.position.x + 4, y: orc.position.y } };
  const chargeAction = chooseAction(orc, [chargeTarget, orc], hostileRelationship(orc.id, chargeTarget.id), map);
  assert(chargeAction.type === "CHARGE", "IA escolhe Investida quando existe trajetória reta válida");
  assert(chargeAction.targetId === chargeTarget.id, "Investida mantém o alvo correto");
  assert(!!chargeAction.destination, "Investida possui destino");

  const lowHealthTarget = { ...healthyPlayer, id: "low-health-target", position: { x: orc.position.x + 1, y: orc.position.y } };
  const lowHealthActor = { ...orc, id: "low-health-orc", hp: 5, position: { ...orc.position } };
  const withdrawAction = chooseAction(lowHealthActor, [lowHealthTarget, lowHealthActor], hostileRelationship(lowHealthActor.id, lowHealthTarget.id), map);
  assert(withdrawAction.type === "WITHDRAW", "IA com pouca vida prefere Withdraw em combate próximo");
  assert(withdrawAction.targetId === lowHealthTarget.id, "Withdraw mantém o alvo de referência");
  assert(!!withdrawAction.destination, "Withdraw possui destino");

  const farLowHealthTarget = { ...healthyPlayer, id: "far-target", position: { x: orc.position.x + 10, y: orc.position.y } };
  const runAction = chooseAction(lowHealthActor, [farLowHealthTarget, lowHealthActor], hostileRelationship(lowHealthActor.id, farLowHealthTarget.id), map);
  assert(runAction.type === "RUN", "IA com pouca vida e espaço escolhe Run");
  assert(runAction.targetId === farLowHealthTarget.id, "Run mantém o alvo de referência");
  assert(!!runAction.destination, "Run possui destino");

  const escapedTarget = { ...healthyPlayer, id: "escaped-target", position: { x: lowHealthActor.position.x + MIN_ESCAPE_DISTANCE_SQUARES, y: lowHealthActor.position.y } };
  const fleeAction = chooseAction(lowHealthActor, [escapedTarget, lowHealthActor], hostileRelationship(lowHealthActor.id, escapedTarget.id), map);
  assert(fleeAction.type === "FLEE", "IA encerra a fuga quando o limite mínimo de distância é atingido");
  assert(!fleeAction.destination, "FLEE de rompimento de contato não exige novo deslocamento");

  const belowEscapeTarget = { ...healthyPlayer, id: "below-escape-target", position: { x: lowHealthActor.position.x + MIN_ESCAPE_DISTANCE_SQUARES - 1, y: lowHealthActor.position.y } };
  const continueFleeAction = chooseAction(lowHealthActor, [belowEscapeTarget, lowHealthActor], hostileRelationship(lowHealthActor.id, belowEscapeTarget.id), map);
  assert(continueFleeAction.type === "RUN", "IA continua correndo enquanto estiver abaixo do limite de fuga");

  const deadActor = { ...orc, id: "dead-orc", hp: -10 };
  const deadActorAction = chooseAction(deadActor, [healthyPlayer, deadActor], [], map);
  assert(deadActorAction.type === "WAIT", "IA morta não produz ação");

  console.log("✓ IA prioriza Golpe de Misericórdia");
  console.log("✓ IA mantém Ataque normal para alvo funcional");
  console.log("✓ IA respeita relações hostis e aliados");
  console.log("✓ IA aguarda sem alvo hostil");
  console.log("✓ IA escolhe Investida tática");
  console.log("✓ IA escolhe Withdraw com pouca vida em combate próximo");
  console.log("✓ IA escolhe Run com pouca vida e espaço");
  console.log("✓ IA encerra fuga após romper contato");
  console.log("✓ IA continua fuga abaixo do limite");
  console.log("✓ IA morta não produz ação");
  console.log("✓ TESTES DE IA PASSARAM");
}
