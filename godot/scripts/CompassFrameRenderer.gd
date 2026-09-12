@tool
extends Control
class_name CompassFrameRenderer

## Renders the approved compass frame asset directly in CanvasItem space.
## The frame is presentation-only and must remain above the minimap.
## Position and size are owned by the Godot scene editor.

const FRAME_TEXTURE_PATH := "res://assets/ui/location_compass_frame.png"

var frame_texture: Texture2D = preload(FRAME_TEXTURE_PATH)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	queue_redraw()

func _draw() -> void:
	if frame_texture == null or size.x <= 0.0 or size.y <= 0.0:
		return
	draw_texture_rect(frame_texture, Rect2(Vector2.ZERO, size), false)
