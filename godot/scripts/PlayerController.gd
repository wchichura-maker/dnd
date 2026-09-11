extends Node2D
class_name PlayerController

## Presentation controller for the Godot entity.
## The authoritative movement decision comes from the Game Core transport.

const TILE_SIZE: float = 48.0

var grid_position: Vector2i = Vector2i(3, 3)
var is_moving: bool = false

func move_along_path(path: Array[Vector2i], step_duration: float) -> void:
	if path.is_empty() or is_moving:
		return

	is_moving = true
	var tween: Tween = create_tween()
	tween.set_trans(Tween.TRANS_LINEAR)
	tween.set_ease(Tween.EASE_IN_OUT)

	for tile in path:
		grid_position = tile
		var world_position: Vector2 = Vector2(tile) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)
		tween.tween_property(self, "position", world_position, step_duration)

	tween.finished.connect(_on_movement_finished.bind(path.back()))

func _on_movement_finished(final_tile: Vector2i) -> void:
	grid_position = final_tile
	is_moving = false
