import { chooseAction } from "../AI";
import { playerCharacter } from "../Character";
import { orc } from "../Combat";
import { createMap } from "../Map";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TESTE FALHOU: ${message}`);
  }
}

export function runAITests(): void {
  console.log("INICIANDO TESTES DE IA");

  const map = createMap(26, 16);

  const helplessPlayer = {
    ...playerCharacter,
    position: { ...orc.position },
    hp: -1
  };

  const coupAction = chooseAction(
    orc,
    [helplessPlayer, orc],
    [],
    map
  );

  assert(
    coupAction.type === "COUP_DE_GRACE",
    "IA prioriza Golpe de Misericórdia contra alvo helpless ao alcance"
  );
  assert(coupAction.targetId === helplessPlayer.id, "IA escolhe o alvo helpless correto");

  const healthyPlayer = {
    ...playerCharacter,
    position: { ...orc.position },
    hp: playerCharacter.maxHp
  };

  const attackAction = chooseAction(orc, [healthyPlayer, orc], [], map);
  assert(attackAction.type === "ATTACK", "IA mantém Ataque normal contra alvo não helpless");

  const alliedPlayer = {
    ...healthyPlayer,
    id: "player-allied"
  };
  const hostileNpc = {
    ...healthyPlayer,
    id: "npc-hostile",
    type: "NPC" as const,
    position: { x: orc.position.x + 2, y: orc.position.y }
  };

  const relationships = [
    {
      id: "rel-player",
      entityAId: orc.id,
      entityBId: alliedPlayer.id,
      friendship: 80,
      trust: 80,
      respect: 50,
      fear: 0,
      attraction: 0,
      loyalty: 80,
      hostile: false,
      allied: true,
      rival: false,
      romantic: false
    },
    {
      id: "rel-npc",
      entityAId: orc.id,
      entityBId: hostileNpc.id,
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
    }
  ];

  const relationshipAwareAction = chooseAction(
    orc,
    [alliedPlayer, hostileNpc, orc],
    relationships,
    map
  );

  assert(
    relationshipAwareAction.targetId === hostileNpc.id,
    "IA não escolhe aliado quando existe um alvo hostil válido"
  );
  assert(
    relationshipAwareAction.type === "ATTACK" || relationshipAwareAction.type === "MOVE",
    "IA escolhe uma ação ofensiva ou de aproximação contra o hostil"
  );

  const noHostileAction = chooseAction(
    orc,
    [alliedPlayer, orc],
    relationships,
    map
  );
  assert(noHostileAction.type === "WAIT", "IA aguarda quando não existem alvos hostis");

  const deadActor = {
    ...orc,
    id: "dead-orc",
    hp: -10
  };
  const deadActorAction = chooseAction(deadActor, [healthyPlayer, deadActor], [], map);
  assert(deadActorAction.type === "WAIT", "IA morta não produz ação");

  console.log("✓ IA prioriza Golpe de Misericórdia");
  console.log("✓ IA mantém Ataque normal para alvo funcional");
  console.log("✓ IA respeita relações hostis e aliados");
  console.log("✓ IA aguarda sem alvo hostil");
  console.log("✓ IA morta não produz ação");
  console.log("✓ TESTES DE IA PASSARAM");
}
