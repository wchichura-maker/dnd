extends Node2D
class_name GridMovementController

## Input/presentation only. Rules remain authoritative in Game Core.

const TILE_SIZE: float = 48.0
const STEP_DURATION: float = 0.14

var player: PlayerController
var game_core: GameCoreClient
var five_foot_step_mode: bool = false

func configure(player_node: PlayerController, game_core_client: GameCoreClient) -> void:
	player = player_node
	game_core = game_core_client
	if not game_core.state_received.is_connected(_on_state_received):
		game_core.state_received.connect(_on_state_received)
	if not game_core.action_resolved.is_connected(_on_action_resolved):
		game_core.action_resolved.connect(_on_action_resolved)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			# Clicking an entity selects it; it does not issue movement.
			var main := get_parent()
			if main.has_method("_select_target_at") and main._select_target_at(get_global_mouse_position()):
				get_viewport().set_input_as_handled()
				return
			select_destination(get_global_mouse_position())
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ESCAPE:
			get_tree().quit()

func select_destination(world_position: Vector2) -> void:
	if player == null or game_core == null or player.is_moving or not player.can_receive_movement_input or game_core.busy:
		return
	var destination := world_to_grid(world_position)
	game_core.request_action({
		"type": "FIVE_FOOT_STEP" if five_foot_step_mode else "MOVE",
		"actorId": "player-01",
		"destination": {"x": destination.x, "y": destination.y}
	})

func world_to_grid(world_position: Vector2) -> Vector2i:
	return Vector2i(floori(world_position.x / TILE_SIZE), floori(world_position.y / TILE_SIZE))

func _on_state_received(snapshot: Dictionary) -> void:
	five_foot_step_mode = false
	var state_variant: Variant = snapshot.get("state", {})
	if state_variant is Dictionary:
		var state := state_variant as Dictionary
		var player_alive := false
		for entity_variant in state.get("entities", []) as Array:
			if entity_variant is Dictionary and str((entity_variant as Dictionary).get("id", "")) == "player-01":
				player_alive = int((entity_variant as Dictionary).get("hp", 0)) > -10
				break
		if player != null:
			player.set_alive(player_alive)
		if str(state.get("mode", "EXPLORATION")) == "COMBAT":
			var combat := state.get("combat", {}) as Dictionary
			var turn_order := combat.get("turnOrder", []) as Array
			var current_index := int(combat.get("currentTurnIndex", 0))
			var active_id := str(turn_order[current_index]) if current_index >= 0 and current_index < turn_order.size() else ""
			if active_id == "player-01":
				var turn := state.get("turn", {}) as Dictionary
				var resources := turn.get("resources", {}) as Dictionary
				five_foot_step_mode = !bool(resources.get("action", true)) and bool(resources.get("moveAction", true)) and bool(resources.get("fiveFootStepAvailable", false)) and !bool(resources.get("hasMoved", false)) and !bool(resources.get("hasTakenFiveFootStep", false))

func _on_action_resolved(action_result: Dictionary, snapshot: Dictionary) -> void:
	if not bool(action_result.get("success", false)):
		return
	var movement_variant: Variant = snapshot.get("movementPath", [])
	if not movement_variant is Array:
		return
	var movement_path: Array[Vector2i] = []
	for position_variant in movement_variant as Array:
		if position_variant is Dictionary:
			var position: Dictionary = position_variant
			movement_path.append(Vector2i(int(position.get("x", 0)), int(position.get("y", 0))))
	if movement_path.is_empty():
		return
	if player != null and player.can_receive_movement_input:
		player.move_along_path(movement_path, STEP_DURATION)
