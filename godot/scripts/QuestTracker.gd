extends Control
class_name QuestTracker

## Presentation-only quest tracker.
## The authoritative quest state lives in Game Core and arrives in snapshots.
## Position and size are owned by the Godot scene editor.

signal quest_screen_requested(quest_id: String)

enum TrackerState {
	COLLAPSED,
	EXPANDED,
	OPEN
}

@onready var collapsed_root: Control = $Collapsed
@onready var expanded_root: Control = $Expanded
@onready var open_root: Control = $Open
@onready var minimized_root: Control = $Minimized
@onready var collapsed_title: Button = $Collapsed/TitleButton
@onready var expanded_title: Button = $Expanded/TitleButton
@onready var open_title: Button = $Open/TitleButton
@onready var collapsed_content: VBoxContainer = $Collapsed/Scroll/Content
@onready var expanded_content: VBoxContainer = $Expanded/Scroll/Content
@onready var open_content: VBoxContainer = $Open/Scroll/Content
@onready var restore_button: Button = $Minimized/RestoreButton

var tracker_state: TrackerState = TrackerState.COLLAPSED
var latest_quests: Array = []
var tracked_quest_id := ""
var game_core: Node
var minimized_previous_state: TrackerState = TrackerState.COLLAPSED

func _ready() -> void:
	_set_state(tracker_state)
	_connect_game_core()
	collapsed_title.pressed.connect(_on_title_pressed)
	expanded_title.pressed.connect(_on_title_pressed)
	open_title.pressed.connect(_on_title_pressed)
	$Collapsed/ExpandButton.pressed.connect(_on_expand_pressed)
	$Expanded/ExpandButton.pressed.connect(_on_expand_pressed)
	$Open/CollapseButton.pressed.connect(_on_collapse_pressed)
	$Collapsed/MinimizeButton.pressed.connect(_on_minimize_pressed)
	$Expanded/MinimizeButton.pressed.connect(_on_minimize_pressed)
	$Open/MinimizeButton.pressed.connect(_on_minimize_pressed)
	restore_button.pressed.connect(_on_restore_pressed)
	_apply_cached_state()

func _process(_delta: float) -> void:
	if not is_instance_valid(game_core):
		_connect_game_core()

func _connect_game_core() -> void:
	if is_instance_valid(game_core):
		return
	var scene_root := get_tree().current_scene
	if scene_root == null:
		return
	var found := scene_root.find_child("GameCoreClient", true, false)
	if found == null or not found.has_signal("state_received"):
		return
	game_core = found
	if not game_core.state_received.is_connected(_on_state_received):
		game_core.state_received.connect(_on_state_received)
	_apply_cached_state()

func _apply_cached_state() -> void:
	if not is_instance_valid(game_core):
		return
	var cached_variant: Variant = game_core.get("latest_snapshot")
	if cached_variant is Dictionary and not (cached_variant as Dictionary).is_empty():
		_on_state_received(cached_variant as Dictionary)
	elif game_core.has_method("request_state"):
		game_core.request_state()

func _on_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary:
		return
	var state := state_variant as Dictionary
	var quest_state_variant: Variant = state.get("quests", {})
	if not quest_state_variant is Dictionary:
		return
	var quest_state := quest_state_variant as Dictionary
	var quests_variant: Variant = quest_state.get("quests", [])
	latest_quests = quests_variant as Array if quests_variant is Array else []
	tracked_quest_id = str(quest_state.get("trackedQuestId", ""))
	_refresh_view()

func _refresh_view() -> void:
	var ordered := _ordered_active_quests()
	var tracked := _tracked_quest(ordered)
	collapsed_title.text = str(tracked.get("title", "Nenhuma missão ativa")) if not tracked.is_empty() else "Nenhuma missão ativa"
	expanded_title.text = collapsed_title.text
	open_title.text = collapsed_title.text
	_populate_content(collapsed_content, [tracked] if not tracked.is_empty() else [], false)
	_populate_content(expanded_content, [tracked] if not tracked.is_empty() else [], true)
	_populate_content(open_content, ordered, true)

func _ordered_active_quests() -> Array:
	var active: Array = []
	for quest_variant in latest_quests:
		if not quest_variant is Dictionary:
			continue
		var quest := quest_variant as Dictionary
		if str(quest.get("status", "ACTIVE")) != "ACTIVE":
			continue
		active.append(quest)
	active.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			var a_tracked := str(a.get("id", "")) == tracked_quest_id
			var b_tracked := str(b.get("id", "")) == tracked_quest_id
			if a_tracked != b_tracked:
				return a_tracked
			var a_priority := int(a.get("priority", 0))
			var b_priority := int(b.get("priority", 0))
			if a_priority != b_priority:
				return a_priority > b_priority
			return str(a.get("id", "")) < str(b.get("id", ""))
		)
	return active

func _tracked_quest(ordered: Array) -> Dictionary:
	for quest_variant in ordered:
		if quest_variant is Dictionary and str((quest_variant as Dictionary).get("id", "")) == tracked_quest_id:
			return quest_variant as Dictionary
	return ordered[0] as Dictionary if not ordered.is_empty() and ordered[0] is Dictionary else {}

func _populate_content(container: VBoxContainer, quests: Array, detailed: bool) -> void:
	for child in container.get_children():
		child.queue_free()
	for quest_variant in quests:
		if not quest_variant is Dictionary:
			continue
		var quest := quest_variant as Dictionary
		var category := str(quest.get("category", "SIDE"))
		var header := Label.new()
		header.text = "%s  •  %s" % [str(quest.get("title", "—")), category]
		header.add_theme_color_override("font_color", Color("5a4028"))
		header.add_theme_font_size_override("font_size", 14)
		header.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		container.add_child(header)
		if not detailed:
			continue
		var objectives_variant: Variant = quest.get("objectives", [])
		if not objectives_variant is Array:
			continue
		for objective_variant in objectives_variant as Array:
			if not objective_variant is Dictionary:
				continue
			var objective := objective_variant as Dictionary
			if not bool(objective.get("visible", true)):
				continue
			var completed := bool(objective.get("completed", false))
			var current := int(objective.get("current", 0))
			var required := int(objective.get("required", 0))
			var line := Label.new()
			line.text = "%s  %s/%s" % ["✓" if completed else "•", str(objective.get("description", "—")), str(current) + "/" + str(required)]
			line.add_theme_color_override("font_color", Color("6a4b30") if not completed else Color("806b50"))
			line.add_theme_font_size_override("font_size", 11)
			line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			container.add_child(line)

func _set_state(next_state: TrackerState) -> void:
	tracker_state = next_state
	$Collapsed.visible = next_state == TrackerState.COLLAPSED
	$Expanded.visible = next_state == TrackerState.EXPANDED
	$Open.visible = next_state == TrackerState.OPEN
	minimized_root.visible = false

func _on_expand_pressed() -> void:
	if tracker_state == TrackerState.COLLAPSED:
		_set_state(TrackerState.EXPANDED)
	else:
		_set_state(TrackerState.OPEN)
	_refresh_view()

func _on_collapse_pressed() -> void:
	_set_state(TrackerState.EXPANDED)
	_refresh_view()

func _on_minimize_pressed() -> void:
	minimized_previous_state = tracker_state
	collapsed_root.visible = false
	expanded_root.visible = false
	open_root.visible = false
	minimized_root.visible = true

func _on_restore_pressed() -> void:
	minimized_root.visible = false
	_set_state(minimized_previous_state)
	_refresh_view()

func _on_title_pressed() -> void:
	var quest := _tracked_quest(_ordered_active_quests())
	var quest_id := str(quest.get("id", ""))
	if not quest_id.is_empty():
		quest_screen_requested.emit(quest_id)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and (event as InputEventKey).pressed and not (event as InputEventKey).echo:
		if (event as InputEventKey).keycode == KEY_Q:
			if minimized_root.visible:
				_on_restore_pressed()
			else:
				_on_expand_pressed()
