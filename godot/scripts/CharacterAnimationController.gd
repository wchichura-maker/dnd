extends Node

## Presentation-only animation controller.
## Gameplay systems refer to animation states and directions, never filenames.

class_name CharacterAnimationController

const SHEET_COLUMNS: int = 6
const SHEET_ROWS: int = 8
const IDLE_FPS: float = 6.0
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
	_build_state_animations(CharacterAnimationState.State.IDLE)
	_build_state_animations(CharacterAnimationState.State.INTERACT)
	_play_current_animation(true)

func set_entity_type(value: String) -> void:
	entity_type = value
	_build_state_animations(CharacterAnimationState.State.IDLE)
	_build_state_animations(CharacterAnimationState.State.INTERACT)

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
	return animated_sprite != null and animated_sprite.sprite_frames != null and animated_sprite.sprite_frames.has_animation(_animation_name(state))

func _play_current_animation(loop: bool) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var animation_name := _animation_name(current_state)
	if not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	animated_sprite.sprite_frames.set_animation_loop(animation_name, loop)
	animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	if current_state != CharacterAnimationState.State.INTERACT:
		return
	var return_state := previous_state
	if return_state == CharacterAnimationState.State.INTERACT:
		return_state = CharacterAnimationState.State.IDLE
	current_state = return_state
	_play_current_animation(true)

func _animation_name(state: int) -> String:
	return "%s_%s" % [CharacterAnimationState.State.keys()[state], direction_names[direction]]

func _build_state_animations(state: int) -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var sheet := AssetRegistry.animation_sheet(state, entity_type)
	if sheet == null:
		return
	var frames := animated_sprite.sprite_frames
	var state_name := CharacterAnimationState.State.keys()[state]
	var fps := INTERACT_FPS if state == CharacterAnimationState.State.INTERACT else IDLE_FPS
	var frame_width := float(sheet.get_width()) / float(SHEET_COLUMNS)
	var frame_height := float(sheet.get_height()) / float(SHEET_ROWS)
	for row in range(DIRECTION_COUNT):
		var animation_name := "%s_%s" % [state_name, direction_names[row]]
		if frames.has_animation(animation_name):
			frames.remove_animation(animation_name)
		frames.add_animation(animation_name)
		frames.set_animation_loop(animation_name, state != CharacterAnimationState.State.INTERACT)
		frames.set_animation_speed(animation_name, fps)
		for column in range(SHEET_COLUMNS):
			var atlas := AtlasTexture.new()
			atlas.atlas = sheet
			atlas.region = Rect2(column * frame_width, row * frame_height, frame_width, frame_height)
			frames.add_frame(animation_name, atlas)
