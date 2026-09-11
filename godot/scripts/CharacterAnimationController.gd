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
var death_locked: bool = false
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
	if entity_type == value:
		return
	entity_type = value
	_play_current_animation(false)

func set_direction(value: int) -> void:
	if death_locked:
		return
	var new_direction := clampi(value, 0, DIRECTION_COUNT - 1)
	if direction == new_direction:
		return
	direction = new_direction
	_play_current_animation(false)

func set_state(value: int, _loop: bool = true) -> void:
	if death_locked and value != CharacterAnimationState.State.DEATH:
		return
	if current_state != value:
		previous_state = current_state
	current_state = value
	if value == CharacterAnimationState.State.DEATH:
		death_locked = true
	_play_current_animation(true)

func clear_death_lock() -> void:
	death_locked = false
	if current_state == CharacterAnimationState.State.DEATH:
		current_state = CharacterAnimationState.State.IDLE
		previous_state = CharacterAnimationState.State.IDLE
	_play_current_animation(true)

func play_interact() -> void:
	play_state(CharacterAnimationState.State.INTERACT)

func play_state(state: int, _loop: bool = false) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	if death_locked and state != CharacterAnimationState.State.DEATH:
		return
	if not animated_sprite.sprite_frames.has_animation(_animation_name(state)):
		return
	previous_state = current_state
	current_state = state
	if state == CharacterAnimationState.State.DEATH:
		death_locked = true
	_play_current_animation(true)

func has_state_animation(state: int) -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(state))

func has_playable_animation() -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(current_state))

func _play_current_animation(_force: bool = false) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name := _animation_name(current_state)
	if animation_name.is_empty() or not animated_sprite.sprite_frames.has_animation(animation_name):
		return

	# The controller is authoritative for loop behavior. Never inherit the
	# loop flag stored in the SpriteFrames editor for transient actions.
	var should_loop := current_state == CharacterAnimationState.State.IDLE or current_state == CharacterAnimationState.State.WALK
	animated_sprite.sprite_frames.set_animation_loop(animation_name, should_loop)
	animated_sprite.sprite_frames.set_animation_speed(animation_name, ANIMATION_FPS)

	# Every state transition starts from its first frame. Persistent states then
	# loop; transient states run once and finish through animation_finished.
	if animated_sprite.animation != animation_name or _force:
		animated_sprite.stop()
		animated_sprite.frame = 0
		animated_sprite.play(animation_name)
	elif not animated_sprite.is_playing():
		animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	var finished_state := current_state
	var finished_animation := _animation_name(finished_state)
	var frame_count := animated_sprite.sprite_frames.get_frame_count(finished_animation)

	# DEATH is one-shot and terminal. Freeze the actual final frame of the
	# DEATH animation, never a frame from IDLE or another state.
	if finished_state == CharacterAnimationState.State.DEATH:
		if frame_count > 0:
			animated_sprite.frame = frame_count - 1
		animated_sprite.stop()
		return

	# IDLE and WALK are the only persistent looping states.
	if finished_state == CharacterAnimationState.State.WALK or finished_state == CharacterAnimationState.State.IDLE:
		return

	# ATTACK, HIT, BLOCK and INTERACT are one-shot actions.
	animated_sprite.stop()
	if frame_count > 0:
		animated_sprite.frame = 0

	var return_state := previous_state
	if return_state == finished_state or not has_state_animation(return_state):
		return_state = CharacterAnimationState.State.IDLE
	current_state = return_state
	_play_current_animation(true)

func _animation_name(state: int) -> String:
	var state_names: Array = CharacterAnimationState.State.keys()
	if state < 0 or state >= state_names.size():
		return ""
	return "%s_%s" % [str(state_names[state]), direction_names[direction]]
