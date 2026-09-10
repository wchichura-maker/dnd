extends Node2D

## Presentation-only view for a game entity.
## Logical state remains outside this node.

class_name EntityView

var entity_id := ""
var entity_name := ""
var entity_type := "NPC"
var hp := 0
var max_hp := 0
var armor_class := 10
var selected := false

const RADIUS := 14.0
const BAR_WIDTH := 42.0
const BAR_HEIGHT := 5.0

func apply_snapshot(snapshot: EntitySnapshot) -> void:
	entity_id = snapshot.id
	entity_name = snapshot.name
	entity_type = snapshot.entity_type
	hp = snapshot.hp
	max_hp = snapshot.max_hp
	armor_class = snapshot.armor_class
	queue_redraw()

func _draw() -> void:
	var ring_color := Color("d0a85c") if selected else Color("777777")
	var body_color := Color("7d5cff") if entity_type == "PLAYER" else Color("9b5b4b")

	draw_circle(Vector2.ZERO, 20.0, Color("111111", 0.9))
	draw_arc(Vector2.ZERO, 20.0, 0.0, TAU, 32, ring_color, 2.0)
	draw_circle(Vector2.ZERO, RADIUS, body_color)
	draw_circle(Vector2.ZERO, RADIUS, Color("eeeeee"), false, 2.0)
	draw_line(Vector2(0, -4), Vector2(0, -18), Color("eeeeee"), 3.0)

	# HP bar is presentation only; it does not own or mutate HP.
	var hp_ratio := 0.0 if max_hp <= 0 else clamp(float(hp) / float(max_hp), 0.0, 1.0)
	var bar_origin := Vector2(-BAR_WIDTH * 0.5, -31.0)
	draw_rect(Rect2(bar_origin, Vector2(BAR_WIDTH, BAR_HEIGHT)), Color("111111"))
	draw_rect(Rect2(bar_origin, Vector2(BAR_WIDTH * hp_ratio, BAR_HEIGHT)), Color("68a85c"))

	if entity_name != "":
		draw_string(ThemeDB.fallback_font, Vector2(-32, 34), entity_name, HORIZONTAL_ALIGNMENT_LEFT, 64, 12, Color("eeeeee"))
