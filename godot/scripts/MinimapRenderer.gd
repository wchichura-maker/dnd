extends Control
class_name MinimapRenderer

## North-up minimap renderer.
## It consumes authoritative snapshot data and presentation perception data.
## It does not modify gameplay state.

@export var radius_cells: int = 7
@export var pixels_per_cell: float = 8.0

const PLAYER_ID := "player-01"
const UNKNOWN_COLOR := Color("241e18")
const EXPLORED_COLOR := Color("514633")
const WALKABLE_COLOR := Color("6d694f")
const BLOCKED_COLOR := Color("3b3028")
const PLAYER_COLOR := Color("e3c46b")
const MARKER_OUTLINE := Color("2a211b")

var latest_state: Dictionary = {}
var visible_tiles: Dictionary[Vector2i, bool] = {}
var explored_tiles: Dictionary[Vector2i, bool] = {}
var player_grid: Vector2i = Vector2i.ZERO
var player_direction: int = CharacterAnimationState.Direction.SOUTH
var _last_render_key := ""

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_apply_circular_clip()
	queue_redraw()

func apply_snapshot(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	latest_state = state_variant as Dictionary
	var next_player := _find_player_position(latest_state)
	var next_visible := _read_perception(snapshot, "visibleTiles")
	var next_explored := _read_perception(snapshot, "exploredTiles")
	var next_direction := _read_player_direction()
	var render_key := "%s|%s|%s|%s" % [next_player, next_visible.size(), next_explored.size(), next_direction]
	if render_key == _last_render_key:
		return
	_last_render_key = render_key
	player_grid = next_player
	visible_tiles = next_visible
	explored_tiles = next_explored
	player_direction = next_direction
	queue_redraw()

func _read_perception(snapshot: Dictionary, key: String) -> Dictionary:
	var result: Dictionary = {}
	var presentation_variant: Variant = snapshot.get("presentation", {})
	if not presentation_variant is Dictionary:
		return result
	var perception_variant: Variant = (presentation_variant as Dictionary).get("perception", {})
	if not perception_variant is Dictionary:
		return result
	var tiles_variant: Variant = (perception_variant as Dictionary).get(key, [])
	if not tiles_variant is Array:
		return result
	for value in tiles_variant as Array:
		var parts := str(value).split(",")
		if parts.size() != 2:
			continue
		result[Vector2i(int(parts[0]), int(parts[1]))] = true
	return result

func _find_player_position(state: Dictionary) -> Vector2i:
	for entity_variant in state.get("entities", []) as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) != PLAYER_ID:
			continue
		var position := entity.get("position", {}) as Dictionary
		return Vector2i(int(position.get("x", 0)), int(position.get("y", 0)))
	return Vector2i.ZERO

func _read_player_direction() -> int:
	var main := get_tree().current_scene
	if main == null:
		return CharacterAnimationState.Direction.SOUTH
	var player_variant: Variant = main.get("player")
	if player_variant is PlayerController:
		var player := player_variant as PlayerController
		var controller := player.get_node_or_null("EntityView/AnimationController") as CharacterAnimationController
		if controller != null:
			return controller.direction
	return CharacterAnimationState.Direction.SOUTH

func _apply_circular_clip() -> void:
	var shader := Shader.new()
	shader.code = "shader_type canvas_item;\nrender_mode unshaded;\nvoid fragment() { vec2 p = UV - vec2(0.5); if (length(p) > 0.5) { discard; } COLOR = COLOR; }"
	var shader_material := ShaderMaterial.new()
	shader_material.shader = shader
	shader_material.resource_name = "MinimapCircularClip"
	self.material = shader_material

func _draw() -> void:
	var center := size * 0.5
	var map_radius := minf(size.x, size.y) * 0.5
	var world_map_variant: Variant = latest_state.get("map", {})
	var world_map := world_map_variant as Dictionary if world_map_variant is Dictionary else {}
	var map_width := int(world_map.get("width", 0))
	var map_height := int(world_map.get("height", 0))
	var min_x := maxi(0, player_grid.x - radius_cells)
	var max_x := mini(map_width - 1, player_grid.x + radius_cells)
	var min_y := maxi(0, player_grid.y - radius_cells)
	var max_y := mini(map_height - 1, player_grid.y + radius_cells)
	var cell := pixels_per_cell

	draw_circle(center, map_radius, UNKNOWN_COLOR)

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			var grid := Vector2i(x, y)
			var delta := Vector2(grid - player_grid)
			if delta.length() > float(radius_cells) + 0.75:
				continue
			var tile_color := _tile_color(grid)
			var position := center + delta * cell - Vector2.ONE * cell * 0.5
			draw_rect(Rect2(position, Vector2.ONE * cell), tile_color, true)

	_draw_player_marker(center, map_radius)

func _tile_color(grid: Vector2i) -> Color:
	if not explored_tiles.has(grid) and not visible_tiles.has(grid):
		return UNKNOWN_COLOR
	var tile := _get_tile(grid)
	var walkable := bool(tile.get("walkable", true))
	if visible_tiles.has(grid):
		return WALKABLE_COLOR if walkable else BLOCKED_COLOR
	return EXPLORED_COLOR

func _get_tile(grid: Vector2i) -> Dictionary:
	var map := latest_state.get("map", {}) as Dictionary
	var rows_variant: Variant = map.get("tiles", [])
	if not rows_variant is Array:
		return {}
	var rows := rows_variant as Array
	if grid.y < 0 or grid.y >= rows.size() or not rows[grid.y] is Array:
		return {}
	var row := rows[grid.y] as Array
	if grid.x < 0 or grid.x >= row.size() or not row[grid.x] is Dictionary:
		return {}
	return row[grid.x] as Dictionary

func _draw_player_marker(center: Vector2, map_radius: float) -> void:
	var marker_center := center
	var direction_vector := _direction_vector(player_direction)
	var forward := direction_vector.normalized()
	var right := Vector2(-forward.y, forward.x)
	var tip := marker_center + forward * minf(10.0, map_radius * 0.28)
	var left := marker_center - forward * 5.0 + right * 4.5
	var right_point := marker_center - forward * 5.0 - right * 4.5
	draw_colored_polygon(PackedVector2Array([tip, left, right_point]), MARKER_OUTLINE)
	var inner_tip := marker_center + forward * minf(8.0, map_radius * 0.22)
	var inner_left := marker_center - forward * 4.0 + right * 3.0
	var inner_right := marker_center - forward * 4.0 - right * 3.0
	draw_colored_polygon(PackedVector2Array([inner_tip, inner_left, inner_right]), PLAYER_COLOR)

func _direction_vector(direction: int) -> Vector2:
	match direction:
		CharacterAnimationState.Direction.SOUTH:
			return Vector2.DOWN
		CharacterAnimationState.Direction.SOUTHEAST:
			return Vector2(1, 1)
		CharacterAnimationState.Direction.EAST:
			return Vector2.RIGHT
		CharacterAnimationState.Direction.NORTHEAST:
			return Vector2(1, -1)
		CharacterAnimationState.Direction.NORTH:
			return Vector2.UP
		CharacterAnimationState.Direction.NORTHWEST:
			return Vector2(-1, -1)
		CharacterAnimationState.Direction.WEST:
			return Vector2.LEFT
		CharacterAnimationState.Direction.SOUTHWEST:
			return Vector2(-1, 1)
	return Vector2.DOWN
