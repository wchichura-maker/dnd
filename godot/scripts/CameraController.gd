extends Camera2D
class_name CameraController

## World camera: independent from the player transform.
## FOLLOW keeps the player framed. FREE lets the player inspect the world.
## Camera movement never changes authoritative game state or perception.

const PAN_SPEED_CELLS: float = 8.0
const FOCUS_DURATION: float = 0.24
const GRID_CELL_PIXELS: float = 48.0

var follow_target: Node2D
var free_mode: bool = false
var map_size: Vector2i = Vector2i(26, 16)

func _ready() -> void:
	# Keep the camera in the scene for now, but stop inheriting Player movement.
	# This is important: free camera motion must not be coupled to the actor transform.
	top_level = true
	position_smoothing_enabled = true
	position_smoothing_speed = 7.0
	enabled = true
	follow_target = get_parent() as Node2D
	if follow_target != null:
		global_position = follow_target.global_position
	_sync_map_size_from_main()
	_apply_limits()
	_clamp_to_map()

func set_map_size(size: Vector2i) -> void:
	map_size = Vector2i(maxi(1, size.x), maxi(1, size.y))
	_apply_limits()
	_clamp_to_map()

func _process(delta: float) -> void:
	_sync_map_size_from_main()

	if Input.is_key_pressed(KEY_SPACE):
		if free_mode:
			focus_player()
		else:
			_follow_player()
		return

	var input_direction := Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): input_direction.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): input_direction.y += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): input_direction.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): input_direction.x += 1.0

	if input_direction.length_squared() > 0.0:
		free_mode = true
		input_direction = input_direction.normalized()
		global_position += input_direction * GRID_CELL_PIXELS * PAN_SPEED_CELLS * delta
		_clamp_to_map()
	elif not free_mode:
		_follow_player()

func focus_player() -> void:
	if follow_target == null:
		return
	free_mode = false
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "global_position", follow_target.global_position, FOCUS_DURATION)

func _follow_player() -> void:
	if follow_target != null:
		global_position = follow_target.global_position

func _sync_map_size_from_main() -> void:
	var player_node := get_parent()
	var main := player_node.get_parent() if player_node != null else null
	if main == null:
		return
	var value: Variant = main.get("map_size")
	if value is Vector2i and value != map_size:
		set_map_size(value)

func _apply_limits() -> void:
	limit_left = 0
	limit_top = 0
	limit_right = int(map_size.x * GRID_CELL_PIXELS)
	limit_bottom = int(map_size.y * GRID_CELL_PIXELS)
	limit_smoothed = true

func _clamp_to_map() -> void:
	var viewport_size := get_viewport_rect().size / zoom
	var half_view := viewport_size * 0.5
	var map_size_pixels := Vector2(map_size) * GRID_CELL_PIXELS
	if map_size_pixels.x <= viewport_size.x:
		global_position.x = map_size_pixels.x * 0.5
	else:
		global_position.x = clampf(global_position.x, half_view.x, map_size_pixels.x - half_view.x)
	if map_size_pixels.y <= viewport_size.y:
		global_position.y = map_size_pixels.y * 0.5
	else:
		global_position.y = clampf(global_position.y, half_view.y, map_size_pixels.y - half_view.y)
