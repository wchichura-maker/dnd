# D&D Online — Godot Client

This directory contains the new Godot client foundation.

## Current scope

This first vertical slice proves only the client/runtime foundation:

- Godot 4 project configuration.
- Main `Node2D` scene.
- Prototype 2D map/grid renderer.
- `Camera2D` following the player.
- Keyboard input through the Godot input system.
- Temporary player marker.
- Clear separation from the existing TypeScript Game Core.

## Deliberate non-goals

The following are **not** migrated yet:

- D&D rules.
- GameEngine.
- Combat.
- Pathfinding.
- Turn resources.
- Inventory.
- AI.
- Multiplayer/networking.
- Database/persistence.
- Final art assets.
- Final UI.

The existing React/TypeScript application remains untouched and continues to be the reference implementation for game logic during the migration.

## Run

Open this directory as a project in Godot 4.x and run the main scene/project.

Controls in this foundation prototype:

- `WASD` / arrow keys: move the temporary player marker.
- `ESC`: quit.

The next milestone is to validate this foundation in a local Godot runtime before introducing the first Game Core adapter.
