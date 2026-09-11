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

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	queue_redraw()

func set_value(new_current: float, new_maximum: float) -> void:
	current = new_current
	maximum = maxf(0.0, new_maximum)
	var target := clampf(current / maximum, 0.0, 1.0) if maximum > 0.0 else 0.0
	if not is_node_ready() or not animate_changes:
		displayed_ratio = target
		queue_redraw()
		return
	if _tween != null and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.set_trans(Tween.TRANS_QUAD)
	_tween.set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "displayed_ratio", target, animation_duration)

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	var ratio := clampf(displayed_ratio, 0.0, 1.0)
	var width := size.x * ratio
	var active_color := fill_color
	if ratio <= 0.25:
		active_color = critical_fill_color
	elif ratio <= 0.5:
		active_color = low_fill_color
	if width > 0.0:
		draw_rect(Rect2(0.0, 0.0, width, size.y), active_color)
