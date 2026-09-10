extends Node2D

## Godot client foundation.
## Rendering is local to Godot; game rules remain in the TypeScript Game Core.
## The adapter below establishes the first render-facing entity boundary.

const TILE_SIZE := 48.0
const MAP_SIZE := Vector2i(26, 16)

var blocked_tiles := {
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
	var adapter := GameEntityAdapter.new()
	add_child(adapter)

	# This snapshot mirrors the current TypeScript playerCharacter's render-relevant state:
	# id, name, type, position, HP and movement. No D&D rule is executed here.
	var player_snapshot := EntitySnapshot.from_dictionary({
		"id": "player-01",
		"name": "Kael",
		"type": "PLAYER",
		"x": 3,
		"y": 3,
		"hp": 30,
		"maxHp": 30,
		"movement": 6,
	})

	adapter.bind_entity($Player, player_snapshot)
	queue_redraw()

func _draw() -> void:
	# Background outside the prototype map.
	draw_rect(Rect2(Vector2.ZERO, Vector2(MAP_SIZE) * TILE_SIZE), Color("151515"))

	for y in range(MAP_SIZE.y):
		for x in range(MAP_SIZE.x):
			var tile := Vector2i(x, y)
			var rect := Rect2(Vector2(tile) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
			var walkable := not blocked_tiles.has(tile)

			# Intentionally restrained placeholder rendering.
			# Art direction/assets will be introduced after the technical foundation.
			var base_color := Color("292b2d") if walkable else Color("111214")
			draw_rect(rect, base_color)
			draw_rect(rect, Color("3b3d40"), false, 1.0)

			if not walkable:
				draw_line(rect.position + Vector2(8, 8), rect.end - Vector2(8, 8), Color("45474a"), 2.0)
				draw_line(Vector2(rect.end.x - 8, rect.position.y + 8), Vector2(rect.position.x + 8, rect.end.y - 8), Color("45474a"), 2.0)

	# Reference marker for the prototype map coordinate used during the foundation phase.
	var spawn_rect := Rect2(Vector2(13, 7) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
	draw_rect(spawn_rect, Color("d0a85c"), false, 2.0)
