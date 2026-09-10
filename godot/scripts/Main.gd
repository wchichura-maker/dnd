extends Node2D

## Godot client foundation.
## Rendering is local to Godot; game rules remain in the TypeScript Game Core.
## The movement controller currently previews the same grid/path rules locally.

const TILE_SIZE: float = 48.0
const MAP_SIZE: Vector2i = Vector2i(26, 16)

var blocked_tiles: Dictionary[Vector2i, bool] = {
	Vector2i(8, 5): true,
	Vector2i(9, 5): true,
	Vector2i(10, 5): true,
	Vector2i(8, 6): true,
	Vector2i(10, 6): true,
	Vector2i(8, 7): true,
	Vector2i(9, 7): true,
	Vector2i(10, 7): true,
	Vector2i(17, 9): true,
	Vector2i(18, 9): true,
	Vector2i(19, 9): true,
	Vector2i(17, 10): true,
	Vector2i(19, 10): true,
	Vector2i(17, 11): true,
	Vector2i(18, 11): true,
	Vector2i(19, 11): true,
}

func _ready() -> void:
	var adapter: GameEntityAdapter = GameEntityAdapter.new()
	add_child(adapter)

	var player_snapshot: EntitySnapshot = EntitySnapshot.from_dictionary({
		"id": "player-01",
		"name": "Kael",
		"type": "PLAYER",
		"x": 3,
		"y": 3,
		"hp": 30,
		"maxHp": 30,
		"movement": 6,
	})

	var player: PlayerController = $Player as PlayerController
	adapter.bind_entity(player, player_snapshot)

	var movement_controller: GridMovementController = $GridMovementController as GridMovementController
	movement_controller.configure(player, blocked_tiles)

	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(MAP_SIZE) * TILE_SIZE), Color("151515"))

	for y in range(MAP_SIZE.y):
		for x in range(MAP_SIZE.x):
			var tile: Vector2i = Vector2i(x, y)
			var rect: Rect2 = Rect2(Vector2(tile) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
			var walkable: bool = not blocked_tiles.has(tile)
			var base_color: Color = Color("292b2d") if walkable else Color("111214")
			draw_rect(rect, base_color)
			draw_rect(rect, Color("3b3d40"), false, 1.0)

			if not walkable:
				draw_line(rect.position + Vector2(8, 8), rect.end - Vector2(8, 8), Color("45474a"), 2.0)
				draw_line(Vector2(rect.end.x - 8, rect.position.y + 8), Vector2(rect.position.x + 8, rect.end.y - 8), Color("45474a"), 2.0)

	var spawn_rect: Rect2 = Rect2(Vector2(3, 3) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
	draw_rect(spawn_rect, Color("d0a85c"), false, 2.0)
