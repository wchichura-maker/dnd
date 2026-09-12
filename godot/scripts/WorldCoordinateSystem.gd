extends RefCounted
class_name WorldCoordinateSystem

## Canonical world/grid conversion used by navigation UI.
## The authoritative gameplay coordinate is the Game Core grid position.

const TILE_SIZE: float = 48.0
const FEET_PER_CELL: int = 5

static func grid_to_world(grid: Vector2i) -> Vector2:
	return Vector2(grid) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)

static func world_to_grid(world_position: Vector2) -> Vector2i:
	return Vector2i(floori(world_position.x / TILE_SIZE), floori(world_position.y / TILE_SIZE))

static func grid_to_minimap(grid: Vector2i, player_grid: Vector2i, scale: float) -> Vector2:
	return Vector2(grid - player_grid) * scale

static func world_to_minimap(world_position: Vector2, player_world: Vector2, scale: float) -> Vector2:
	return (world_position - player_world) * scale

static func grid_to_feet(grid: Vector2i) -> Vector2i:
	return grid * FEET_PER_CELL
