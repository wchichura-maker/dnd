extends Node2D

const TILE_SIZE: float = 48.0
const PLAYER_ID: String = "player-01"
var map_size: Vector2i = Vector2i(120, 80)
var blocked_tiles: Dictionary[Vector2i, bool] = {}
var adapter: GameEntityAdapter
var player: PlayerController
var movement_controller: GridMovementController
var game_core: GameCoreClient
var entity_nodes: Dictionary[String, Node2D] = {}
var selected_target_id: String = ""
var latest_state: Dictionary = {}
var latest_action_log: Array = []
var death_screen_shown: bool = false
var initiative_panel: PanelContainer
var initiative_label: Label
var last_draw_camera_center: Vector2 = Vector2.INF

const PAPER_LIGHT := Color("e1d5b8")
const PAPER_BURNED := Color("d6c9a8")
const PAPER_SHADOW := Color("b5a383")
const WOOD_DARK := Color("30261e")
const GOLD := Color("b08a4d")
const SUCCESS := Color("65704d")
const FAILURE := Color("93483d")
const MAGIC := Color("526878")

func _ready() -> void:
	adapter = GameEntityAdapter.new()
	add_child(adapter)
	player = $Player as PlayerController
	movement_controller = $GridMovementController as GridMovementController
	game_core = GameCoreClient.new()
	add_child(game_core)
	movement_controller.configure(player, game_core)
	game_core.state_received.connect(_on_core_state_received)
	game_core.action_resolved.connect(_on_action_resolved)
	game_core.transport_error.connect(_on_transport_error)
	get_viewport().size_changed.connect(_layout_hud)
	entity_nodes[PLAYER_ID] = player
	$CombatHUD/Panel/Margin/VBox/Attack.pressed.connect(_on_attack)
	$CombatHUD/Panel/Margin/VBox/CoupDeGrace.pressed.connect(_on_coup_de_grace)
	$CombatHUD/Panel/Margin/VBox/EndTurn.pressed.connect(_on_end_turn)
	$DeathOverlay/Center/VBox/Spectator.pressed.connect(_on_spectator)
	$DeathOverlay/Center/VBox/NewCharacter.pressed.connect(_on_new_character)
	_setup_initiative_panel()
	_setup_hotbar()
	_layout_hud()
	$DeathOverlay.visible = false
	_set_debug_status("Game Core: conectando...")
	game_core.request_state()

func _process(_delta: float) -> void:
	var camera := $Player/Camera2D as Camera2D
	if camera == null:
		return
	var center := camera.get_screen_center_position()
	if last_draw_camera_center == Vector2.INF or center.distance_squared_to(last_draw_camera_center) > 0.01:
		last_draw_camera_center = center
		queue_redraw()

func _setup_initiative_panel() -> void:
	initiative_panel = PanelContainer.new()
	initiative_panel.name = "InitiativePanel"
	initiative_panel.position = Vector2(450, 18)
	initiative_panel.size = Vector2(560, 54)
	initiative_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color(WOOD_DARK, 0.72)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color(GOLD, 0.45)
	initiative_panel.add_theme_stylebox_override("panel", style)
	$CombatHUD.add_child(initiative_panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_top", 7)
	margin.add_theme_constant_override("margin_bottom", 7)
	initiative_panel.add_child(margin)
	initiative_label = Label.new()
	initiative_label.add_theme_color_override("font_color", PAPER_LIGHT)
	initiative_label.add_theme_font_size_override("font_size", 12)
	initiative_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	initiative_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	initiative_label.text = "INICIATIVA  •  —"
	margin.add_child(initiative_label)

func _layout_hud() -> void:
	var viewport_size := get_viewport_rect().size
	var bottom := viewport_size.y - 10.0
	var action_log := $CombatHUD/ActionLogPanel as Control
	var hotbar := $CombatHUD/Hotbar as Control
	var menu := $CombatHUD/MenuPanel as Control
	var bottom_height := 170.0
	var hotbar_width := 560.0
	var menu_width := 222.0
	action_log.position = Vector2(18.0, bottom - bottom_height)
	action_log.size = Vector2(412.0, bottom_height)
	hotbar.position = Vector2(maxf(18.0, (viewport_size.x - hotbar_width) * 0.5), bottom - 64.0)
	hotbar.size = Vector2(minf(hotbar_width, maxf(360.0, viewport_size.x - 36.0)), 64.0)
	menu.position = Vector2(maxf(18.0, viewport_size.x - menu_width - 18.0), bottom - bottom_height)
	menu.size = Vector2(minf(menu_width, maxf(190.0, viewport_size.x - 36.0)), bottom_height)
	if initiative_panel != null:
		initiative_panel.position = Vector2(maxf(18.0, (viewport_size.x - 560.0) * 0.5), 18.0)
		initiative_panel.size = Vector2(minf(560.0, maxf(360.0, viewport_size.x - 36.0)), 54.0)

func _setup_hotbar() -> void:
	var slots := $CombatHUD/Hotbar/Margin/Slots
	for child in slots.get_children():
		if child is Button:
			(child as Button).focus_mode = Control.FOCUS_NONE

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and (event as InputEventKey).pressed and not (event as InputEventKey).echo:
		var key := (event as InputEventKey).keycode
		match key:
			KEY_1: _on_attack()
			KEY_2: _on_coup_de_grace()
			KEY_0: _on_end_turn()
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_RIGHT and mouse_event.pressed:
			_select_target_at(get_global_mouse_position())
			get_viewport().set_input_as_handled()

func _on_core_state_received(snapshot: Dictionary) -> void:
	var state_variant: Variant = snapshot.get("state", {})
	if not state_variant is Dictionary: return
	var state := state_variant as Dictionary
	latest_state = state
	var action_log_variant: Variant = snapshot.get("actionLog", [])
	latest_action_log = action_log_variant as Array if action_log_variant is Array else []
	_apply_map_state(state)
	_apply_entity_state(state)
	_update_combat_hud(state, snapshot)
	_update_death_screen(state)
	queue_redraw()

func _apply_map_state(state: Dictionary) -> void:
	var map_variant: Variant = state.get("map", {})
	if not map_variant is Dictionary: return
	var map_data := map_variant as Dictionary
	map_size = Vector2i(int(map_data.get("width", 120)), int(map_data.get("height", 80)))
	blocked_tiles.clear()
	var tiles_variant: Variant = map_data.get("tiles", [])
	if not tiles_variant is Array: return
	for y in range((tiles_variant as Array).size()):
		var row_variant: Variant = (tiles_variant as Array)[y]
		if not row_variant is Array: continue
		for x in range((row_variant as Array).size()):
			var tile_variant: Variant = (row_variant as Array)[x]
			if tile_variant is Dictionary and not bool((tile_variant as Dictionary).get("walkable", true)):
				blocked_tiles[Vector2i(x, y)] = true

func _apply_entity_state(state: Dictionary) -> void:
	var entities_variant: Variant = state.get("entities", [])
	if not entities_variant is Array: return
	var active_ids: Dictionary[String, bool] = {}
	for entity_variant in entities_variant as Array:
		if not entity_variant is Dictionary: continue
		var entity := entity_variant as Dictionary
		var entity_id := str(entity.get("id", ""))
		if entity_id.is_empty(): continue
		var node := _get_or_create_entity_node(entity_id, str(entity.get("type", "NPC")))
		if node == null: continue
		active_ids[entity_id] = true
		var snapshot := _create_entity_snapshot(entity)
		if entity_id == PLAYER_ID:
			player.grid_position = snapshot.grid_position
			if not player.is_moving: player.position = _grid_to_world(snapshot.grid_position)
			var player_view := player.get_node_or_null("EntityView") as EntityView
			if player_view: player_view.apply_snapshot(snapshot)
			else: adapter.bind_entity(player, snapshot)
		else:
			node.position = _grid_to_world(snapshot.grid_position)
			var view := adapter.bind_entity(node, snapshot)
			view.selected = entity_id == selected_target_id
	_cleanup_removed_entities(active_ids)

func _create_entity_snapshot(entity: Dictionary) -> EntitySnapshot:
	var position: Dictionary = entity.get("position", {}) as Dictionary
	return EntitySnapshot.from_dictionary({"id": str(entity.get("id", "")), "name": str(entity.get("name", "")), "type": str(entity.get("type", "NPC")), "x": int(position.get("x", 0)), "y": int(position.get("y", 0)), "hp": int(entity.get("hp", 0)), "maxHp": int(entity.get("maxHp", 0)), "armorClass": int(entity.get("armorClass", 10)), "movement": int(entity.get("movement", 0))})

func _get_or_create_entity_node(entity_id: String, entity_type: String) -> Node2D:
	if entity_nodes.has(entity_id): return entity_nodes[entity_id] as Node2D
	if entity_type == "PLAYER": return null
	var node := Node2D.new()
	node.name = "Entity_%s" % entity_id
	add_child(node)
	entity_nodes[entity_id] = node
	return node

func _cleanup_removed_entities(active_ids: Dictionary[String, bool]) -> void:
	for entity_id in entity_nodes.keys():
		if entity_id == PLAYER_ID or active_ids.has(entity_id): continue
		var node := entity_nodes[entity_id] as Node2D
		if is_instance_valid(node): node.queue_free()
		entity_nodes.erase(entity_id)

func _select_target_at(world_position: Vector2) -> bool:
	var clicked_tile := Vector2i(floori(world_position.x / TILE_SIZE), floori(world_position.y / TILE_SIZE))
	var found_id := ""
	for entity_id in entity_nodes.keys():
		if entity_id == PLAYER_ID: continue
		var node := entity_nodes[entity_id] as Node2D
		if not is_instance_valid(node): continue
		var view := node.get_node_or_null("EntityView") as EntityView
		if view and Vector2i(floori(node.position.x / TILE_SIZE), floori(node.position.y / TILE_SIZE)) == clicked_tile:
			found_id = entity_id
			break
	selected_target_id = found_id
	for entity_id in entity_nodes.keys():
		if entity_id == PLAYER_ID: continue
		var node := entity_nodes[entity_id] as Node2D
		var view := node.get_node_or_null("EntityView") as EntityView
		if view: view.selected = entity_id == selected_target_id
	_update_target_label()
	_update_attack_button()
	_update_coup_de_grace_button()
	return not selected_target_id.is_empty()

func _update_target_label() -> void:
	var label: Label = $CombatHUD/Panel/Margin/VBox/Target
	if selected_target_id.is_empty(): label.text = "Alvo: nenhum"; return
	var node := entity_nodes.get(selected_target_id) as Node2D
	var view := node.get_node_or_null("EntityView") as EntityView if is_instance_valid(node) else null
	label.text = "Alvo: %s" % (view.entity_name if view else selected_target_id)

func _on_attack() -> void:
	if selected_target_id.is_empty(): return
	game_core.request_action({"type": "ATTACK", "actorId": PLAYER_ID, "targetId": selected_target_id})
func _on_coup_de_grace() -> void:
	if selected_target_id.is_empty() or not _is_selected_target_helpless(): return
	game_core.request_action({"type": "COUP_DE_GRACE", "actorId": PLAYER_ID, "targetId": selected_target_id})
func _on_end_turn() -> void: game_core.end_turn()

func _on_action_resolved(action_result: Dictionary, _snapshot: Dictionary) -> void:
	var message := str(action_result.get("message", ""))
	if not message.is_empty(): _set_debug_status("Game Core: %s" % message)

func _update_combat_hud(state: Dictionary, snapshot: Dictionary) -> void:
	var mode := str(state.get("mode", "EXPLORATION"))
	var combat := state.get("combat", {}) as Dictionary
	var turn_order := combat.get("turnOrder", []) as Array
	var current_index := int(combat.get("currentTurnIndex", 0))
	var active_id := str(turn_order[current_index]) if current_index >= 0 and current_index < turn_order.size() else ""
	var active_name := active_id
	var player_entity: Dictionary = {}
	for entity_variant in state.get("entities", []) as Array:
		if not entity_variant is Dictionary: continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) == active_id: active_name = str(entity.get("name", active_id))
		if str(entity.get("id", "")) == PLAYER_ID: player_entity = entity
	var presentation := snapshot.get("presentation", {}) as Dictionary
	var movement_budget := int(presentation.get("movementBudget", 0))
	var hp := int(player_entity.get("hp", 0))
	var max_hp := int(player_entity.get("maxHp", 0))
	$CombatHUD/Panel/Margin/VBox/Header.text = "COMBATE" if mode == "COMBAT" else ("ENCONTRO" if mode == "ENCOUNTER" else "EXPLORAÇÃO")
	$CombatHUD/Panel/Margin/VBox/Status.text = "Turno: %s\nKael  HP %d/%d  Movimento %d" % [active_name if not active_name.is_empty() else "—", hp, max_hp, movement_budget]
	$CombatHUD/Panel/Margin/VBox/EndTurn.disabled = mode == "EXPLORATION" or active_id != PLAYER_ID
	_update_attack_button()
	_update_coup_de_grace_button()
	_update_target_label()
	_update_party_panel(state, active_id)
	_update_initiative_panel(combat, state, mode)
	_update_hotbar(mode, active_id)
	_update_action_log()

func _update_party_panel(state: Dictionary, active_id: String) -> void:
	var label: Label = $CombatHUD/PartyPanel/Margin/Label
	var lines: Array[String] = ["GRUPO"]
	for entity_variant in state.get("entities", []) as Array:
		if not entity_variant is Dictionary: continue
		var entity := entity_variant as Dictionary
		if str(entity.get("type", "NPC")) != "PLAYER": continue
		var entity_id := str(entity.get("id", ""))
		var name := str(entity.get("name", entity_id))
		var hp := int(entity.get("hp", 0))
		var max_hp := int(entity.get("maxHp", 0))
		var marker := "ATIVO" if entity_id == active_id else ""
		lines.append("%s   %d/%d   %s" % [name, hp, max_hp, marker])
	if lines.size() == 1: lines.append("Nenhum membro visível.")
	label.text = "\n".join(lines)

func _update_initiative_panel(combat: Dictionary, state: Dictionary, mode: String) -> void:
	if initiative_panel == null: return
	initiative_panel.visible = mode == "INITIATIVE" or mode == "COMBAT"
	if not initiative_panel.visible: return
	var order := combat.get("turnOrder", []) as Array
	var current_index := int(combat.get("currentTurnIndex", 0))
	var parts: Array[String] = []
	for index in range(order.size()):
		var id := str(order[index])
		var name := id
		for entity_variant in state.get("entities", []) as Array:
			if entity_variant is Dictionary and str((entity_variant as Dictionary).get("id", "")) == id:
				name = str((entity_variant as Dictionary).get("name", id))
				break
		parts.append(("> " if index == current_index else "") + name)
	initiative_label.text = "INICIATIVA  •  " + "  |  ".join(parts)

func _update_hotbar(mode: String, active_id: String) -> void:
	var slots := $CombatHUD/Hotbar/Margin/Slots
	var can_act := mode == "COMBAT" and active_id == PLAYER_ID
	var attack_slot: Button = slots.get_node("Slot1")
	var coup_slot: Button = slots.get_node("Slot2")
	var end_slot: Button = slots.get_node("Slot10")
	attack_slot.text = "1\nATAQUE"
	coup_slot.text = "2\nCOUP"
	end_slot.text = "0\nFIM"
	attack_slot.disabled = not can_act or selected_target_id.is_empty()
	coup_slot.disabled = not can_act or not _is_selected_target_helpless()
	end_slot.disabled = not can_act

func _update_attack_button() -> void:
	var combat := latest_state.get("combat", {}) as Dictionary
	var turn_order := combat.get("turnOrder", []) as Array
	var current_index := int(combat.get("currentTurnIndex", 0))
	var active_id := str(turn_order[current_index]) if current_index >= 0 and current_index < turn_order.size() else ""
	$CombatHUD/Panel/Margin/VBox/Attack.disabled = str(latest_state.get("mode", "EXPLORATION")) != "COMBAT" or active_id != PLAYER_ID or selected_target_id.is_empty()

func _update_action_log() -> void:
	var label: Label = $CombatHUD/ActionLogPanel/Margin/VBox/ActionLog
	var lines: Array[String] = []
	var start_index := maxi(0, latest_action_log.size() - 5)
	for index in range(start_index, latest_action_log.size()):
		var entry_variant: Variant = latest_action_log[index]
		if not entry_variant is Dictionary: continue
		var entry := entry_variant as Dictionary
		var source := str(entry.get("source", "SYSTEM"))
		var action_type := str(entry.get("type", ""))
		var success := bool(entry.get("success", false))
		var message := str(entry.get("message", ""))
		var detail_lines: Array[String] = []
		var data_variant: Variant = entry.get("data", {})
		if data_variant is Dictionary:
			var data := data_variant as Dictionary
			if data.has("attack"):
				var attack := data.get("attack", {}) as Dictionary
				detail_lines.append("d20 %s + %s = %s | %s | D %s" % [str(attack.get("roll", "?")), str(attack.get("attackBonus", "?")), str(attack.get("total", "?")), "CRÍTICO" if bool(attack.get("critical", false)) else ("ACERTO" if bool(attack.get("hit", false)) else "ERRO"), str(attack.get("damage", 0))])
			if data.has("opportunityAttacks") and data.get("opportunityAttacks") is Array:
				for a_variant in data.get("opportunityAttacks", []) as Array:
					if a_variant is Dictionary:
						var a := a_variant as Dictionary
						detail_lines.append("AO d20 %s + %s = %s | D %s" % [str(a.get("roll", "?")), str(a.get("attackBonus", "?")), str(a.get("total", "?")), str(a.get("damage", 0))])
			if data.has("fortitudeRoll"): detail_lines.append("Fortitude d20 %s" % str(data.get("fortitudeRoll", "?")))
		var log_messages_variant: Variant = entry.get("logMessages", [])
		if log_messages_variant is Array:
			for log_message in log_messages_variant as Array:
				var text := str(log_message)
				if text.contains("teste de estabilização") or text.contains("ESTABILIZADO") or text.contains("falhou"): detail_lines.append(text)
		lines.append("%s %s\n%s%s" % ["OK" if success else "ERRO", action_type, message, ("\n" + "\n".join(detail_lines)) if not detail_lines.is_empty() else ""])
	label.text = ("\n".join(lines) if not lines.is_empty() else "Nenhuma ação registrada.")

func _is_selected_target_helpless() -> bool:
	if selected_target_id.is_empty(): return false
	for entity_variant in latest_state.get("entities", []) as Array:
		if not entity_variant is Dictionary: continue
		var entity := entity_variant as Dictionary
		if str(entity.get("id", "")) != selected_target_id: continue
		var hp := int(entity.get("hp", 0))
		if hp < 0: return true
		var conditions_variant: Variant = entity.get("conditions", [])
		if conditions_variant is Array:
			for condition_variant in conditions_variant as Array:
				var condition := str(condition_variant).to_upper()
				if condition in ["UNCONSCIOUS", "PARALYZED", "PETRIFIED", "HELPLESS"]: return true
		return false
	return false

func _update_coup_de_grace_button() -> void:
	var button: Button = $CombatHUD/Panel/Margin/VBox/CoupDeGrace
	var combat := latest_state.get("combat", {}) as Dictionary
	var turn_order := combat.get("turnOrder", []) as Array
	var current_index := int(combat.get("currentTurnIndex", 0))
	var active_id := str(turn_order[current_index]) if current_index >= 0 and current_index < turn_order.size() else ""
	button.disabled = str(latest_state.get("mode", "EXPLORATION")) != "COMBAT" or active_id != PLAYER_ID or not _is_selected_target_helpless()

func _update_death_screen(state: Dictionary) -> void:
	var player_entity: Dictionary = {}
	for entity_variant in state.get("entities", []) as Array:
		if entity_variant is Dictionary and str((entity_variant as Dictionary).get("id", "")) == PLAYER_ID:
			player_entity = entity_variant as Dictionary
			break
	var dead := int(player_entity.get("hp", 0)) <= -10
	if dead and not death_screen_shown:
		death_screen_shown = true
		$DeathOverlay.visible = true
		$DeathOverlay/Center/VBox/Message.modulate.a = 0.0
		var tween := create_tween()
		tween.tween_property($DeathOverlay/Center/VBox/Message, "modulate:a", 1.0, 2.5)
	elif not dead and death_screen_shown:
		death_screen_shown = false
		$DeathOverlay.visible = false

func _on_spectator() -> void:
	death_screen_shown = false
	$DeathOverlay.visible = false
	_set_debug_status("Modo espectador: o mundo continua normalmente.")

func _on_new_character() -> void:
	game_core.respawn_player()
	death_screen_shown = false
	$DeathOverlay.visible = false

func _grid_to_world(grid_position: Vector2i) -> Vector2:
	return Vector2(grid_position) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)

func _on_transport_error(message: String) -> void:
	_set_debug_status("Game Core: erro\n%s" % message)
	push_error(message)

func _set_debug_status(text: String) -> void:
	$DebugOverlay/Label.text = text

func _draw() -> void:
	# Only submit terrain cells that intersect the current camera viewport.
	# The draw command list is cached by Godot until queue_redraw() is requested.
	draw_rect(Rect2(Vector2.ZERO, Vector2(map_size) * TILE_SIZE), Color("151515"))
	var camera := $Player/Camera2D as Camera2D
	if camera == null:
		return
	var viewport_size := get_viewport_rect().size / camera.zoom
	var screen_center := camera.get_screen_center_position()
	var half_view := viewport_size * 0.5
	var visible_rect := Rect2(screen_center - half_view, viewport_size)
	var min_x := maxi(0, floori(visible_rect.position.x / TILE_SIZE) - 1)
	var min_y := maxi(0, floori(visible_rect.position.y / TILE_SIZE) - 1)
	var max_x := mini(map_size.x - 1, ceili(visible_rect.end.x / TILE_SIZE) + 1)
	var max_y := mini(map_size.y - 1, ceili(visible_rect.end.y / TILE_SIZE) + 1)
	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			var tile := Vector2i(x, y)
			var rect := Rect2(Vector2(tile) * TILE_SIZE, Vector2.ONE * TILE_SIZE)
			var walkable := not blocked_tiles.has(tile)
			draw_rect(rect, Color("292b2d") if walkable else Color("111214"))
			draw_rect(rect, Color("3b3d40"), false, 1.0)
			if not walkable:
				draw_line(rect.position + Vector2(8, 8), rect.end - Vector2(8, 8), Color("45474a"), 2.0)
				draw_line(Vector2(rect.end.x - 8, rect.position.y + 8), Vector2(rect.position.x + 8, rect.end.y - 8), Color("45474a"), 2.0)
