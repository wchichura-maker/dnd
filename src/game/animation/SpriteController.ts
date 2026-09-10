import type { AnimationDefinition, AnimationSource } from "./AnimationDefinition";

export type SpriteRenderSource =
  | { kind: "SPRITE"; src: string }
  | { kind: "VIDEO"; src: string; loop: boolean; muted: boolean }
  | { kind: "NONE" };

export function resolveSpriteSource(
  definition?: AnimationDefinition
): SpriteRenderSource {
  const source: AnimationSource | undefined = definition?.source;

  if (!source) {
    return { kind: "NONE" };
  }

  if (source.type === "VIDEO") {
    return {
      kind: "VIDEO",
      src: source.src,
      loop: source.loop ?? false,
      muted: source.muted ?? true
    };
  }

  return {
    kind: "SPRITE",
    src: source.src
  };
}
