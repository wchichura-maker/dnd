# D&D Online — Godot Client

This directory contains the new Godot client foundation.

## Current scope

The current vertical slice proves the client/runtime foundation and the first render-facing entity boundary:

- Godot 4 project configuration.
- Main `Node2D` scene.
- Prototype 2D map/grid renderer.
- `Camera2D` following the player.
- Keyboard input.
- `EntitySnapshot` render-facing data contract.
- `GameEntityAdapter` boundary between game data and Godot nodes.
- `EntityView` presentation node with name and HP bar.
- Player entity initialized from the current TypeScript `playerCharacter` render-relevant state.

## Architecture rule

Godot presentation nodes do not own D&D rules. The adapter receives render-facing entity state and applies it to Godot nodes. The existing TypeScript Game Core remains the reference implementation for rules during this migration.

## Deliberate non-goals

The following are **not** migrated yet:

- D&D rules execution.
- GameEngine execution inside Godot.
- Combat.
- Pathfinding.
- Turn resources.
- Inventory.
- AI.
- Multiplayer/networking.
- Database/persistence.
- Final art assets.
- Final UI.

## Run

**Open the `godot/` directory itself as the Godot 4.x project.**

Run the project with **F6/F5**.

Controls in this foundation prototype:

- `WASD` / arrow keys: move the temporary local player representation.
- `ESC`: quit.

The next milestone is to validate this entity adapter in the local Godot runtime before connecting authoritative movement from the TypeScript Game Core.
