extends Control
class_name ResourceBar

## Runtime resource bar.
## Uses the same proven ratio logic as the former overhead HP bar, but renders
## the fill as a real Control child at the HUD position.

@export var resource_type: String = "HP"
@export var fill_color: Color = Color("65704d")
@export var low_fill_color: Color = Color("8a3a33")
@export var critical_fill_color: Color = Color("6d2f2b")

var current: float = 0.0
var maximum: float = 0.0
var _background: ColorRect
var _fill: ColorRect
var _value_label: Label

const BACKGROUND_COLOR := Color("30261e")
const BORDER_COLOR := Color("0b0908")

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	z_as_relative = false
	z_index = 200
	clip_contents = true

	_background = ColorRect.new()
	_background.name = "Background"
	_background.color = BACKGROUND_COLOR
	_background.position = Vector2.ZERO
	_background.size = size
	_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_background.z_as_relative = false
	_background.z_index = 0
	add_child(_background)

	_fill = ColorRect.new()
	_fill.name = "Fill"
	_fill.color = fill_color
	_fill.position = Vector2.ZERO
	_fill.size = Vector2(0.0, size.y)
	_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill.z_as_relative = false
	_fill.z_index = 1
	add_child(_fill)

	_value_label = Label.new()
	_value_label.name = "ValueLabel"
	_value_label.position = Vector2.ZERO
	_value_label.size = size
	_value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_value_label.z_as_relative = false
	_value_label.z_index = 2
	_value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_value_label.add_theme_font_size_override("font_size", 7)
	_value_label.add_theme_color_override("font_color", Color.WHITE)
	_value_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	_value_label.add_theme_constant_override("shadow_offset_x", 1)
	_value_label.add_theme_constant_override("shadow_offset_y", 1)
	add_child(_value_label)

	_update_label()
	_apply_ratio()

func set_value(new_current: float, new_maximum: float) -> void:
	current = new_current
	maximum = maxf(0.0, new_maximum)
	_update_label()
	_apply_ratio()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		if _background != null:
			_background.size = size
		if _fill != null:
			_fill.size.y = size.y
		if _value_label != null:
			_value_label.size = size
		_apply_ratio()

func _update_label() -> void:
	if _value_label == null:
		return
	_value_label.text = "%d/%d" % [roundi(current), roundi(maximum)]

func _apply_ratio() -> void:
	if _fill == null:
		return

	var ratio := clampf(current / maximum, 0.0, 1.0) if maximum > 0.0 else 0.0
	_fill.size = Vector2(size.x * ratio, size.y)

	if ratio <= 0.25:
		_fill.color = critical_fill_color
	elif ratio <= 0.5:
		_fill.color = low_fill_color
	else:
		_fill.color = fill_color
