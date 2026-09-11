extends Node

## Presentation-only animation controller.
## Gameplay systems refer to animation states and directions, never filenames.

class_name CharacterAnimationController

const INTERACT_FPS: float = 8.0
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
	_play_current_animation(true)

func set_entity_type(value: String) -> void:
	entity_type = value
	_play_current_animation(true)

func set_direction(value: int) -> void:
	direction = clampi(value, 0, DIRECTION_COUNT - 1)
	_play_current_animation(current_state != CharacterAnimationState.State.INTERACT)

func set_state(value: int, loop := true) -> void:
	if current_state != value:
		previous_state = current_state
	current_state = value
	_play_current_animation(loop)

func play_interact() -> void:
	if animated_sprite == null:
		return
	previous_state = current_state
	current_state = CharacterAnimationState.State.INTERACT
	_play_current_animation(false)

func has_state_animation(state: int) -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(state))

func has_playable_animation() -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_resolved_animation_name())

func _play_current_animation(loop: bool) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name: String = _resolved_animation_name()
	if animation_name.is_empty():
		return
	animated_sprite.sprite_frames.set_animation_loop(animation_name, loop)
	if current_state == CharacterAnimationState.State.INTERACT:
		animated_sprite.sprite_frames.set_animation_speed(animation_name, INTERACT_FPS)
	animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	if current_state != CharacterAnimationState.State.INTERACT:
		return
	var return_state: int = previous_state
	if return_state == CharacterAnimationState.State.INTERACT:
		return_state = CharacterAnimationState.State.IDLE
	current_state = return_state
	_play_current_animation(true)

func _animation_name(state: int) -> String:
	var state_names: Array = CharacterAnimationState.State.keys()
	if state < 0 or state >= state_names.size():
		return ""
	var state_name: String = str(state_names[state])
	return "%s_%s" % [state_name, direction_names[direction]]

func _resolved_animation_name() -> String:
	var desired: String = _animation_name(current_state)
	if animated_sprite != null and animated_sprite.sprite_frames != null and animated_sprite.sprite_frames.has_animation(desired):
		return desired
	# Temporary presentation fallback until the remaining state sheets are installed.
	var fallback: String = _animation_name(CharacterAnimationState.State.INTERACT)
	if animated_sprite != null and animated_sprite.sprite_frames != null and animated_sprite.sprite_frames.has_animation(fallback):
		return fallback
	return ""
