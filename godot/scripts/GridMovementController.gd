extends Node2D
class_name GridMovementController

## Input and presentation layer for authoritative Game Core movement.
## Pathfinding and action validation are performed by TypeScript Game Core.

const TILE_SIZE: float = 48.0
const STEP_DURATION: float = 0.14

var player: PlayerController
var game_core: GameCoreClient
var selected_tile: Vector2i = Vector2i(-1, -1)
var current_path: Array[Vector2i] = []
var reachable_tiles: Array[Vector2i] = []

func configure(
	player_node: PlayerController,
	game_core_client: GameCoreClient
) -> void:
	player = player_node
	game_core = game_core_client

	if not game_core.state_received.is_connected(_on_state_received):
		game_core.state_received.connect(_on_state_received)

	if not game_core.action_resolved.is_connected(_on_action_resolved):
		game_core.action_resolved.connect(_on_action_resolved)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			select_destination(get_global_mouse_position())
			return

	if event is InputEventKey:
		var key_event: InputEventKey = event
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ESCAPE:
			get_tree().quit()

func select_destination(world_position: Vector2) -> void:
	if player == null or game_core == null:
		return
	if player.is_moving or game_core.busy:
		return

	var destination: Vector2i = world_to_grid(world_position)
	selected_tile = destination

	game_core.request_action({
		"type": "MOVE",
		"actorId": "player-01",
		"destination": {
			"x": destination.x,
			"y": destination.y
		}
	})

	queue_redraw()

func world_to_grid(world_position: Vector2) -> Vector2i:
	return Vector2i(
		floori(world_position.x / TILE_SIZE),
		floori(world_position.y / TILE_SIZE)
	)

func _on_state_received(snapshot: Dictionary) -> void:
	var presentation_variant: Variant = snapshot.get("presentation", {})
	if not presentation_variant is Dictionary:
		return

	var presentation: Dictionary = presentation_variant
	var reachable_variant: Variant = presentation.get("reachablePositions", [])
	if not reachable_variant is Array:
		return

	reachable_tiles.clear()

	for position_variant in reachable_variant as Array:
		if not position_variant is Dictionary:
			continue

		var position: Dictionary = position_variant
		reachable_tiles.append(
			Vector2i(
				int(position.get("x", 0)),
				int(position.get("y", 0))
			)
		)

	queue_redraw()

func _on_action_resolved(
	action_result: Dictionary,
	snapshot: Dictionary
) -> void:
	if not bool(action_result.get("success", false)):
		return

	var movement_variant: Variant = snapshot.get("movementPath", [])
	if not movement_variant is Array:
		return

	var movement_path: Array[Vector2i] = []

	for position_variant in movement_variant as Array:
		if not position_variant is Dictionary:
			continue

		var position: Dictionary = position_variant
		movement_path.append(
			Vector2i(
				int(position.get("x", 0)),
				int(position.get("y", 0))
			)
		)

	current_path = movement_path
	player.move_along_path(current_path, STEP_DURATION)
	queue_redraw()

func _draw() -> void:
	for tile in reachable_tiles:
		var rect: Rect2 = Rect2(
			Vector2(tile) * TILE_SIZE + Vector2(3.0, 3.0),
			Vector2.ONE * (TILE_SIZE - 6.0)
		)
		draw_rect(rect, Color("d0a85c", 0.16), true)

	for tile in current_path:
		var rect: Rect2 = Rect2(
			Vector2(tile) * TILE_SIZE + Vector2(8.0, 8.0),
			Vector2.ONE * (TILE_SIZE - 16.0)
		)
		draw_rect(rect, Color("d0a85c", 0.30), true)

	if selected_tile.x >= 0 and selected_tile.y >= 0:
		var selected_rect: Rect2 = Rect2(
			Vector2(selected_tile) * TILE_SIZE,
			Vector2.ONE * TILE_SIZE
		)
		draw_rect(selected_rect, Color("d0a85c"), false, 2.0)
