extends Node

## Temporary presentation debug helper for validating INTERACT.
## F1-F8 select the eight directions; I plays the non-looping animation.

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

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

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
		var direction: CharacterAnimationState.Direction = DIRECTION_KEYS[key_event.keycode]
		var view := _get_player_view()
		if view != null:
			view.set_facing_direction(direction)

func _get_player_view() -> EntityView:
	var main := get_tree().current_scene
	if main == null:
		return null
	var player_variant: Variant = main.get("player")
	if not player_variant is PlayerController:
		return null
	return (player_variant as PlayerController).get_node_or_null("EntityView") as EntityView
