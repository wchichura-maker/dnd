import {
  useEffect,
  useState,
  useRef
} from "react";

import type { Combatant } from "../game/entities/Combatant";
import type { Position } from "../game/world/Position";
import type { AnimationState } from "../game/entities/AnimationState";
import type { EntityVisualStates } from "../game/entities/VisualState";
import type { AnimationDefinition } from "../game/animation/AnimationDefinition";
import { defaultAnimationDefinitions } from "../game/animation/AnimationDefinition";
import { getHitPointState } from "../game/rules/ConditionRules";
import { getAnimationDuration } from "../game/animation/AnimationController";

import {
  getReachablePositions
} from "../game/rules/Pathfinding";

type GameMapProps = {
  map: {
    width: number;
    height: number;
    tiles: {
      x: number;
      y: number;
      walkable: boolean;
    }[][];
  };
  character: Combatant;
  enemy: Combatant;
  entities: Combatant[];
  selectedTargetId?: string;
  movementRemaining: number;
  actionAvailable: boolean;
  fiveFootStepAvailable: boolean;
  hasTakenFiveFootStep: boolean;
  isPlayerTurn: boolean;
  onTileClick: (x: number, y: number) => void;
  movementPaths?: Record<string, Position[]>;
  onMovementAnimationComplete?: (entityId: string) => void;
  entityVisualStates?: EntityVisualStates;
  animationDefinitions?: Partial<Record<AnimationState, AnimationDefinition>>;
  onAnimationComplete?: (entityId: string) => void;
};

function getEntityAnimation(
  entity: Combatant,
  visualStates: EntityVisualStates
): AnimationState {
  return visualStates[entity.id]?.animation ?? "IDLE";
}

function getEntitySprite(
  entity: Combatant,
  state: AnimationState
): string {
  const hpState = getHitPointState(entity);

  if (hpState === "DEAD" || state === "DEATH") return "💀";
  if (hpState === "DYING") return "🩸";
  if (hpState === "DISABLED") return "😣";
  if (hpState === "STABLE") return "😴";

  const conditionTypes = (entity.conditions ?? []).map(condition => condition.type);

  if (conditionTypes.includes("STUNNED")) return "😵";
  if (conditionTypes.includes("PARALYZED")) return "🧍";
  if (conditionTypes.includes("UNCONSCIOUS")) return "😴";
  if (conditionTypes.includes("DAZED")) return "🥴";
  if (conditionTypes.includes("PETRIFIED")) return "🗿";

  if (state === "ATTACK") return "⚔️";
  if (state === "HIT") return "💥";

  return entity.type === "PLAYER" ? "🧙" : "👹";
}

function getEntityTransform(state: AnimationState): string {
  switch (state) {
    case "WALK": return "translateY(-2px) scale(1.05)";
    case "ATTACK": return "scale(1.25) rotate(-8deg)";
    case "HIT": return "translateX(3px) scale(1.1)";
    case "DEATH": return "rotate(90deg) scale(0.9)";
    default: return "scale(1)";
  }
}

function getStatusLabel(type: string): string {
  const labels: Record<string, string> = {
    STUNNED: "STUN",
    PARALYZED: "PARA",
    UNCONSCIOUS: "KO",
    DAZED: "DAZE",
    PETRIFIED: "PETR",
    STABLE: "STABLE"
  };
  return labels[type] ?? type;
}

function getGridDistance(
  from: Position,
  to: Position
): number {
  const dx =
    Math.abs(to.x - from.x);

  const dy =
    Math.abs(to.y - from.y);

  const diagonal =
    Math.min(dx, dy);

  const straight =
    Math.max(dx, dy) - diagonal;

  return (
    Math.floor(diagonal / 2) * 3 +
    (diagonal % 2) +
    straight
  );
}

function getWeaponRange(
  combatant: Combatant
): number {
  return (
    combatant.dnd.equipment.weapon?.range ??
    0
  );
}

function isPositionInAttackRange(
  attacker: Combatant,
  position: Position
): boolean {
  const range =
    getWeaponRange(attacker);

  if (range <= 0) {
    return false;
  }

  return (
    getGridDistance(
      attacker.position,
      position
    ) <= range
  );
}

export default function GameMap({
  map,
  character,
  enemy,
  entities,
  selectedTargetId,
  movementRemaining,
  actionAvailable,
  fiveFootStepAvailable,
  hasTakenFiveFootStep,
  isPlayerTurn,
  onTileClick,
  movementPaths = {},
  onMovementAnimationComplete,
  entityVisualStates = {},
  animationDefinitions = {},
  onAnimationComplete
}: GameMapProps) {

  /*
   * ============================================================
   * CASAS ALCANÇÁVEIS
   * ============================================================
   *
   * Usa o mesmo pathfinding das regras do jogo.
   * Portanto, obstáculos, ocupação e diagonais continuam
   * obedecendo às mesmas regras usadas pelo movimento real.
   */
  /*
   * Depois de gastar a ação padrão, se o personagem ainda
   * não tiver se movimentado, ele pode realizar somente um
   * passo de ajuste de 5 pés.
   *
   * Não reduzimos o deslocamento real do personagem: aqui
   * estamos apenas limitando o espaço destacado e o destino
   * permitido visualmente para o restante do turno.
   */
  const fiveFootStepMode =
    !actionAvailable &&
    fiveFootStepAvailable;

  const isMovementAnimating =
    Object.values(movementPaths).some(
      path => path.length > 0
    );

  const playerVisualState =
    entityVisualStates[character.id]?.animation ??
    "IDLE";

  const movementHighlightDistance =
    fiveFootStepMode
      ? 1
      : hasTakenFiveFootStep
        ? 0
        : movementRemaining;

  const reachablePositions =
    isPlayerTurn &&
    movementHighlightDistance > 0
      ? getReachablePositions(
          map,
          entities,
          character.position,
          movementHighlightDistance,
          character.id
        )
      : [];

  const reachableKeys =
    new Set(
      reachablePositions.map(
        position =>
          `${position.x}-${position.y}`
      )
    );

  /*
   * ============================================================
   * CASAS DE ALCANCE DE ATAQUE
   * ============================================================
   *
   * O destaque é visual. A validação definitiva continua
   * sendo feita pelo GameEngine.
   */
  const attackRange =
    isPlayerTurn && actionAvailable
      ? getWeaponRange(character)
      : 0;

  /*
   * ============================================================
   * POSIÇÃO VISUAL DO KAEL
   * ============================================================
   * ============================================================
   */

  const [
    visualPositions,
    setVisualPositions
  ] = useState<Record<string, Position>>(() => {
    const initial: Record<string, Position> = {};
    entities.forEach(entity => {
      initial[entity.id] = {
        x: entity.position.x,
        y: entity.position.y
      };
    });
    return initial;
  });

  /*
   * ============================================================
   * ANIMAÇÃO DE MOVIMENTO POR ENTIDADE
   * ============================================================
   */

  useEffect(() => {
    const activeMovements = Object.entries(movementPaths);
    if (activeMovements.length === 0) return;

    let cancelled = false;
    const timers: number[] = [];

    activeMovements.forEach(([entityId, path]) => {
      if (path.length === 0) return;

      async function animateMovement() {
        for (const step of path) {
          if (cancelled) return;

          setVisualPositions(current => ({
            ...current,
            [entityId]: { x: step.x, y: step.y }
          }));

          await new Promise<void>(resolve => {
            const timer = window.setTimeout(
              resolve,
              getAnimationDuration("WALK")
            );
            timers.push(timer);
          });
        }

        if (!cancelled) {
          onMovementAnimationComplete?.(entityId);
        }
      }

      animateMovement();
    });

    return () => {
      cancelled = true;
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [movementPaths, onMovementAnimationComplete]);

  useEffect(() => {
    setVisualPositions(current => {
      const next = { ...current };

      entities.forEach(entity => {
        if (!movementPaths[entity.id]?.length) {
          next[entity.id] = {
            x: entity.position.x,
            y: entity.position.y
          };
        }
      });

      return next;
    });
  }, [entities, movementPaths]);

  /*
   * ============================================================
   * FINALIZAÇÃO DAS ANIMAÇÕES DE COMBATE
   * ============================================================
   *
   * Cada entidade possui seu próprio estado visual.
   * Quando uma animação temporária começa, aguardamos
   * a duração definida pelo AnimationController e avisamos
   * o App para devolver a entidade ao estado IDLE.
   * DEATH não é finalizado automaticamente: ele deve permanecer
   * até que o estado lógico da entidade seja DEAD.
   */

  const animationTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    entities.forEach(entity => {
      const state = getEntityAnimation(
        entity,
        entityVisualStates
      );

      if (state === "IDLE" || state === "WALK" || state === "DEATH") {
        return;
      }

      const previousTimer =
        animationTimers.current[entity.id];

      if (previousTimer !== undefined) {
        window.clearTimeout(previousTimer);
      }

      animationTimers.current[entity.id] =
        window.setTimeout(() => {
          delete animationTimers.current[entity.id];
          onAnimationComplete?.(entity.id);
        }, getAnimationDuration(state));
    });

    return () => {
      Object.values(animationTimers.current).forEach(timer =>
        window.clearTimeout(timer)
      );
    };
  }, [entities, entityVisualStates, onAnimationComplete]);


  /*
   * ============================================================
   * CLICK NAS CASAS
   * ============================================================
   */

function handleTileClick(
    x: number,
    y: number
  ) {

    if (!isPlayerTurn) {
      return;
    }

    if (isMovementAnimating) {
      return;
    }

    if (
      playerVisualState !==
      "IDLE"
    ) {
      return;
    }

    /*
     * Se clicou no Orc vivo,
     * deixa o App tratar a seleção.
     */

    if (
      enemy.hp > 0 &&
      enemy.position.x === x &&
      enemy.position.y === y
    ) {

      onTileClick(
        x,
        y
      );

      return;
    }

    onTileClick(
      x,
      y
    );
  }

  /*
   * ============================================================
   * RENDERIZAÇÃO
   * ============================================================
   */

  return (
    <div
      style={{
        position: "relative",

        width:
          map.width * 48,

        height:
          map.height * 48,

        background:
          "#111",

        userSelect:
          "none"
      }}
    >

      {/*
       * ========================================================
       * MAPA
       * ========================================================
       */}

      {map.tiles.map(
        row =>
          row.map(tile => {

            const key =
              `${tile.x}-${tile.y}`;

            const isReachable =
              reachableKeys.has(key);

            const isAttackRange =
              attackRange > 0 &&
              isPositionInAttackRange(
                character,
                {
                  x: tile.x,
                  y: tile.y
                }
              );

            const isPlayerTile =
              tile.x === character.position.x &&
              tile.y === character.position.y;

            return (
              <div
                key={
                  key
                }

                onClick={() =>
                  handleTileClick(
                    tile.x,
                    tile.y
                  )
                }

                style={{
                  position:
                    "absolute",

                  left:
                    tile.x * 48,

                  top:
                    tile.y * 48,

                  width:
                    48,

                  height:
                    48,

                  boxSizing:
                    "border-box",

                  border:
                    "1px solid #292929",

                  background:
                    tile.walkable
                      ? "#202020"
                      : "#090909",

                  boxShadow:
                    isReachable && !isPlayerTile
                      ? "inset 0 0 0 2px rgba(80, 170, 255, 0.45)"
                      : isAttackRange && !isPlayerTile
                        ? "inset 0 0 0 2px rgba(255, 90, 90, 0.45)"
                        : "none",

                  backgroundImage:
                    isReachable && isAttackRange
                      ? "linear-gradient(rgba(170, 100, 255, 0.22), rgba(170, 100, 255, 0.22))"
                      : isReachable
                        ? "linear-gradient(rgba(80, 170, 255, 0.18), rgba(80, 170, 255, 0.18))"
                        : isAttackRange
                          ? "linear-gradient(rgba(255, 90, 90, 0.14), rgba(255, 90, 90, 0.14))"
                          : "none",

                  cursor:
                    isPlayerTurn
                      ? "pointer"
                      : "default"
                }}
              />
            );

          })
      )}

      {/*
       * ========================================================
       * ENTIDADES
       * ========================================================
       */}

      {entities.map(entity => {
        const state = getEntityAnimation(entity, entityVisualStates);
        const isPlayer = entity.id === character.id;
        const position = visualPositions[entity.id] ?? entity.position;
        const hpState = getHitPointState(entity);
        const statusTypes = (entity.conditions ?? [])
          .slice(0, 3)
          .map(condition => condition.type);
        const definition =
          animationDefinitions[state] ??
          defaultAnimationDefinitions[state];
        const videoSource =
          definition?.source?.type === "VIDEO"
            ? definition.source
            : undefined;

        return (
          <div
            key={entity.id}
            style={{
              position: "absolute",
              left: position.x * 48,
              top: position.y * 48,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              zIndex: isPlayer ? 20 : 19,
              pointerEvents: "none",
              transform: getEntityTransform(state),
              transition: movementPaths[entity.id]?.length
                ? "left 120ms linear, top 120ms linear, transform 120ms ease"
                : "transform 120ms ease",
              opacity: hpState === "DEAD" || state === "DEATH" ? 0.45 : 1,
              filter: hpState === "DEAD" ? "grayscale(1)" : "none"
            }}
          >
            {videoSource ? (
              <video
                src={videoSource.src}
                autoPlay
                loop={videoSource.loop ?? false}
                muted={videoSource.muted ?? true}
                playsInline={videoSource.playsInline ?? true}
                style={{
                  width: 48,
                  height: 48,
                  objectFit: "contain",
                  imageRendering: "pixelated"
                }}
              />
            ) : (
              getEntitySprite(entity, state)
            )}

            {statusTypes.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  right: -6,
                  fontSize: 8,
                  background: "rgba(0,0,0,0.8)",
                  padding: "2px 3px",
                  border: "1px solid #555",
                  color: "#fff",
                  whiteSpace: "nowrap"
                }}
              >
                {statusTypes.map(type => getStatusLabel(type)).join(" ")}
              </div>
            )}

          </div>
        );
      })}

      {/*
       * ========================================================
       * MARCADOR DE ALVO
       * ========================================================
       */}

      {
        selectedTargetId ===
          enemy.id &&
        enemy.hp > 0 && (

          <div
            style={{
              position:
                "absolute",

              left:
                enemy.position.x * 48,

              top:
                enemy.position.y * 48,

              width:
                48,

              height:
                48,

              boxSizing:
                "border-box",

              border:
                "2px solid currentColor",

              pointerEvents:
                "none",

              zIndex:
                30
            }}
          />

        )
      }

    </div>
  );
}