extends Node

## Presentation bridge for character animations.
## F1-F8 select directions; I plays INTERACT.
## BLOCK is triggered automatically when an enemy attack misses the player.
## Combat facing always points the player toward the current target/attacker.

const DIRECTION_KEYS := {
	KEY_F1: CharacterAnimationState.Direction.SOUTH,
	KEY_F2: CharacterAnimationState.Direction.SOUTHEAST,
	KEY_F3: CharacterAnimationState.Direction.EAST,
	KEY_F4: CharacterAnimationState.Direction.NORTHEAST,
	KEY_F5: CharacterAnimationState.Direction.NORTH,
	KEY_F6: CharacterAnimationState.Direction.NORTHWEST,
	KEY_F7: CharacterAnimationState.Direction.WEST,
	KEY_F8: CharacterAnimationState.Direction.SOUTHWEST
}

var connected_game_core: GameCoreClient
var previous_hp: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_process(true)

func _process(_delta: float) -> void:
	var main := get_tree().current_scene
	if main == null:
		return
	var game_core_variant: Variant = main.get("game_core")
	if game_core_variant is GameCoreClient and connected_game_core != game_core_variant:
		connected_game_core = game_core_variant
		if not connected_game_core.action_resolved.is_connected(_on_action_resolved):
			connected_game_core.action_resolved.connect(_on_action_resolved)
		if not connected_game_core.state_received.is_connected(_on_state_received):
			connected_game_core.state_received.connect(_on_state_received)

	var player_variant: Variant = main.get("player")
	if player_variant is PlayerController:
		var player := player_variant as PlayerController
		var view := player.get_node_or_null("EntityView") as EntityView
		if view == null or view.animation_controller == null:
			return
		if view.animation_controller.current_state == CharacterAnimationState.State.IDLE or view.animation_controller.current_state == CharacterAnimationState.State.WALK:
			view.animation_controller.set_state(
				CharacterAnimationState.State.WALK if player.is_moving else CharacterAnimationState.State.IDLE,
				player.is_moving
			)

func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventKey:
		return
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return

	if key_event.keycode == KEY_I:
		var view := _get_player_view()
		if view != null:
			view.play_interact()
		return

	if DIRECTION_KEYS.has(key_event.keycode):
		var direction: int = int(DIRECTION_KEYS[key_event.keycode])
		var view := _get_player_view()
		if view != null:
			view.set_facing_direction(direction)

func _on_action_resolved(action_result: Dictionary, snapshot: Dictionary) -> void:
	if not bool(action_result.get("success", false)):
		return

	_play_block_from_ai_actions(snapshot)

	var action := connected_game_core.last_requested_action if connected_game_core != null else {}
	var action_actor_id := str(action.get("actorId", ""))

	# The player's own successful attack is an ATTACK animation and immediately
	# turns the character toward the actual selected target.
	if action_actor_id == "player-01":
		var player_view := _get_player_view()
		if player_view == null or player_view.animation_controller == null:
			return
		if str(action.get("type", "")) in ["ATTACK", "COUP_DE_GRACE"]:
			_face_player_toward(snapshot, str(action.get("targetId", "")))
			player_view.animation_controller.play_state(CharacterAnimationState.State.ATTACK, false)

func _play_block_from_ai_actions(snapshot: Dictionary) -> void:
	var ai_actions_variant: Variant = snapshot.get("aiActions", [])
	if not ai_actions_variant is Array:
		return

	var player_view := _get_player_view()
	if player_view == null or player_view.animation_controller == null:
		return

	for event_variant in ai_actions_variant as Array:
		if not event_variant is Dictionary:
			continue
		var event := event_variant as Dictionary
		var action_variant: Variant = event.get("action", {})
		var result_variant: Variant = event.get("result", {})
		if not action_variant is Dictionary or not result_variant is Dictionary:
			continue
		var action := action_variant as Dictionary
		var result := result_variant as Dictionary
		if str(action.get("type", "")) != "ATTACK":
			continue
		if str(action.get("targetId", "")) != "player-01":
			continue

		_face_player_toward(snapshot, str(action.get("actorId", "")))
		var data_variant: Variant = result.get("data", {})
		if not data_variant is Dictionary:
			continue
		var data := data_variant as Dictionary
		var attack_variant: Variant = data.get("attack", {})
		if not attack_variant is Dictionary:
			continue
		var attack := attack_variant as Dictionary
		if not bool(attack.get("hit", true)):
			player_view.animation_controller.play_state(CharacterAnimationState.State.BLOCK, false)
			return

func _on_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	var state := state_variant as Dictionary
	var entities_variant: Variant = state.get("entities", [])
	if not entities_variant is Array:
		return
	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		var id := str(entity.get("id", ""))
		var hp := int(entity.get("hp", 0))
		if previous_hp.has(id) and hp < int(previous_hp[id]):
			var view := _find_entity_view(id)
			if view != null and view.animation_controller != null:
				var state_name := CharacterAnimationState.State.DEATH if hp <= -10 else CharacterAnimationState.State.HIT
				view.animation_controller.play_state(state_name, false)
		previous_hp[id] = hp

	if str(state.get("mode", "EXPLORATION")) == "COMBAT":
		var target_id := _selected_target_id()
		if target_id.is_empty():
			target_id = _first_living_opponent_id(state)
		if not target_id.is_empty():
			_face_player_toward(snapshot, target_id)

func _face_player_toward(snapshot: Dictionary, target_id: String) -> void:
	if target_id.is_empty():
		return
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	var entities_variant: Variant = (state_variant as Dictionary).get("entities", [])
	if not entities_variant is Array:
		return
	var player_position := Vector2i.ZERO
	var target_position := Vector2i.ZERO
	var found_player := false
	var found_target := false
	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		var position_variant: Variant = entity.get("position", {})
		if not position_variant is Dictionary:
			continue
		var position := position_variant as Dictionary
		var entity_id := str(entity.get("id", ""))
		var tile := Vector2i(int(position.get("x", 0)), int(position.get("y", 0)))
		if entity_id == "player-01":
			player_position = tile
			found_player = true
		elif entity_id == target_id and int(entity.get("hp", 0)) > -10:
			target_position = tile
			found_target = true
	if not found_player or not found_target:
		return
	var delta := target_position - player_position
	if delta == Vector2i.ZERO:
		return
	var x := signi(delta.x)
	var y := signi(delta.y)
	var direction := CharacterAnimationState.Direction.SOUTH
	if x == 0 and y > 0:
		direction = CharacterAnimationState.Direction.SOUTH
	elif x > 0 and y > 0:
		direction = CharacterAnimationState.Direction.SOUTHEAST
	elif x > 0 and y == 0:
		direction = CharacterAnimationState.Direction.EAST
	elif x > 0 and y < 0:
		direction = CharacterAnimationState.Direction.NORTHEAST
	elif x == 0 and y < 0:
		direction = CharacterAnimationState.Direction.NORTH
	elif x < 0 and y < 0:
		direction = CharacterAnimationState.Direction.NORTHWEST
	elif x < 0 and y == 0:
		direction = CharacterAnimationState.Direction.WEST
	else:
		direction = CharacterAnimationState.Direction.SOUTHWEST
	var view := _get_player_view()
	if view != null and view.animation_controller != null:
		view.animation_controller.set_direction(direction)

func _selected_target_id() -> String:
	var main := get_tree().current_scene
	if main == null:
		return ""
	return str(main.get("selected_target_id"))

func _first_living_opponent_id(state: Dictionary) -> String:
	for entity_variant in state.get("entities", []) as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) == "player-01":
			continue
		if int(entity.get("hp", 0)) > -10:
			return str(entity.get("id", ""))
	return ""

func _find_entity_view(entity_id: String) -> EntityView:
	var main := get_tree().current_scene
	if main == null:
		return null
	var nodes_variant: Variant = main.get("entity_nodes")
	if not nodes_variant is Dictionary:
		return null
	var node_variant: Variant = (nodes_variant as Dictionary).get(entity_id)
	if not node_variant is Node2D:
		return null
	return (node_variant as Node2D).get_node_or_null("EntityView") as EntityView

func _get_player_view() -> EntityView:
	var main := get_tree().current_scene
	if main == null:
		return null
	var player_variant: Variant = main.get("player")
	if not player_variant is PlayerController:
		return null
	return (player_variant as PlayerController).get_node_or_null("EntityView") as EntityView
