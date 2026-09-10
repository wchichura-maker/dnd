extends Node2D

## Godot client foundation.
## Rendering and input stay in Godot; rules and state authority stay in TypeScript Game Core.

const TILE_SIZE: float = 48.0
const PLAYER_ID: String = "player-01"

var map_size: Vector2i = Vector2i(26, 16)
var blocked_tiles: Dictionary[Vector2i, bool] = {}
var adapter: GameEntityAdapter
var player: PlayerController
var movement_controller: GridMovementController
var game_core: GameCoreClient
var entity_nodes: Dictionary[String, Node2D] = {}

func _ready() -> void:
	adapter = GameEntityAdapter.new()
	add_child(adapter)

	player = $Player as PlayerController
	movement_controller = $GridMovementController as GridMovementController

	game_core = GameCoreClient.new()
	add_child(game_core)

	movement_controller.configure(player, game_core)
	game_core.state_received.connect(_on_core_state_received)
	game_core.transport_error.connect(_on_transport_error)

	entity_nodes[PLAYER_ID] = player

	_set_debug_status("D&D Online — Godot Foundation\nGame Core: conectando...\nClique em uma casa para mover\nESC: sair")
	game_core.request_state()

func _on_core_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return

	var state: Dictionary = state_variant
	_apply_map_state(state)
	_apply_entity_state(state)

	_set_debug_status("D&D Online — Godot Foundation\nGame Core: conectado\nKael (player-01)\nClique em uma casa para mover\nESC: sair")
	queue_redraw()

func _apply_map_state(state: Dictionary) -> void:
	var map_variant: Variant = state.get("map", {})
	if not map_variant is Dictionary:
		return

	var map_data: Dictionary = map_variant
	map_size = Vector2i(
		int(map_data.get("width", 26)),
		int(map_data.get("height", 16))
	)

	blocked_tiles.clear()

	var tiles_variant: Variant = map_data.get("tiles", [])
	if not tiles_variant is Array:
		return

	var rows: Array = tiles_variant
	for y in range(rows.size()):
		var row_variant: Variant = rows[y]
		if not row_variant is Array:
			continue

		var row: Array = row_variant
		for x in range(row.size()):
			var tile_variant: Variant = row[x]
			if not tile_variant is Dictionary:
				continue

			var tile: Dictionary = tile_variant
			if not bool(tile.get("walkable", true)):
				blocked_tiles[Vector2i(x, y)] = true

func _apply_entity_state(state: Dictionary) -> void:
	var entities_variant: Variant = state.get("entities", [])
	if not entities_variant is Array:
		return

	var active_ids: Dictionary[String, bool] = {}

	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary:
			continue

		var entity: Dictionary = entity_variant
		var entity_id: String = str(entity.get("id", ""))
		if entity_id.is_empty():
			continue

		var entity_type: String = str(entity.get("type", "NPC"))
		var node: Node2D = _get_or_create_entity_node(entity_id, entity_type)
		if node == null:
			continue

		active_ids[entity_id] = true
		var snapshot: EntitySnapshot = _create_entity_snapshot(entity)

		if entity_id == PLAYER_ID:
			player.grid_position = snapshot.grid_position
			if not player.is_moving:
				player.position = _grid_to_world(snapshot.grid_position)
			var player_view: EntityView = player.get_node_or_null("EntityView") as EntityView
			if player_view == null:
				adapter.bind_entity(player, snapshot)
			else:
				player_view.apply_snapshot(snapshot)
		else:
			adapter.bind_entity(node, snapshot)

	_cleanup_removed_entities(active_ids)

func _create_entity_snapshot(entity: Dictionary) -> EntitySnapshot:
	var position_variant: Variant = entity.get("position", {})
	if not position_variant is Dictionary:
		return EntitySnapshot.from_dictionary(entity)

	var position: Dictionary = position_variant
	return EntitySnapshot.from_dictionary({
		"id": str(entity.get("id", "")),
		"name": str(entity.get("name", "")),
		"type": str(entity.get("type", "NPC")),
		"x": int(position.get("x", 0)),
		"y": int(position.get("y", 0)),
		"hp": int(entity.get("hp", 0)),
		"maxHp": int(entity.get("maxHp", 0)),
		"armorClass": int(entity.get("armorClass", 10)),
		"movement": int(entity.get("movement", 0)),
	})

func _get_or_create_entity_node(entity_id: String, entity_type: String) -> Node2D:
	if entity_nodes.has(entity_id):
		return entity_nodes[entity_id] as Node2D

	if entity_type == "PLAYER":
		return null

	var node: Node2D = Node2D.new()
	node.name = "Entity_%s" % entity_id
	add_child(node)
	entity_nodes[entity_id] = node
	return node

func _cleanup_removed_entities(active_ids: Dictionary[String, bool]) -> void:
	var ids_to_remove: Array[String] = []

	for entity_id in entity_nodes.keys():
		if entity_id == PLAYER_ID:
			continue
		if not active_ids.has(entity_id):
			ids_to_remove.append(entity_id)

	for entity_id in ids_to_remove:
		var node: Node2D = entity_nodes[entity_id] as Node2D
		if is_instance_valid(node):
			node.queue_free()
		entity_nodes.erase(entity_id)

func _grid_to_world(grid_position: Vector2i) -> Vector2:
	return Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)

func _on_transport_error(message: String) -> void:
	_set_debug_status("D&D Online — Godot Foundation\nGame Core: erro\n%s\nESC: sair" % message)
	push_error(message)

func _set_debug_status(text: String) -> void:
	var label: Label = $DebugOverlay/Label as Label
	label.text = text

func _draw() -> void:
	draw_rect(
		Rect2(Vector2.ZERO, Vector2(map_size) * TILE_SIZE),
		Color("151515")
	)

	for y in range(map_size.y):
		for x in range(map_size.x):
			var tile: Vector2i = Vector2i(x, y)
			var rect: Rect2 = Rect2(
				Vector2(tile) * TILE_SIZE,
				Vector2.ONE * TILE_SIZE
			)
			var walkable: bool = not blocked_tiles.has(tile)
			var base_color: Color = Color("292b2d") if walkable else Color("111214")
			draw_rect(rect, base_color)
			draw_rect(rect, Color("3b3d40"), false, 1.0)

			if not walkable:
				draw_line(
					rect.position + Vector2(8, 8),
					rect.end - Vector2(8, 8),
					Color("45474a"),
					2.0
				)
				draw_line(
					Vector2(rect.end.x - 8, rect.position.y + 8),
					Vector2(rect.position.x + 8, rect.end.y - 8),
					Color("45474a"),
					2.0
				)
