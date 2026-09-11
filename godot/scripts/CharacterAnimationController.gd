extends Node

## Presentation-only animation controller.
## Persistent states: IDLE/WALK.
## One-shot states: ATTACK/HIT/BLOCK/INTERACT.
## Death sequence: DEATH, then terminal DEAD using the final DEATH frame.

class_name CharacterAnimationController

const ANIMATION_FPS: float = 8.0
const DIRECTION_COUNT: int = 8

var animated_sprite: AnimatedSprite2D
var entity_type: String = "PLAYER"
var persistent_state: int = CharacterAnimationState.State.IDLE
var current_state: int = CharacterAnimationState.State.IDLE
var direction: int = CharacterAnimationState.Direction.SOUTH
var death_locked: bool = false
var action_playing: bool = false

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
	_play_animation(CharacterAnimationState.State.IDLE, true, true)

func set_entity_type(value: String) -> void:
	if entity_type == value:
		return
	entity_type = value

func set_direction(value: int) -> void:
	if death_locked or action_playing:
		return
	var new_direction := clampi(value, 0, DIRECTION_COUNT - 1)
	if direction == new_direction:
		return
	direction = new_direction
	_play_animation(current_state, _is_persistent_state(current_state), true)

func set_state(value: int, _loop: Variant = null) -> void:
	if death_locked:
		return
	if value == CharacterAnimationState.State.IDLE or value == CharacterAnimationState.State.WALK:
		persistent_state = value
		if action_playing:
			return
		_play_animation(persistent_state, true, false)

func play_interact() -> void:
	play_state(CharacterAnimationState.State.INTERACT, false)

func play_state(state: int, _loop: Variant = null) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	if state == CharacterAnimationState.State.DEATH:
		_enter_death()
		return
	if state == CharacterAnimationState.State.DEAD:
		_enter_dead()
		return
	if death_locked:
		return
	if not animated_sprite.sprite_frames.has_animation(_animation_name(state)):
		return
	if state == CharacterAnimationState.State.IDLE or state == CharacterAnimationState.State.WALK:
		set_state(state)
		return

	action_playing = true
	current_state = state
	_play_animation(state, false, true)

func clear_death_lock() -> void:
	death_locked = false
	action_playing = false
	persistent_state = CharacterAnimationState.State.IDLE
	current_state = CharacterAnimationState.State.IDLE
	_play_animation(CharacterAnimationState.State.IDLE, true, true)

func has_state_animation(state: int) -> bool:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return false
	return animated_sprite.sprite_frames.has_animation(_animation_name(state))

func has_playable_animation() -> bool:
	return has_state_animation(current_state)

func _enter_death() -> void:
	if death_locked:
		return
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name := _animation_name(CharacterAnimationState.State.DEATH)
	if not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	death_locked = true
	action_playing = false
	current_state = CharacterAnimationState.State.DEATH
	_play_animation(CharacterAnimationState.State.DEATH, false, true)

func _enter_dead() -> void:
	if not death_locked:
		_enter_death()
		return
	var animation_name := _animation_name(CharacterAnimationState.State.DEATH)
	var frame_count := animated_sprite.sprite_frames.get_frame_count(animation_name)
	if frame_count <= 0:
		return
	current_state = CharacterAnimationState.State.DEAD
	action_playing = false
	animated_sprite.stop()
	animated_sprite.animation = animation_name
	animated_sprite.frame = frame_count - 1

func _play_animation(state: int, loop: bool, restart: bool) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name := _animation_name(state)
	if animation_name.is_empty() or not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	if animated_sprite.sprite_frames.get_animation_loop(animation_name) != loop:
		animated_sprite.sprite_frames.set_animation_loop(animation_name, loop)
	if animated_sprite.sprite_frames.get_animation_speed(animation_name) != ANIMATION_FPS:
		animated_sprite.sprite_frames.set_animation_speed(animation_name, ANIMATION_FPS)
	if restart or animated_sprite.animation != animation_name:
		animated_sprite.stop()
		animated_sprite.frame = 0
		animated_sprite.play(animation_name)
	elif not animated_sprite.is_playing() and current_state != CharacterAnimationState.State.DEAD:
		animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	if animated_sprite == null:
		return

	if current_state == CharacterAnimationState.State.DEATH and death_locked:
		_enter_dead()
		return

	if not action_playing:
		return

	var finished_animation := _animation_name(current_state)
	var frame_count := animated_sprite.sprite_frames.get_frame_count(finished_animation)
	animated_sprite.stop()
	if frame_count > 0:
		animated_sprite.frame = 0

	action_playing = false
	current_state = persistent_state
	_play_animation(persistent_state, true, true)

func _is_persistent_state(state: int) -> bool:
	return state == CharacterAnimationState.State.IDLE or state == CharacterAnimationState.State.WALK

func _animation_name(state: int) -> String:
	if state == CharacterAnimationState.State.DEAD:
		state = CharacterAnimationState.State.DEATH
	var state_names: Array = CharacterAnimationState.State.keys()
	if state < 0 or state >= state_names.size():
		return ""
	return "%s_%s" % [str(state_names[state]), direction_names[direction]]
