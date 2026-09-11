extends Node2D
class_name FogOfWarRenderer

const TILE_SIZE: float = 48.0
const PLAYER_ID := "player-01"
const UNKNOWN_COLOR := Color(0.035, 0.029, 0.024, 0.90)
const EXPLORED_COLOR := Color(0.08, 0.065, 0.052, 0.50)

var explored_tiles: Dictionary[Vector2i, bool] = {}
var visible_tiles: Dictionary[Vector2i, bool] = {}
var map_size: Vector2i = Vector2i(120, 80)
var last_camera_center: Vector2 = Vector2.INF
var last_state: Dictionary = {}
var refresh_accumulator: float = 0.0

func _ready() -> void:
	z_index = 20
	process_mode = Node.PROCESS_MODE_ALWAYS

func _get_main() -> Node:
	return get_tree().current_scene

func _refresh_from_core() -> void:
	var main := _get_main()
	if main == null:
		return
	var state_variant: Variant = main.get("latest_state")
	if not state_variant is Dictionary:
		return
	var state := state_variant as Dictionary
	if state.is_empty() or state == last_state:
		return
	last_state = state
	map_size = main.get("map_size") if main.get("map_size") is Vector2i else map_size

	var player_position := Vector2i(-1, -1)
	var entities_variant: Variant = state.get("entities", [])
	if entities_variant is Array:
		for entity_variant in entities_variant as Array:
			if not entity_variant is Dictionary:
				continue
			var entity := entity_variant as Dictionary
			if str(entity.get("id", "")) == PLAYER_ID:
				var position_variant: Variant = entity.get("position", {})
				if position_variant is Dictionary:
					var position := position_variant as Dictionary
					player_position = Vector2i(int(position.get("x", 0)), int(position.get("y", 0)))
				break

	# The Core presentation contains the authoritative currently visible set.
	# Exploration is intentionally accumulated here as presentation history;
	# hidden world information is never inferred from the camera.
	visible_tiles.clear()
	var presentation_variant: Variant = main.get("latest_state")
	var perception_variant: Variant = null
	var snapshot_variant: Variant = main.get("latest_snapshot_for_fog")
	if snapshot_variant is Dictionary:
		var snapshot := snapshot_variant as Dictionary
		var presentation := snapshot.get("presentation", {}) as Dictionary
		perception_variant = presentation.get("perception", {})
	if perception_variant is Dictionary:
		var perception := perception_variant as Dictionary
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

func _parse_key(value: String) -> Vector2i:
	var parts := value.split(",")
	if parts.size() != 2:
		return Vector2i(-1, -1)
	return Vector2i(int(parts[0]), int(parts[1]))

func _update_entity_visibility() -> void:
	var main := _get_main()
	if main == null:
		return
	var nodes_variant: Variant = main.get("entity_nodes")
	if not nodes_variant is Dictionary:
		return
	var nodes := nodes_variant as Dictionary
	for entity_id_variant in nodes.keys():
		var entity_id := str(entity_id_variant)
		var node := nodes[entity_id] as Node2D
		if not is_instance_valid(node):
			continue
		if entity_id == PLAYER_ID:
			node.visible = true
			continue
		var tile := Vector2i(floori(node.position.x / TILE_SIZE), floori(node.position.y / TILE_SIZE))
		node.visible = visible_tiles.has(tile)

func _process(delta: float) -> void:
	refresh_accumulator += delta
	if refresh_accumulator >= 0.10:
		refresh_accumulator = 0.0
		_refresh_from_core()

	var main := _get_main()
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
	var main := _get_main()
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
			draw_rect(rect, EXPLORED_COLOR if explored_tiles.has(tile) else UNKNOWN_COLOR)
