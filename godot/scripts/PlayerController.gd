extends Node2D

## Temporary input proof for the Godot foundation.
## Movement is still local presentation-only and is not connected to D&D rules.
## The entity's visual representation is owned by EntityView.

const MOVE_SPEED := 220.0
const MAP_WIDTH := 26.0 * 48.0
const MAP_HEIGHT := 16.0 * 48.0
const PLAYER_RADIUS := 14.0

func _process(delta: float) -> void:
	var input_vector := Vector2.ZERO

	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		input_vector.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		input_vector.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		input_vector.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		input_vector.y += 1.0

	if input_vector.length_squared() > 0.0:
		position += input_vector.normalized() * MOVE_SPEED * delta

	# Presentation-only bounds. Game rules will own movement after the adapter is connected.
	position.x = clamp(position.x, PLAYER_RADIUS, MAP_WIDTH - PLAYER_RADIUS)
	position.y = clamp(position.y, PLAYER_RADIUS, MAP_HEIGHT - PLAYER_RADIUS)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		get_tree().quit()
