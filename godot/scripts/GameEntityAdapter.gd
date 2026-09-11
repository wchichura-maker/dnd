extends Node

## Adapter boundary between game-state data and Godot presentation nodes.
## It does not execute D&D rules, mutate authoritative state, or own node transforms.

class_name GameEntityAdapter

const TILE_SIZE: float = 48.0
const ENTITY_VIEW_SCENE: PackedScene = preload("res://scenes/EntityView.tscn")

func bind_entity(node: Node2D, snapshot: EntitySnapshot) -> EntityView:
	var view: EntityView = node.get_node_or_null("EntityView") as EntityView
	if view == null:
		view = ENTITY_VIEW_SCENE.instantiate() as EntityView
		if view == null:
			return null
		view.name = "EntityView"
		node.add_child(view)

	# Transform synchronization is intentionally handled by Main/PlayerController.
	# Updating node.position here would apply the authoritative destination while
	# the presentation tween is still running, producing a visible bounce/snap.
	view.apply_snapshot(snapshot)
	return view

func grid_to_world(grid_position: Vector2i) -> Vector2:
	return Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)
