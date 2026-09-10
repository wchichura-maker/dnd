extends Node2D
class_name GridMovementController

## Client-side movement preview.
## It mirrors the current TypeScript pathfinding rules until a runtime transport
## can invoke the authoritative Game Core directly from the Godot client.

const TILE_SIZE: float = 48.0
const MAP_SIZE: Vector2i = Vector2i(26, 16)
const MAX_MOVEMENT: int = 6
const STEP_DURATION: float = 0.14

var blocked_tiles: Dictionary[Vector2i, bool] = {}
var player: PlayerController
var selected_tile: Vector2i = Vector2i(-1, -1)
var current_path: Array[Vector2i] = []
var reachable_tiles: Array[Vector2i] = []

func configure(player_node: PlayerController, blocked: Dictionary[Vector2i, bool]) -> void:
	player = player_node
	blocked_tiles = blocked.duplicate()
	reachable_tiles = get_reachable_positions(player.grid_position, MAX_MOVEMENT)
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			select_destination(get_global_mouse_position())
			return

	if event is InputEventKey:
		var key_event: InputEventKey = event
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ESCAPE:
			get_tree().quit()

func select_destination(world_position: Vector2) -> void:
	if player.is_moving:
		return

	var destination: Vector2i = world_to_grid(world_position)
	selected_tile = destination
	current_path = find_path(player.grid_position, destination, MAX_MOVEMENT)

	if current_path.is_empty() and destination != player.grid_position:
		queue_redraw()
		return

	player.move_along_path(current_path, STEP_DURATION)
	queue_redraw()

func world_to_grid(world_position: Vector2) -> Vector2i:
	return Vector2i(floori(world_position.x / TILE_SIZE), floori(world_position.y / TILE_SIZE))

func grid_to_world(grid_position: Vector2i) -> Vector2:
	return Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)

func is_walkable(position: Vector2i) -> bool:
	if position.x < 0 or position.x >= MAP_SIZE.x:
		return false
	if position.y < 0 or position.y >= MAP_SIZE.y:
		return false
	return not blocked_tiles.has(position)

func is_diagonal(from: Vector2i, to: Vector2i) -> bool:
	return absi(to.x - from.x) == 1 and absi(to.y - from.y) == 1

func diagonal_step_allowed(from: Vector2i, to: Vector2i) -> bool:
	if not is_diagonal(from, to):
		return true

	var horizontal: Vector2i = Vector2i(to.x, from.y)
	var vertical: Vector2i = Vector2i(from.x, to.y)
	return is_walkable(horizontal) and is_walkable(vertical)

func neighbors(position: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(position.x - 1, position.y),
		Vector2i(position.x + 1, position.y),
		Vector2i(position.x, position.y - 1),
		Vector2i(position.x, position.y + 1),
		Vector2i(position.x - 1, position.y - 1),
		Vector2i(position.x + 1, position.y - 1),
		Vector2i(position.x - 1, position.y + 1),
		Vector2i(position.x + 1, position.y + 1)
	]

func state_key(position: Vector2i, diagonal_parity: int) -> String:
	return "%d,%d,%d" % [position.x, position.y, diagonal_parity]

func find_path(start: Vector2i, destination: Vector2i, max_cost: int) -> Array[Vector2i]:
	var empty_path: Array[Vector2i] = []

	if not is_walkable(start) or not is_walkable(destination):
		return empty_path
	if start == destination:
		return empty_path

	var open_positions: Array[Vector2i] = [start]
	var open_costs: Array[int] = [0]
	var open_diagonals: Array[int] = [0]
	var distances: Dictionary[String, int] = {}
	var previous: Dictionary[String, String] = {}

	distances[state_key(start, 0)] = 0

	while not open_positions.is_empty():
		var best_index: int = 0
		for index in range(1, open_positions.size()):
			if open_costs[index] < open_costs[best_index]:
				best_index = index

		var current: Vector2i = open_positions[best_index]
		var current_cost: int = open_costs[best_index]
		var current_diagonals: int = open_diagonals[best_index]
		open_positions.remove_at(best_index)
		open_costs.remove_at(best_index)
		open_diagonals.remove_at(best_index)

		if current == destination:
			return reconstruct_path(start, current, current_diagonals, previous)

		for neighbor in neighbors(current):
			if not is_walkable(neighbor) or not diagonal_step_allowed(current, neighbor):
				continue

			var step_cost: int = 1
			var next_diagonals: int = current_diagonals
			if is_diagonal(current, neighbor):
				step_cost = 1 if current_diagonals % 2 == 0 else 2
				next_diagonals += 1

			var next_cost: int = current_cost + step_cost
			if next_cost > max_cost:
				continue

			var next_key: String = state_key(neighbor, next_diagonals % 2)
			if distances.has(next_key) and int(distances[next_key]) <= next_cost:
				continue

			distances[next_key] = next_cost
			previous[next_key] = state_key(current, current_diagonals % 2)
			open_positions.append(neighbor)
			open_costs.append(next_cost)
			open_diagonals.append(next_diagonals)

	return empty_path

func reconstruct_path(start: Vector2i, destination: Vector2i, diagonal_count: int, previous: Dictionary[String, String]) -> Array[Vector2i]:
	var path: Array[Vector2i] = []
	var current: Vector2i = destination
	var current_key: String = state_key(current, diagonal_count % 2)

	while current != start:
		path.push_front(current)
		if not previous.has(current_key):
			return []
		current_key = previous[current_key]
		var parts: PackedStringArray = current_key.split(",")
		if parts.size() != 3:
			return []
		current = Vector2i(int(parts[0]), int(parts[1]))

	return path

func get_reachable_positions(start: Vector2i, max_cost: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	if not is_walkable(start):
		return result

	var open_positions: Array[Vector2i] = [start]
	var open_costs: Array[int] = [0]
	var open_diagonals: Array[int] = [0]
	var distances: Dictionary[String, int] = {}
	var seen_positions: Dictionary[String, bool] = {}
	distances[state_key(start, 0)] = 0

	while not open_positions.is_empty():
		var best_index: int = 0
		for index in range(1, open_positions.size()):
			if open_costs[index] < open_costs[best_index]:
				best_index = index

		var current: Vector2i = open_positions[best_index]
		var current_cost: int = open_costs[best_index]
		var current_diagonals: int = open_diagonals[best_index]
		open_positions.remove_at(best_index)
		open_costs.remove_at(best_index)
		open_diagonals.remove_at(best_index)

		if current != start:
			var position_key: String = "%d,%d" % [current.x, current.y]
			if not seen_positions.has(position_key):
				seen_positions[position_key] = true
				result.append(current)

		for neighbor in neighbors(current):
			if not is_walkable(neighbor) or not diagonal_step_allowed(current, neighbor):
				continue

			var step_cost: int = 1
			var next_diagonals: int = current_diagonals
			if is_diagonal(current, neighbor):
				step_cost = 1 if current_diagonals % 2 == 0 else 2
				next_diagonals += 1

			var next_cost: int = current_cost + step_cost
			if next_cost > max_cost:
				continue

			var next_key: String = state_key(neighbor, next_diagonals % 2)
			if distances.has(next_key) and int(distances[next_key]) <= next_cost:
				continue

			distances[next_key] = next_cost
			open_positions.append(neighbor)
			open_costs.append(next_cost)
			open_diagonals.append(next_diagonals)

	return result

func _draw() -> void:
	for tile in reachable_tiles:
		var rect: Rect2 = Rect2(Vector2(tile) * TILE_SIZE + Vector2(3.0, 3.0), Vector2.ONE * (TILE_SIZE - 6.0))
		draw_rect(rect, Color("d0a85c", 0.16), true)

	for tile in current_path:
		var rect: Rect2 = Rect2(Vector2(tile) * TILE_SIZE + Vector2(8.0, 8.0), Vector2.ONE * (TILE_SIZE - 16.0))
		draw_rect(rect, Color("d0a85c", 0.30), true)

	if selected_tile.x >= 0 and selected_tile.y >= 0:
		var selected_rect: Rect2 = Rect2(Vector2(selected_tile) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
		draw_rect(selected_rect, Color("d0a85c"), false, 2.0)
