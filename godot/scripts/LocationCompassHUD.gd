extends CanvasLayer
class_name LocationCompassHUD

## Presentation-only location/navigation HUD.
## Reads authoritative snapshot data; it never advances time or changes world state.

const PLAYER_ID := "player-01"
const SAFE_MARGIN := 18.0

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
	get_viewport().size_changed.connect(_layout)
	_layout()

func _connect_game_core() -> void:
	var scene_root := get_tree().current_scene
	if scene_root == null:
		return
	game_core = scene_root.get_node_or_null("GameCoreClient")
	if game_core == null or not game_core.has_signal("state_received"):
		return
	if not game_core.state_received.is_connected(_on_state_received):
		game_core.state_received.connect(_on_state_received)
	var cached_variant: Variant = game_core.get("latest_snapshot")
	if cached_variant is Dictionary and not (cached_variant as Dictionary).is_empty():
		_on_state_received(cached_variant as Dictionary)
	elif game_core.has_method("request_state"):
		game_core.request_state()

func _on_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	latest_state = state_variant as Dictionary
	var player_grid := _player_grid(latest_state)
	var world_seconds := _world_seconds(latest_state)
	var location := LocationResolver.resolve(latest_state, player_grid)

	if player_grid != last_player_grid:
		last_player_grid = player_grid
		coordinates_label.text = "X: %d ; Y: %d" % [player_grid.x, player_grid.y]

	if world_seconds != last_world_seconds:
		last_world_seconds = world_seconds
		time_label.text = _format_world_time(world_seconds)

	if location != last_location:
		last_location = location
		location_label.text = location if not location.is_empty() else "—"

	minimap.apply_snapshot(snapshot)

func _player_grid(state: Dictionary) -> Vector2i:
	for entity_variant in state.get("entities", []) as Array:
		if not entity_variant is Dictionary:
			continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) != PLAYER_ID:
			continue
		var position := entity.get("position", {}) as Dictionary
		return Vector2i(int(position.get("x", 0)), int(position.get("y", 0)))
	return Vector2i.ZERO

func _world_seconds(state: Dictionary) -> int:
	var clock_variant: Variant = state.get("worldClock", {})
	if not clock_variant is Dictionary:
		return 0
	return maxi(0, int((clock_variant as Dictionary).get("totalSeconds", 0)))

func _format_world_time(total_seconds: int) -> String:
	var seconds_in_day := 24 * 60 * 60
	var normalized := posmod(total_seconds, seconds_in_day)
	var hour := normalized / 3600
	var minute := (normalized % 3600) / 60
	return "%02d:%02d" % [hour, minute]

func _layout() -> void:
	var viewport_size := get_viewport_rect().size
	var root := $Root as Control
	var width := 190.0
	var minimap_size := 160.0
	root.position = Vector2(viewport_size.x - width - SAFE_MARGIN, SAFE_MARGIN)
	root.size = Vector2(width, 214.0)
	$Root/LocationLabel.position = Vector2.ZERO
	$Root/LocationLabel.size = Vector2(width, 20.0)
	$Root/Minimap.position = Vector2((width - minimap_size) * 0.5, 22.0)
	$Root/Minimap.size = Vector2.ONE * minimap_size
	$Root/Frame.position = $Root/Minimap.position
	$Root/Frame.size = $Root/Minimap.size
	$Root/CoordinatesLabel.position = Vector2(0, 184)
	$Root/CoordinatesLabel.size = Vector2(width, 14.0)
	$Root/TimeLabel.position = Vector2(0, 199)
	$Root/TimeLabel.size = Vector2(width, 14.0)
