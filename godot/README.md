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

- Combat UI.
- Inventory UI.
- AI presentation.
- Multiplayer session transport.
- Database/persistence.
- Final art assets.
- Final UI.

D&D rules execution, pathfinding, movement validation, and game state remain in the TypeScript Game Core.
