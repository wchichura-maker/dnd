# D&D Online — Godot Client

This directory contains the Godot client foundation.

## Current scope

The current vertical slice proves the client/runtime foundation and the first authoritative movement bridge:

- Godot 4 project configuration.
- Main `Node2D` scene.
- 2D map/grid renderer driven by Game Core state.
- `Camera2D` following the player.
- Mouse destination input.
- `EntitySnapshot` render-facing data contract.
- `GameEntityAdapter` boundary between game data and Godot nodes.
- `EntityView` presentation node with name and HP bar.
- `GameCoreClient` HTTP transport.
- TypeScript `GameCoreServer` exposing state and actions.
- Authoritative `GameEngine` movement/pathfinding.
- Godot tile-by-tile animation based on the path returned by Game Core.
- Standalone visual scale calibration scene, independent of the temporary asset pack.

## Visual scale calibration

The current target is **provisional** until visual review in Godot:

```text
D&D ONLINE — CHARACTER SCALE

Grid:
1 cell = 5 ft

Base visual scale:
1 cell = 64 × 64 px

Medium:
footprint = 1 × 1 cell
visual height ≈ 1.40 cells
visual width ≈ 0.45–0.55 cell

Small:
footprint = 1 × 1 cell
visual height ≈ 1.10–1.25 cells

Large:
footprint = 2 × 2 cells
visual height ≈ 2.0–2.4 cells

Huge:
footprint = 3 × 3 cells
visual height ≈ 2.8–3.5 cells

Gargantuan:
footprint = 4 × 4 cells
visual height ≈ 3.8–4.8 cells
```

`VisualScale.gd` contains these presentation values. The Game Core continues to own logical grid distance and creature footprints.

### Scale test

Open `godot/scenes/ScaleTest.tscn` and run it with **F6**.

The test deliberately uses abstract adult-proportion silhouettes instead of the current Claw & Blade characters. It compares 1.25, 1.35, **1.40**, 1.45 and 1.55 cell visual heights against a 64 px tactical cell, so the final proportion can be judged without the temporary pack biasing the decision.

The 1.40-cell candidate is highlighted as the current target, not as a final locked value.

## Architecture rule

Godot presentation and input nodes do not own D&D rules. Godot sends actions to the TypeScript Game Core and renders the resulting authoritative state/path. The existing TypeScript Game Core remains the source of truth during this migration.

The temporary Godot-side pathfinding preview has been removed from the movement controller.

## Local runtime bridge

Start the TypeScript Game Core from the repository root:

```bash
npm install
npm run game-core
```

The local transport listens on:

`http://127.0.0.1:8787`

Then open the `godot/` directory itself as the Godot 4.x project and run **F6/F5**.

The Godot client requests the authoritative initial state and sends movement actions through the transport.

## Controls

- Left mouse button: request movement to a grid cell.
- `ESC`: quit.

## Current deliberate non-goals

These are not implemented in the Godot presentation layer yet:

- Inventory UI.
- AI presentation.
- Multiplayer session transport.
- Database/persistence.
- Final art assets.
- Final UI.

D&D rules execution, pathfinding, movement validation, and game state remain in the TypeScript Game Core.
