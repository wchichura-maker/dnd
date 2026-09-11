# D&D Online — Presentation Assets

This directory is the presentation boundary between the game and its visual resources.

## Temporary pack

The first playable world uses **Claw & Blade** as a temporary production resource. The source pack must be placed locally at:

```text
assets/source/ClawAndBlade/
```

The original directory structure should remain untouched. `scripts/AssetRegistry.gd` is the only presentation layer that should need to know the pack's filenames.

Expected source structure:

```text
assets/source/ClawAndBlade/
├── Characters/
├── Buildings/
├── GUI/
├── Icons/
└── Tilemaps/
```

Do not make Game Core rules depend on these files.

## Replacement strategy

When the definitive D&D Online art direction is produced, replace the presentation resources and update `AssetRegistry.gd`. Game Core entities, actions, movement, combat, encounters and rules must remain independent of the asset pack.

The current character resources are individual 128×128/256×256 character images and composition sheets. They are **not assumed to be animation frame sets**. Animation states will only be wired when a real frame layout is confirmed.

## Visual rules

The approved D&D Online Design System remains authoritative over the temporary pack. In particular:

- world-first top-down presentation;
- low-saturation medieval fantasy pixel art;
- dark brown text/surfaces and aged gold accents;
- no neon or high-saturation UI;
- no giant opaque HUD surfaces;
- buttons use text/border treatment rather than colored fills unless explicitly required;
- nearest-neighbor filtering for pixel assets;
- gameplay data and presentation assets remain separated.
