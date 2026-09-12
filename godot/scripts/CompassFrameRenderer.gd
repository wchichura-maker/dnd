extends Control
class_name CompassFrameRenderer

## Renders the approved compass frame asset directly in CanvasItem space.
## The frame is presentation-only and must remain above the minimap.

const FRAME_TEXTURE_PATH := "res://assets/ui/location_compass_frame.png"

var frame_texture: Texture2D

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	frame_texture = load(FRAME_TEXTURE_PATH) as Texture2D
	queue_redraw()

func _draw() -> void:
	if frame_texture == null:
		return
	draw_texture_rect(frame_texture, Rect2(Vector2.ZERO, size), false)
