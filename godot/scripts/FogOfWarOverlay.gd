extends Control

const TILE_SIZE: float = 48.0
const PLAYER_ID := "player-01"
const VISION_RANGE: float = 12.0
const EDGE_FADE_WIDTH: float = 2.5
const UNKNOWN_MAX_ALPHA: float = 0.92
const EXPLORED_ALPHA: float = 0.52
const BLOCKED_ALPHA: float = 0.88
const UNKNOWN_COLOR := Color(0.035, 0.029, 0.024, 1.0)
const EXPLORED_COLOR := Color(0.08, 0.065, 0.052, 1.0)

var explored_tiles: Dictionary[Vector2i, bool] = {}
var visible_tiles: Dictionary[Vector2i, bool] = {}
var map_size: Vector2i = Vector2i(120, 80)
var client_connected := false
var last_camera_center: Vector2 = Vector2.INF
var player_tile: Vector2i = Vector2i.ZERO

func _ready() -> void:
	z_index = 100
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(true)
	_try_connect_client()
	queue_redraw()

func _try_connect_client() -> void:
	if client_connected:
		return
	var main := get_tree().current_scene
	if main == null:
		return
	var client := main.get_node_or_null("GameCoreClient") as GameCoreClient
	if client == null:
		return
	client.state_received.connect(_on_snapshot)
	client_connected = true
	var snapshot_variant: Variant = client.get("latest_snapshot")
	if snapshot_variant is Dictionary and not (snapshot_variant as Dictionary).is_empty():
		_on_snapshot(snapshot_variant as Dictionary)

func _on_snapshot(snapshot: Dictionary) -> void:
	var main := get_tree().current_scene
	if main != null:
		var size_variant: Variant = main.get("map_size")
		if size_variant is Vector2i:
			map_size = size_variant
		var player_variant: Variant = main.get("player")
		if player_variant is PlayerController:
			player_tile = (player_variant as PlayerController).grid_position

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

func _parse_key(value: String) -> Vector2i:
	var parts := value.split(",")
	if parts.size() != 2:
		return Vector2i(-1, -1)
	return Vector2i(int(parts[0]), int(parts[1]))

func _update_entity_visibility() -> void:
	var main := get_tree().current_scene
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

func _process(_delta: float) -> void:
	_try_connect_client()
	var main := get_tree().current_scene
	if main == null:
		return
	var player_variant: Variant = main.get("player")
	if player_variant is PlayerController:
		var next_tile := (player_variant as PlayerController).grid_position
		if next_tile != player_tile:
			player_tile = next_tile
			queue_redraw()
	var camera := main.get_node_or_null("Player/Camera2D") as Camera2D
	if camera == null:
		return
	var center := camera.get_screen_center_position()
	if last_camera_center == Vector2.INF or center.distance_squared_to(last_camera_center) > 0.01:
		last_camera_center = center
		queue_redraw()

func _tile_alpha(tile: Vector2i) -> float:
	if visible_tiles.has(tile):
		return 0.0

	var delta := Vector2(tile - player_tile)
	var distance := delta.length()
	if distance <= VISION_RANGE:
		# Non-visible cells inside the vision radius are primarily occluded by
		# walls/obstacles. Keep them strongly covered instead of revealing them.
		var edge := smoothstep(VISION_RANGE - EDGE_FADE_WIDTH, VISION_RANGE, distance)
		return lerpf(0.04, BLOCKED_ALPHA, edge)

	if explored_tiles.has(tile):
		return EXPLORED_ALPHA

	return UNKNOWN_MAX_ALPHA

func _draw() -> void:
	var main := get_tree().current_scene
	if main == null:
		return
	var camera := main.get_node_or_null("Player/Camera2D") as Camera2D
	if camera == null:
		return

	var viewport_pixels := get_viewport_rect().size
	var viewport_world := viewport_pixels / camera.zoom
	var screen_center := camera.get_screen_center_position()
	var half_view := viewport_world * 0.5
	var visible_rect := Rect2(screen_center - half_view, viewport_world)
	var min_x := maxi(0, floori(visible_rect.position.x / TILE_SIZE) - 1)
	var min_y := maxi(0, floori(visible_rect.position.y / TILE_SIZE) - 1)
	var max_x := mini(map_size.x - 1, ceili(visible_rect.end.x / TILE_SIZE) + 1)
	var max_y := mini(map_size.y - 1, ceili(visible_rect.end.y / TILE_SIZE) + 1)

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			var tile := Vector2i(x, y)
			var alpha := _tile_alpha(tile)
			if alpha <= 0.001:
				continue
			var world_position := Vector2(tile) * TILE_SIZE
			var screen_position := (world_position - screen_center) * camera.zoom + viewport_pixels * 0.5
			var screen_tile_size := Vector2.ONE * TILE_SIZE * camera.zoom
			var rect := Rect2(screen_position, screen_tile_size)
			var color := EXPLORED_COLOR if explored_tiles.has(tile) else UNKNOWN_COLOR
			color.a = alpha
			draw_rect(rect, color)
