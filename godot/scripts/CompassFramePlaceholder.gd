extends Control
class_name CompassFramePlaceholder

## Temporary technical frame used only because the approved
## location_compass_frame.png is not yet present in the repository.
## Replace this node with the approved PNG without changing the HUD API.

const FRAME := Color("b08a4d")
const FRAME_DARK := Color("30261e")
const TEXT := Color("d6c9a8")

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	queue_redraw()

func _draw() -> void:
	var center := size * 0.5
	var radius := minf(size.x, size.y) * 0.5 - 3.0
	draw_circle(center, radius, FRAME_DARK, true)
	draw_arc(center, radius, 0.0, TAU, 64, FRAME, 2.0, false)
	draw_arc(center, radius - 5.0, 0.0, TAU, 64, Color(FRAME, 0.45), 1.0, false)
	var font := ThemeDB.fallback_font
	draw_string(font, center + Vector2(-5, -radius + 12), "N", HORIZONTAL_ALIGNMENT_CENTER, 10, 8, TEXT)
	draw_string(font, center + Vector2(-5, radius - 2), "S", HORIZONTAL_ALIGNMENT_CENTER, 10, 8, TEXT)
	draw_string(font, center + Vector2(radius - 9, 3), "E", HORIZONTAL_ALIGNMENT_CENTER, 10, 8, TEXT)
	draw_string(font, center + Vector2(-radius, 3), "W", HORIZONTAL_ALIGNMENT_CENTER, 10, 8, TEXT)
