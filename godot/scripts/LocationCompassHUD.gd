extends CanvasLayer
class_name LocationCompassHUD

## Presentation-only location/navigation HUD.
## Reads authoritative snapshot data; it never advances time or changes world state.
## Position and size are intentionally owned by the Godot scene editor.
## Coordinate display follows the authoritative world grid.
## Clock display follows the authoritative world clock.

const PLAYER_ID := "player-01"
const WORLD_DAY_SECONDS := 24 * 60 * 60

@onready var location_label: Label = $Root/LocationLabel
@onready var minimap: MinimapRenderer = $Root/Minimap
@onready var coordinates_label: Label = $Root/CoordinatesLabel
@onready var time_label: Label = $Root/TimeLabel

var game_core: Node
var latest_state: Dictionary = {}
var last_player_grid := Vector2i(-999999, -999999)
var last_world_seconds := -1
var last_location := ""

func _ready() -> void:
	layer = 25
	call_deferred("_connect_game_core")

## Preferred binding path: PlayerController supplies the exact GameCoreClient instance.
## This avoids depending on scene-tree timing when the HUD is instantiated dynamically.
func configure(game_core_client: Node) -> void:
	if game_core_client == null or not game_core_client.has_signal("state_received"):
		return
	game_core = game_core_client
	if not game_core.state_received.is_connected(_on_state_received):
		game_core.state_received.connect(_on_state_received)
	_apply_cached_state()

func _connect_game_core() -> void:
	if is_instance_valid(game_core):
		_apply_cached_state()
		return

	var scene_root := get_tree().current_scene
	if scene_root == null:
		return

	var found := scene_root.find_child("GameCoreClient", true, false)
	if found == null or not found.has_signal("state_received"):
		return

	configure(found)
	if latest_state.is_empty() and found.has_method("request_state"):
		found.request_state()

func _apply_cached_state() -> void:
	if not is_instance_valid(game_core):
		return
	var cached_variant: Variant = game_core.get("latest_snapshot")
	if cached_variant is Dictionary and not (cached_variant as Dictionary).is_empty():
		_on_state_received(cached_variant as Dictionary)

func _on_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	latest_state = state_variant as Dictionary

	var player_grid := _player_grid(latest_state)
	var world_seconds := _world_seconds(latest_state)
	var location := LocationResolver.resolve(latest_state, player_grid)

	coordinates_label.text = _format_grid_coordinates(player_grid)
	time_label.text = _format_world_time(world_seconds)
	location_label.text = location if not location.is_empty() else "—"

	last_player_grid = player_grid
	last_world_seconds = world_seconds
	last_location = location

	minimap.apply_snapshot(snapshot)

func _player_grid(state: Dictionary) -> Vector2i:
	var entities_variant: Variant = state.get("entities", [])
	if not entities_variant is Array:
		return Vector2i.ZERO
	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) != PLAYER_ID:
			continue
		var position_variant: Variant = entity.get("position", {})
		if not position_variant is Dictionary:
			return Vector2i.ZERO
		var position := position_variant as Dictionary
		return Vector2i(int(position.get("x", 0)), int(position.get("y", 0)))
	return Vector2i.ZERO

func _format_grid_coordinates(grid: Vector2i) -> String:
	return "X: %d ; Y: %d" % [grid.x, grid.y]

func _world_seconds(state: Dictionary) -> int:
	var clock_variant: Variant = state.get("worldClock", {})
	if not clock_variant is Dictionary:
		return 0
	return maxi(0, int((clock_variant as Dictionary).get("totalSeconds", 0)))

func _format_world_time(total_seconds: int) -> String:
	var normalized: int = posmod(total_seconds, WORLD_DAY_SECONDS)
	var hour: int = floori(float(normalized) / 3600.0)
	var minute: int = floori(float(normalized % 3600) / 60.0)
	return "%02d:%02d" % [hour, minute]
