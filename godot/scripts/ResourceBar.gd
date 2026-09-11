extends Control
class_name ResourceBar

## Runtime resource bar.
## The bar is drawn directly by this Control so no child layout, texture,
## anchor, or z-order state can accidentally keep a full bar visible.

@export var resource_type: String = "HP"
@export var fill_color: Color = Color("a14a3d")
@export var low_fill_color: Color = Color("8a3a33")
@export var critical_fill_color: Color = Color("6d2f2b")
@export var animate_changes: bool = false
@export var animation_duration: float = 0.18

var current: float = 0.0
var maximum: float = 0.0
var displayed_ratio: float = 0.0
var _tween: Tween
var _value_label: Label

const BACKGROUND_COLOR := Color("201914")
const BORDER_COLOR := Color("0b0908")

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	z_as_relative = true
	z_index = 100
	clip_contents = true

	_value_label = Label.new()
	_value_label.name = "ValueLabel"
	_value_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_value_label.z_index = 10
	_value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_value_label.add_theme_font_size_override("font_size", 7)
	_value_label.add_theme_color_override("font_color", Color.WHITE)
	_value_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	_value_label.add_theme_constant_override("shadow_offset_x", 1)
	_value_label.add_theme_constant_override("shadow_offset_y", 1)
	add_child(_value_label)

	_update_label()
	queue_redraw()

func set_value(new_current: float, new_maximum: float) -> void:
	current = new_current
	maximum = maxf(0.0, new_maximum)
	var target := clampf(current / maximum, 0.0, 1.0) if maximum > 0.0 else 0.0
	_update_label()

	if _tween != null and _tween.is_valid():
		_tween.kill()

	if not is_node_ready() or not animate_changes:
		displayed_ratio = target
		queue_redraw()
		return

	_tween = create_tween()
	_tween.set_trans(Tween.TRANS_QUAD)
	_tween.set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "displayed_ratio", target, animation_duration)
	_tween.finished.connect(queue_redraw)
	queue_redraw()

func _process(_delta: float) -> void:
	if animate_changes:
		queue_redraw()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()

func _update_label() -> void:
	if _value_label == null:
		return
	_value_label.text = "%d/%d" % [roundi(current), roundi(maximum)]

func _draw() -> void:
	var width := maxf(0.0, size.x)
	var height := maxf(0.0, size.y)
	if width <= 0.0 or height <= 0.0:
		return

	# Explicit empty/background region.
	draw_rect(Rect2(Vector2.ZERO, Vector2(width, height)), BACKGROUND_COLOR, true)

	var ratio := clampf(displayed_ratio, 0.0, 1.0)
	if ratio > 0.0:
		var fill_width := width * ratio
		var active_color := fill_color
		if ratio <= 0.25:
			active_color = critical_fill_color
		elif ratio <= 0.5:
			active_color = low_fill_color
		draw_rect(Rect2(Vector2.ZERO, Vector2(fill_width, height)), active_color, true)

	# One-pixel border is drawn after the fill so the resource amount remains
	# readable even when the value is near zero or full.
	draw_rect(Rect2(Vector2.ZERO, Vector2(width, height)), BORDER_COLOR, false, 1.0)
