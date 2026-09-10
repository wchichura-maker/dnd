extends Node

## Adapter boundary between game-state data and Godot presentation nodes.
## It does not execute D&D rules or mutate the authoritative game state.

class_name GameEntityAdapter

const TILE_SIZE: float = 48.0

func bind_entity(node: Node2D, snapshot: EntitySnapshot) -> EntityView:
	var view: EntityView = node.get_node_or_null("EntityView") as EntityView
	if view == null:
		view = EntityView.new()
		view.name = "EntityView"
		node.add_child(view)

	node.position = Vector2(snapshot.grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)
	view.apply_snapshot(snapshot)
	return view

func grid_to_world(grid_position: Vector2i) -> Vector2:
	return Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)
