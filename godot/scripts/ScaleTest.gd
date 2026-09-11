extends Control

## Visual scale calibration scene.
## Uses abstract adult-proportion silhouettes so the current temporary asset pack
## cannot bias the decision. The test compares candidate heights against a 64 px cell.

class_name ScaleTest

const CELL: float = VisualScale.GRID_CELL_PIXELS
const PAPER_LIGHT := Color("e1d5b8")
const PAPER_BURNED := Color("d6c9a8")
const PAPER_SHADOW := Color("b5a383")
const WOOD_DARK := Color("30261e")
const WOOD := Color("574337")
const LEATHER := Color("70553d")
const GOLD := Color("b08a4d")

var candidates: Array[float] = [1.25, 1.35, 1.40, 1.45, 1.55]

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()

func _draw() -> void:
	var size := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), Color(WOOD_DARK, 0.96))

	var origin := Vector2(70.0, 170.0)
	var gap := 220.0
	for index in range(candidates.size()):
		_draw_candidate(origin + Vector2(index * gap, 0.0), candidates[index])

	_draw_size_examples(Vector2(70.0, 590.0))
	_draw_text(Vector2(70.0, 48.0), "D&D ONLINE  •  VISUAL SCALE TEST", 22, GOLD)
	_draw_text(Vector2(70.0, 82.0), "1 cell = 5 ft  •  base cell = 64 px  •  abstract adult proportions", 14, PAPER_BURNED)
	_draw_text(Vector2(70.0, 108.0), "Compare the feet/footprint relationship, not the silhouette style.", 12, PAPER_SHADOW)
	_draw_text(Vector2(1010.0, 82.0), "TARGET", 12, GOLD)
	_draw_text(Vector2(1010.0, 104.0), "Medium ≈ 1.40 cells", 14, PAPER_LIGHT)
	_draw_text(Vector2(1010.0, 126.0), "≈ %.0f px visual height" % VisualScale.medium_height_pixels(), 13, PAPER_SHADOW)

func _draw_candidate(center: Vector2, height_cells: float) -> void:
	var cell_rect := Rect2(center.x - CELL * 0.5, center.y, CELL, CELL)
	draw_rect(cell_rect, Color(PAPER_SHADOW, 0.12))
	draw_line(cell_rect.position, cell_rect.position + Vector2(CELL, 0), Color(PAPER_SHADOW, 0.35), 1.0)
	draw_line(cell_rect.position + Vector2(CELL, 0), cell_rect.position + Vector2(CELL, CELL), Color(PAPER_SHADOW, 0.35), 1.0)
	draw_line(cell_rect.position + Vector2(CELL, CELL), cell_rect.position + Vector2(0, CELL), Color(PAPER_SHADOW, 0.35), 1.0)
	draw_line(cell_rect.position + Vector2(0, CELL), cell_rect.position, Color(PAPER_SHADOW, 0.35), 1.0)

	var height_px := height_cells * CELL
	var feet := Vector2(center.x, center.y + CELL * 0.78)
	var top := feet.y - height_px
	var body_width := CELL * 0.50
	var head_radius := CELL * 0.16
	var torso_top := top + head_radius * 2.2
	var torso_bottom := feet.y - CELL * 0.18

	# Dark-brown contour and muted body, deliberately independent from any pack asset.
	draw_circle(Vector2(center.x, top + head_radius), head_radius + 2.0, WOOD_DARK)
	draw_circle(Vector2(center.x, top + head_radius), head_radius, LEATHER)
	draw_rect(Rect2(center.x - body_width * 0.5 - 2.0, torso_top - 2.0, body_width + 4.0, torso_bottom - torso_top + 2.0), WOOD_DARK)
	draw_rect(Rect2(center.x - body_width * 0.5, torso_top, body_width, torso_bottom - torso_top), WOOD)

	var leg_width := CELL * 0.12
	var leg_top := torso_bottom - 2.0
	draw_rect(Rect2(center.x - leg_width - 2.0, leg_top, leg_width + 4.0, feet.y - leg_top + 2.0), WOOD_DARK)
	draw_rect(Rect2(center.x - leg_width, leg_top, leg_width, feet.y - leg_top), LEATHER)
	draw_rect(Rect2(center.x + 2.0, leg_top, leg_width + 4.0, feet.y - leg_top + 2.0), WOOD_DARK)
	draw_rect(Rect2(center.x + 2.0, leg_top, leg_width, feet.y - leg_top), LEATHER)

	# Soft directional ground shadow: upper-left light, shadow cast down-right.
	draw_ellipse(feet + Vector2(8.0, 4.0), Vector2(CELL * 0.25, CELL * 0.08), Color(WOOD_DARK, 0.42))

	var is_target := is_equal_approx(height_cells, 1.40)
	var line_color := GOLD if is_target else PAPER_SHADOW
	draw_line(Vector2(center.x - CELL * 0.5, top), Vector2(center.x + CELL * 0.5, top), line_color, 1.0)
	draw_line(Vector2(center.x - CELL * 0.5, feet.y), Vector2(center.x + CELL * 0.5, feet.y), line_color, 1.0)
	_draw_text(Vector2(center.x - 70.0, 300.0), "%.2f cell" % height_cells, 15, GOLD if is_target else PAPER_LIGHT)
	_draw_text(Vector2(center.x - 70.0, 322.0), "%.0f px" % height_px, 12, PAPER_SHADOW)
	_draw_text(Vector2(center.x - 70.0, 344.0), "1×1 footprint", 11, PAPER_SHADOW)

func _draw_size_examples(origin: Vector2) -> void:
	_draw_text(origin, "FOOTPRINT REFERENCE", 13, GOLD)
	var sizes := [{"name":"Medium", "cells":1}, {"name":"Large", "cells":2}, {"name":"Huge", "cells":3}, {"name":"Gargantuan", "cells":4}]
	for index in range(sizes.size()):
		var item: Dictionary = sizes[index]
		var cells := int(item["cells"])
		var x := origin.x + index * 240.0
		_draw_text(Vector2(x, origin.y + 28.0), "%s  %d×%d" % [item["name"], cells, cells], 12, PAPER_LIGHT)
		for y in range(cells):
			for col in range(cells):
				draw_rect(Rect2(x + col * 18.0, origin.y + 48.0 + y * 18.0, 16.0, 16.0), Color(PAPER_SHADOW, 0.18))
				draw_rect(Rect2(x + col * 18.0, origin.y + 48.0 + y * 18.0, 16.0, 16.0), Color(GOLD, 0.35), false, 1.0)

func _draw_text(position: Vector2, text: String, size: int, color: Color) -> void:
	draw_string(ThemeDB.fallback_font, position, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func draw_ellipse(center: Vector2, radii: Vector2, color: Color) -> void:
	var points := PackedVector2Array()
	for index in range(25):
		var angle := TAU * float(index) / 24.0
		points.append(center + Vector2(cos(angle) * radii.x, sin(angle) * radii.y))
	draw_colored_polygon(points, color)
