extends Node2D
class_name PlayerController

## Presentation controller for the Godot entity.
## The authoritative movement decision comes from the Game Core transport.

const TILE_SIZE: float = 48.0
const PARTY_HUD_SCENE := preload("res://scenes/PartyHUD.tscn")
const LOCATION_COMPASS_HUD_SCENE := preload("res://scenes/LocationCompassHUD.tscn")

var grid_position: Vector2i = Vector2i(3, 3)
var is_moving: bool = false
var can_receive_movement_input: bool = true

func _ready() -> void:
	call_deferred("_install_huds")

func _install_huds() -> void:
	var scene_root := get_tree().current_scene
	if scene_root == null:
		return
	var old_combat_hud := scene_root.get_node_or_null("CombatHUD") as CanvasLayer
	if old_combat_hud != null:
		old_combat_hud.visible = false
	var old_death_overlay := scene_root.get_node_or_null("DeathOverlay") as CanvasLayer
	if old_death_overlay != null:
		old_death_overlay.visible = false

	if scene_root.get_node_or_null("PartyHUD") == null:
		var party_hud := PARTY_HUD_SCENE.instantiate()
		party_hud.name = "PartyHUD"
		scene_root.add_child(party_hud)

	if scene_root.get_node_or_null("LocationCompassHUD") == null:
		var location_hud := LOCATION_COMPASS_HUD_SCENE.instantiate() as LocationCompassHUD
		location_hud.name = "LocationCompassHUD"
		scene_root.add_child(location_hud)
		var game_core := scene_root.find_child("GameCoreClient", true, false)
		if game_core != null:
			location_hud.configure(game_core)

func set_alive(value: bool) -> void:
	# Only transition the presentation when the life state actually changes.
	# Repeated authoritative snapshots must not restart DEATH or clear its lock.
	if value == can_receive_movement_input:
		return
	can_receive_movement_input = value
	var view := get_node_or_null("EntityView") as EntityView
	if view == null or view.animation_controller == null:
		return
	if not value:
		is_moving = false
		view.animation_controller.play_state(CharacterAnimationState.State.DEATH, false)
	else:
		view.animation_controller.clear_death_lock()

func move_along_path(path: Array[Vector2i], step_duration: float) -> void:
	if path.is_empty() or is_moving or not can_receive_movement_input:
		return

	is_moving = true
	var view := get_node_or_null("EntityView") as EntityView
	var tween: Tween = create_tween()
	tween.set_trans(Tween.TRANS_LINEAR)
	tween.set_ease(Tween.EASE_IN_OUT)

	var previous_tile := grid_position
	for tile in path:
		var delta := tile - previous_tile
		if view != null and delta != Vector2i.ZERO:
			view.set_facing_direction(_direction_from_delta(delta))
		grid_position = tile
		var world_position: Vector2 = Vector2(tile) * TILE_SIZE + Vector2.ONE * (TILE_SIZE * 0.5)
		tween.tween_property(self, "position", world_position, step_duration)
		previous_tile = tile

	tween.finished.connect(_on_movement_finished.bind(path.back()))

func _on_movement_finished(final_tile: Vector2i) -> void:
	grid_position = final_tile
	is_moving = false

func _direction_from_delta(delta: Vector2i) -> int:
	var x := signi(delta.x)
	var y := signi(delta.y)
	if x == 0 and y > 0:
		return CharacterAnimationState.Direction.SOUTH
	if x > 0 and y > 0:
		return CharacterAnimationState.Direction.SOUTHEAST
	if x > 0 and y == 0:
		return CharacterAnimationState.Direction.EAST
	if x > 0 and y < 0:
		return CharacterAnimationState.Direction.NORTHEAST
	if x == 0 and y < 0:
		return CharacterAnimationState.Direction.NORTH
	if x < 0 and y < 0:
		return CharacterAnimationState.Direction.NORTHWEST
	if x < 0 and y == 0:
		return CharacterAnimationState.Direction.WEST
	return CharacterAnimationState.Direction.SOUTHWEST
