extends CanvasLayer

const OVERLAY_SCRIPT = preload("res://scripts/FogOfWarOverlay.gd")

var overlay: Control

func _ready() -> void:
	layer = 0
	process_mode = Node.PROCESS_MODE_ALWAYS
	overlay = Control.new()
	overlay.name = "FogOverlay"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_script(OVERLAY_SCRIPT)
	add_child(overlay)
	_resize_overlay()
	get_viewport().size_changed.connect(_resize_overlay)

func _resize_overlay() -> void:
	if overlay == null:
		return
	overlay.position = Vector2.ZERO
	overlay.size = get_viewport().get_visible_rect().size
