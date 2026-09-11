extends Node

## Presentation-only animation controller.
## It owns SpriteFrames and direction selection; it never changes gameplay state.

class_name CharacterAnimationController

const FRAME_WIDTH: int = 64
const FRAME_HEIGHT: int = 128
const INTERACT_FPS: float = 8.0
const INTERACT_FRAME_COUNT: int = 6
const INTERACT_DIRECTION_COUNT: int = 8

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
	_build_interact_animations()

func set_entity_type(value: String) -> void:
	entity_type = value
	_build_interact_animations()

func set_direction(value: int) -> void:
	direction = clampi(value, 0, INTERACT_DIRECTION_COUNT - 1)
	if current_state == CharacterAnimationState.State.INTERACT:
		_play_current_animation(false)

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
	if state == CharacterAnimationState.State.INTERACT:
		return "INTERACT_%s" % direction_names[direction]
	return CharacterAnimationState.State.keys()[state]

func _build_interact_animations() -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	var frames := animated_sprite.sprite_frames
	var sheet := AssetRegistry.animation_sheet(CharacterAnimationState.State.INTERACT, entity_type)
	if sheet == null:
		return

	for row in range(INTERACT_DIRECTION_COUNT):
		var animation_name := "INTERACT_%s" % direction_names[row]
		if frames.has_animation(animation_name):
			frames.remove_animation(animation_name)
		frames.add_animation(animation_name)
		frames.set_animation_loop(animation_name, false)
		frames.set_animation_speed(animation_name, INTERACT_FPS)

		for column in range(INTERACT_FRAME_COUNT):
			var atlas := AtlasTexture.new()
			atlas.atlas = sheet
			atlas.region = Rect2(column * FRAME_WIDTH, row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT)
			frames.add_frame(animation_name, atlas)
