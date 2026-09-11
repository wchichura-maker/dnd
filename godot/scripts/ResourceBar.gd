extends Control
class_name ResourceBar

@export var resource_type: String = "HP"
@export var fill_color: Color = Color("a14a3d")
@export var low_fill_color: Color = Color("8a3a33")
@export var critical_fill_color: Color = Color("6d2f2b")
@export var animate_changes: bool = true
@export var animation_duration: float = 0.18

var current: float = 0.0
var maximum: float = 0.0
var displayed_ratio: float = 0.0
var _tween: Tween
var _fill: ColorRect
var _value_label: Label

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	z_as_relative = true
	z_index = 100

	_fill = ColorRect.new()
	_fill.name = "Fill"
	_fill.position = Vector2.ZERO
	_fill.size = size
	_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill.z_index = 0
	_fill.color = fill_color
	_fill.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(_fill)

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
	_apply_fill(displayed_ratio)

func set_value(new_current: float, new_maximum: float) -> void:
	current = new_current
	maximum = maxf(0.0, new_maximum)
	var target := clampf(current / maximum, 0.0, 1.0) if maximum > 0.0 else 0.0
	_update_label()
	if not is_node_ready() or not animate_changes:
		displayed_ratio = target
		_apply_fill(displayed_ratio)
		return
	if _tween != null and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.set_trans(Tween.TRANS_QUAD)
	_tween.set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "displayed_ratio", target, animation_duration)

func _process(_delta: float) -> void:
	_apply_fill(displayed_ratio)

func _update_label() -> void:
	if _value_label == null:
		return
	_value_label.text = "%d/%d" % [roundi(current), roundi(maximum)]

func _apply_fill(ratio: float) -> void:
	if _fill == null:
		return
	var clamped_ratio := clampf(ratio, 0.0, 1.0)
	_fill.position = Vector2.ZERO
	_fill.size = Vector2(size.x * clamped_ratio, size.y)
	var active_color := fill_color
	if clamped_ratio <= 0.25:
		active_color = critical_fill_color
	elif clamped_ratio <= 0.5:
		active_color = low_fill_color
	_fill.color = active_color
