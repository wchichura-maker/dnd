extends Node

## Presentation-only animation controller.
## It owns SpriteFrames and direction selection; it never changes gameplay state.

class_name CharacterAnimationController

const FRAME_WIDTH: int = 64
const FRAME_HEIGHT: int = 128
const INTERACT_FPS: float = 8.0
const INTERACT_FRAME_COUNT: int = 6
const INTERACT_DIRECTION_COUNT: int = 8
const INTERACT_SHEET := "res://assets/characters/human_fighter/animations/interact.png"

var animated_sprite: AnimatedSprite2D
var current_state: CharacterAnimationState.State = CharacterAnimationState.State.IDLE
var previous_state: CharacterAnimationState.State = CharacterAnimationState.State.IDLE
var direction: CharacterAnimationState.Direction = CharacterAnimationState.Direction.SOUTH
var direction_names: Array[String] = [
	"SOUTH", "SOUTHEAST", "EAST", "NORTHEAST",
	"NORTH", "NORTHWEST", "WEST", "SOUTHWEST"
]

func configure(sprite: AnimatedSprite2D) -> void:
	animated_sprite = sprite
	animated_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if not animated_sprite.animation_finished.is_connected(_on_animation_finished):
		animated_sprite.animation_finished.connect(_on_animation_finished)
	_build_interact_animation()

func set_direction(value: CharacterAnimationState.Direction) -> void:
	direction = value
	_refresh_current_animation_frame()

func set_state(value: CharacterAnimationState.State, loop := true) -> void:
	if current_state != value:
		previous_state = current_state
	current_state = value
	if animated_sprite == null:
		return

	var animation_name := _animation_name(value)
	if not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	animated_sprite.sprite_frames.set_animation_loop(animation_name, loop)
	animated_sprite.play(animation_name)

func play_interact() -> void:
	if animated_sprite == null:
		return
	previous_state = current_state
	current_state = CharacterAnimationState.State.INTERACT
	var animation_name := _animation_name(CharacterAnimationState.State.INTERACT)
	if not animated_sprite.sprite_frames.has_animation(animation_name):
		return
	animated_sprite.sprite_frames.set_animation_loop(animation_name, false)
	animated_sprite.play(animation_name)

func _on_animation_finished() -> void:
	if current_state != CharacterAnimationState.State.INTERACT:
		return
	var return_state := previous_state
	if return_state == CharacterAnimationState.State.INTERACT:
		return_state = CharacterAnimationState.State.IDLE
	current_state = return_state
	var animation_name := _animation_name(return_state)
	if animated_sprite.sprite_frames.has_animation(animation_name):
		animated_sprite.sprite_frames.set_animation_loop(animation_name, true)
		animated_sprite.play(animation_name)

func _animation_name(state: CharacterAnimationState.State) -> String:
	return CharacterAnimationState.State.keys()[state]

func _build_interact_animation() -> void:
	if animated_sprite == null:
		return
	var frames := animated_sprite.sprite_frames
	if frames.has_animation("INTERACT"):
		frames.remove_animation("INTERACT")
	frames.add_animation("INTERACT")
	frames.set_animation_loop("INTERACT", false)
	frames.set_animation_speed("INTERACT", INTERACT_FPS)

	var sheet := AssetRegistry.load_texture(INTERACT_SHEET)
	if sheet == null:
		return

	for row in range(INTERACT_DIRECTION_COUNT):
		for column in range(INTERACT_FRAME_COUNT):
			var atlas := AtlasTexture.new()
			atlas.atlas = sheet
			atlas.region = Rect2(column * FRAME_WIDTH, row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT)
			frames.add_frame("INTERACT", atlas)

	_refresh_current_animation_frame()

func _refresh_current_animation_frame() -> void:
	if animated_sprite == null:
		return
	if current_state != CharacterAnimationState.State.INTERACT:
		return
	if not animated_sprite.sprite_frames.has_animation("INTERACT"):
		return
	var frame := direction * INTERACT_FRAME_COUNT
	animated_sprite.frame = frame
