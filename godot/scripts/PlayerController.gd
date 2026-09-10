extends Node2D

## Temporary input/rendering proof for the Godot foundation.
## This is deliberately not connected to D&D movement rules yet.

const MOVE_SPEED := 220.0
const PLAYER_RADIUS := 14.0

func _ready() -> void:
	queue_redraw()

func _process(delta: float) -> void:
	var input_vector := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

	if input_vector.length_squared() > 0.0:
		position += input_vector.normalized() * MOVE_SPEED * delta
		queue_redraw()

	# Keep the prototype player inside the map bounds.
	position.x = clamp(position.x, PLAYER_RADIUS, 26.0 * 48.0 - PLAYER_RADIUS)
	position.y = clamp(position.y, PLAYER_RADIUS, 16.0 * 48.0 - PLAYER_RADIUS)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			get_tree().quit()

func _draw() -> void:
	# Selection/base ring.
	draw_circle(Vector2.ZERO, 20.0, Color("111111", 0.9))
	draw_arc(Vector2.ZERO, 20.0, 0.0, TAU, 32, Color("d0a85c"), 2.0)

	# Temporary player marker.
	draw_circle(Vector2.ZERO, PLAYER_RADIUS, Color("7d5cff"))
	draw_circle(Vector2.ZERO, PLAYER_RADIUS, Color("eeeeee"), false, 2.0)

	# Facing indicator.
	draw_line(Vector2(0, -4), Vector2(0, -18), Color("eeeeee"), 3.0)
