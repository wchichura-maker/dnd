extends CanvasLayer

const OVERLAY_SCRIPT = preload("res://scripts/FogOfWarOverlay.gd")

var overlay: Control

func _ready() -> void:
	layer = 0
	process_mode = Node.PROCESS_MODE_ALWAYS
	overlay = Control.new()
	overlay.name = "FogOverlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_script(OVERLAY_SCRIPT)
	add_child(overlay)
