extends Node

## Presentation-only animation controller.
## Gameplay systems refer to animation states and directions, never filenames.

class_name CharacterAnimationController

const ANIMATION_FPS: float = 8.0
const DIRECTION_COUNT: int = 8

var animated_sprite: AnimatedSprite2D
var entity_type: String = "PLAYER"
var current_state: int = CharacterAnimationState.State.IDLE
var previous_state: int = CharacterAnimationState.State.IDLE
var direction: int = CharacterAnimationState.Direction.SOUTH
var direction_names: Array[String] = [
	"SOUTH", "SOUTHEAST", "EAST", "NORTHEAST",
	"NORTH", "NORTHWEST", "WEST", "SOUTHWEST"
]

func configure(sprite: AnimatedSprite2D) -> void:
	animated_sprite = sprite
	if animated_sprite.sprite_frames == null:
		animated_sprite.sprite_frames = SpriteFrames.new()
	animated_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if not animated_sprite.animation_finished.is_connected(_on_animation_finished):
		animated_sprite.animation_finished.connect(_on_animation_finished)
	_play_current_animation()

func set_entity_type(value: String) -> void:
	if entity_type == value:
		return
	entity_type = value
	_play_current_animation()

func set_direction(value: int) -> void:
	var new_direction := clampi(value, 0, DIRECTION_COUNT - 1)
	if direction == new_direction:
		return
	direction = new_direction
	_play_current_animation()

func set_state(value: int, loop := true) -> void:
	if current_state != value:
		previous_state = current_state
	current_state = value
	_play_current_animation(loop)

func play_interact() -> void:
	play_state(CharacterAnimationState.State.INTERACT, false)

func play_state(state: int, loop := false) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	if not animated_sprite.sprite_frames.has_animation(_animation_name(state)):
		return
	previous_state = current_state
	current_state = state
	_play_current_animation(loop)

func has_state_animation(state: int) -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(state))

func has_playable_animation() -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(current_state))

func _play_current_animation(loop_override: Variant = null) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name := _animation_name(current_state)
	if animation_name.is_empty() or not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	var loop := _default_loop_for_state(current_state) if loop_override == null else bool(loop_override)
	animated_sprite.sprite_frames.set_animation_loop(animation_name, loop)
	animated_sprite.sprite_frames.set_animation_speed(animation_name, ANIMATION_FPS)
	if animated_sprite.animation != animation_name:
		animated_sprite.play(animation_name)
	elif not animated_sprite.is_playing():
		animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	# Death is terminal for the current character. Keep the final DEATH frame
	# visible instead of returning to the previous state (normally IDLE).
	if current_state == CharacterAnimationState.State.DEATH:
		animated_sprite.stop()
		return
	if current_state == CharacterAnimationState.State.WALK or current_state == CharacterAnimationState.State.IDLE:
		return
	var return_state := previous_state
	if return_state == current_state or not has_state_animation(return_state):
		return_state = CharacterAnimationState.State.IDLE
	current_state = return_state
	_play_current_animation()

func _default_loop_for_state(state: int) -> bool:
	return state == CharacterAnimationState.State.WALK or state == CharacterAnimationState.State.IDLE

func _animation_name(state: int) -> String:
	var state_names: Array = CharacterAnimationState.State.keys()
	if state < 0 or state >= state_names.size():
		return ""
	return "%s_%s" % [str(state_names[state]), direction_names[direction]]
