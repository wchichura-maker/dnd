extends Node2D

## Presentation-only view for a game entity.
## Logical state remains outside this node.

class_name EntityView

var entity_id: String = ""
var entity_name: String = ""
var entity_type: String = "NPC"
var hp: int = 0
var max_hp: int = 0
var armor_class: int = 10
var selected: bool = false
var character_sprite: AnimatedSprite2D
var animation_controller: CharacterAnimationController

const RADIUS: float = 14.0
const BAR_WIDTH: float = 42.0
const BAR_HEIGHT: float = 5.0
const PAPER_BURNED := Color("d6c9a8")
const WOOD_DARK := Color("30261e")
const LEATHER := Color("70553d")
const GOLD := Color("b08a4d")
const SUCCESS := Color("65704d")
const FAILURE := Color("93483d")

func _ready() -> void:
	_ensure_character_sprite()

func apply_snapshot(snapshot: EntitySnapshot) -> void:
	entity_id = snapshot.id
	entity_name = snapshot.name
	entity_type = snapshot.entity_type
	hp = snapshot.hp
	max_hp = snapshot.max_hp
	armor_class = snapshot.armor_class
	_ensure_character_sprite()
	animation_controller.set_entity_type(entity_type)
	animation_controller.set_state(CharacterAnimationState.State.IDLE, true)
	character_sprite.visible = entity_type == "PLAYER" and animation_controller.has_playable_animation()
	queue_redraw()

func play_interact() -> void:
	if animation_controller != null:
		animation_controller.play_interact()

func set_facing_direction(value: int) -> void:
	if animation_controller != null:
		animation_controller.set_direction(value)

func _ensure_character_sprite() -> void:
	if character_sprite == null:
		character_sprite = get_node_or_null("CharacterSprite") as AnimatedSprite2D
	if character_sprite == null:
		return
	character_sprite.centered = true
	character_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	character_sprite.position = Vector2(0, -9)
	if animation_controller == null:
		animation_controller = get_node_or_null("AnimationController") as CharacterAnimationController
	if animation_controller == null:
		animation_controller = CharacterAnimationController.new()
		animation_controller.name = "AnimationController"
		add_child(animation_controller)
		animation_controller.configure(character_sprite)

func _draw() -> void:
	var has_character_art: bool = character_sprite != null and character_sprite.visible
	var is_dead := hp <= -10
	var is_dying := hp < 0 and not is_dead

	# Legacy placeholder is only used when no authored character art is available.
	if not has_character_art:
		var ring_color: Color = GOLD if selected else LEATHER
		var body_color: Color = LEATHER if entity_type == "PLAYER" else WOOD_DARK
		draw_circle(Vector2.ZERO, RADIUS, FAILURE if is_dead else body_color)
		draw_circle(Vector2.ZERO, RADIUS, PAPER_BURNED, false, 1.5)
		draw_line(Vector2(0, -4), Vector2(0, -18), PAPER_BURNED, 2.0)
		draw_circle(Vector2.ZERO, 20.0, Color(WOOD_DARK, 0.92), false, 2.0)
		draw_arc(Vector2.ZERO, 20.0, 0.0, TAU, 32, ring_color, 2.5 if selected else 1.5)

	# Keep gameplay metadata visible without drawing the old body behind the sprite.
	var hp_ratio: float = 0.0
	if max_hp > 0:
		hp_ratio = clampf(float(hp) / float(max_hp), 0.0, 1.0)
	var bar_origin := Vector2(-BAR_WIDTH * 0.5, -31.0)
	draw_rect(Rect2(bar_origin, Vector2(BAR_WIDTH, BAR_HEIGHT)), Color(WOOD_DARK, 0.95))
	draw_rect(Rect2(bar_origin, Vector2(BAR_WIDTH * hp_ratio, BAR_HEIGHT)), SUCCESS if not is_dying and not is_dead else FAILURE)

	if entity_name != "":
		draw_string(ThemeDB.fallback_font, Vector2(-40, 34), entity_name, HORIZONTAL_ALIGNMENT_CENTER, 80, 12, PAPER_BURNED)
