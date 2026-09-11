extends CanvasLayer
class_name PartyHUD

const PLAYER_ID := "player-01"

var portrait: PartyPortrait
var game_core: Node
var latest_state: Dictionary = {}
var selected_character_id: String = PLAYER_ID

func _ready() -> void:
	layer = 20
	portrait = $PartyPortrait
	portrait.character_selected.connect(_on_character_selected)
	portrait.set_selected(true)
	call_deferred("_connect_game_core")

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
	_apply_player_data()

func _apply_player_data() -> void:
	var player_entity: Dictionary = {}
	for entity_variant in latest_state.get("entities", []) as Array:
		if entity_variant is Dictionary and str((entity_variant as Dictionary).get("id", "")) == PLAYER_ID:
			player_entity = entity_variant as Dictionary
			break
	if player_entity.is_empty():
		return

	var dnd_variant: Variant = player_entity.get("dnd", {})
	var level := 1
	if dnd_variant is Dictionary:
		var class_data_variant: Variant = (dnd_variant as Dictionary).get("classData", {})
		if class_data_variant is Dictionary:
			level = int((class_data_variant as Dictionary).get("level", 1))

	var combat := latest_state.get("combat", {}) as Dictionary
	var turn_order := combat.get("turnOrder", []) as Array
	var current_index := int(combat.get("currentTurnIndex", 0))
	var active_id := str(turn_order[current_index]) if current_index >= 0 and current_index < turn_order.size() else ""

	var conditions_variant: Variant = player_entity.get("conditions", [])
	var conditions: Array = conditions_variant as Array if conditions_variant is Array else []

	portrait.apply_data({
		"characterId": PLAYER_ID,
		"level": level,
		"currentHP": float(player_entity.get("hp", 0)),
		"maxHP": float(player_entity.get("maxHp", 0)),
		"currentFood": float(player_entity.get("food", 0)),
		"maxFood": float(player_entity.get("maxFood", 0)),
		"selected": selected_character_id == PLAYER_ID,
		"active": active_id == PLAYER_ID,
		"conditions": conditions
	})

func _on_character_selected(character_id: String) -> void:
	selected_character_id = character_id
	portrait.set_selected(true)
