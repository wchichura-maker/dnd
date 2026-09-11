extends Node2D
class_name FogOfWarRenderer

const TILE_SIZE: float = 48.0
const UNKNOWN_COLOR := Color(0.035, 0.029, 0.024, 0.90)
const EXPLORED_COLOR := Color(0.08, 0.065, 0.052, 0.50)

var explored_tiles: Dictionary[Vector2i, bool] = {}
var visible_tiles: Dictionary[Vector2i, bool] = {}
var map_size: Vector2i = Vector2i(120, 80)
var last_camera_center: Vector2 = Vector2.INF

func _ready() -> void:
	z_index = 20
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(true)

func apply_snapshot(snapshot: Dictionary, current_map_size: Vector2i) -> void:
	map_size = current_map_size
	var presentation_variant: Variant = snapshot.get("presentation", {})
	if not presentation_variant is Dictionary:
		return
	var presentation := presentation_variant as Dictionary
	var perception_variant: Variant = presentation.get("perception", {})
	if not perception_variant is Dictionary:
		return
	var perception := perception_variant as Dictionary
	visible_tiles.clear()
	var visible_variant: Variant = perception.get("visibleTiles", [])
	if visible_variant is Array:
		for key_variant in visible_variant as Array:
			var tile := _parse_key(str(key_variant))
			if tile.x >= 0:
				visible_tiles[tile] = true

	var explored_variant: Variant = perception.get("exploredTiles", [])
	if explored_variant is Array:
		for key_variant in explored_variant as Array:
			var tile := _parse_key(str(key_variant))
			if tile.x >= 0:
				explored_tiles[tile] = true

	_update_entity_visibility()
	queue_redraw()

func is_tile_visible(tile: Vector2i) -> bool:
	return visible_tiles.has(tile)

func _parse_key(value: String) -> Vector2i:
	var parts := value.split(",")
	if parts.size() != 2:
		return Vector2i(-1, -1)
	return Vector2i(int(parts[0]), int(parts[1]))

func _update_entity_visibility() -> void:
	var main := get_parent()
	if main == null:
		return
	var nodes_variant: Variant = main.get("entity_nodes")
	if not nodes_variant is Dictionary:
		return
	var nodes := nodes_variant as Dictionary
	var player_id := str(main.get("PLAYER_ID"))
	for entity_id_variant in nodes.keys():
		var entity_id := str(entity_id_variant)
		var node := nodes[entity_id] as Node2D
		if not is_instance_valid(node):
			continue
		if entity_id == player_id:
			node.visible = true
			continue
		var tile := Vector2i(floori(node.position.x / TILE_SIZE), floori(node.position.y / TILE_SIZE))
		node.visible = visible_tiles.has(tile)

func _process(_delta: float) -> void:
	var main := get_parent()
	if main == null:
		return
	var camera := main.get_node_or_null("Player/Camera2D") as Camera2D
	if camera == null:
		return
	var center := camera.get_screen_center_position()
	if last_camera_center == Vector2.INF or center.distance_squared_to(last_camera_center) > 0.01:
		last_camera_center = center
		queue_redraw()

func _draw() -> void:
	var main := get_parent()
	if main == null:
		return
	var camera := main.get_node_or_null("Player/Camera2D") as Camera2D
	if camera == null:
		return

	var viewport_size := get_viewport_rect().size / camera.zoom
	var screen_center := camera.get_screen_center_position()
	var half_view := viewport_size * 0.5
	var visible_rect := Rect2(screen_center - half_view, viewport_size)
	var min_x := maxi(0, floori(visible_rect.position.x / TILE_SIZE) - 1)
	var min_y := maxi(0, floori(visible_rect.position.y / TILE_SIZE) - 1)
	var max_x := mini(map_size.x - 1, ceili(visible_rect.end.x / TILE_SIZE) + 1)
	var max_y := mini(map_size.y - 1, ceili(visible_rect.end.y / TILE_SIZE) + 1)

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			var tile := Vector2i(x, y)
			if visible_tiles.has(tile):
				continue
			var rect := Rect2(Vector2(tile) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
			if explored_tiles.has(tile):
				draw_rect(rect, EXPLORED_COLOR)
			else:
				draw_rect(rect, UNKNOWN_COLOR)
