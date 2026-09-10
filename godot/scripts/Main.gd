extends Node2D

## Godot client foundation.
## Rendering and input stay in Godot; rules and state authority stay in TypeScript Game Core.

const TILE_SIZE: float = 48.0

var map_size: Vector2i = Vector2i(26, 16)
var blocked_tiles: Dictionary[Vector2i, bool] = {}
var adapter: GameEntityAdapter
var player: PlayerController
var movement_controller: GridMovementController
var game_core: GameCoreClient

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

	for y_variant in tiles_variant as Array:
		if not y_variant is Array:
			continue

		var row: Array = y_variant
		var y: int = blocked_tiles.size()
		if y >= map_size.y:
			break

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

	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary:
			continue

		var entity: Dictionary = entity_variant
		if str(entity.get("id", "")) != "player-01":
			continue

		var position_variant: Variant = entity.get("position", {})
		if not position_variant is Dictionary:
			return

		var position: Dictionary = position_variant
		var grid_position: Vector2i = Vector2i(
			int(position.get("x", 3)),
			int(position.get("y", 3))
		)

		player.grid_position = grid_position
		if not player.is_moving:
			player.position = Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)

		var snapshot: EntitySnapshot = EntitySnapshot.from_dictionary({
			"id": str(entity.get("id", "player-01")),
			"name": str(entity.get("name", "Kael")),
			"type": str(entity.get("type", "PLAYER")),
			"x": grid_position.x,
			"y": grid_position.y,
			"hp": int(entity.get("hp", 0)),
			"maxHp": int(entity.get("maxHp", 0)),
			"movement": int(entity.get("movement", 0)),
		})

		adapter.bind_entity(player, snapshot)
		return

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

	var spawn_rect: Rect2 = Rect2(
		Vector2(3, 3) * TILE_SIZE,
		Vector2.ONE * TILE_SIZE
	)
	draw_rect(spawn_rect, Color("d0a85c"), false, 2.0)
