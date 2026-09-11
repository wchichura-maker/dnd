extends Control
class_name PartyPortrait

signal character_selected(character_id: String)

const STATE_DEFAULT := "DEFAULT"
const STATE_SELECTED := "SELECTED"
const STATE_ACTIVE := "ACTIVE"
const STATE_LOW_HP := "LOW_HP"
const STATE_LOW_FOOD := "LOW_FOOD"
const STATE_CRITICAL := "CRITICAL"
const STATE_DISABLED := "DISABLED"
const STATE_DEAD := "DEAD"

@export var character_id: String = "player-01"

var level: int = 1
var current_hp: float = 30.0
var max_hp: float = 30.0
var current_food: float = 100.0
var max_food: float = 100.0
var selected: bool = false
var active: bool = false
var conditions: Array = []
var presentation_state: String = STATE_DEFAULT

@onready var portrait: TextureRect = $Portrait
@onready var frame: TextureRect = $Frame
@onready var level_badge: Label = $LevelBadge
@onready var hp_bar: ResourceBar = $HPBar
@onready var food_bar: ResourceBar = $FoodBar
@onready var hp_value: Label = $HPValue
@onready var selection_overlay: Panel = $SelectionOverlay

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	$ClickTarget.pressed.connect(_on_pressed)
	hp_bar.set_value(current_hp, max_hp)
	food_bar.set_value(current_food, max_food)
	hp_value.text = _format_hp()
	level_badge.text = str(level)
	_set_visuals()

func apply_data(data: Dictionary) -> void:
	character_id = str(data.get("characterId", character_id))
	level = int(data.get("level", level))
	current_hp = float(data.get("currentHP", current_hp))
	max_hp = float(data.get("maxHP", max_hp))
	current_food = float(data.get("currentFood", current_food))
	max_food = float(data.get("maxFood", max_food))
	selected = bool(data.get("selected", selected))
	active = bool(data.get("active", active))
	conditions = data.get("conditions", []) as Array
	_resolve_state()
	hp_bar.set_value(current_hp, max_hp)
	food_bar.set_value(current_food, max_food)
	hp_value.text = _format_hp()
	level_badge.text = str(level)
	_set_visuals()

func set_selected(value: bool) -> void:
	selected = value
	_resolve_state()
	_set_visuals()

func set_active(value: bool) -> void:
	active = value
	_resolve_state()
	_set_visuals()

func _format_hp() -> String:
	return "%d/%d" % [roundi(current_hp), roundi(max_hp)]

func _resolve_state() -> void:
	if current_hp <= -10.0:
		presentation_state = STATE_DEAD
		return
	if current_hp <= 0.0:
		presentation_state = STATE_DISABLED
		return
	if max_hp > 0.0 and current_hp <= max_hp * 0.25:
		presentation_state = STATE_CRITICAL
		return
	if max_hp > 0.0 and current_hp <= max_hp * 0.5:
		presentation_state = STATE_LOW_HP
		return
	if max_food > 0.0 and current_food <= max_food * 0.25:
		presentation_state = STATE_LOW_FOOD
		return
	if active:
		presentation_state = STATE_ACTIVE
		return
	if selected:
		presentation_state = STATE_SELECTED
		return
	presentation_state = STATE_DEFAULT

func _set_visuals() -> void:
	if not is_node_ready():
		return
	selection_overlay.visible = selected or active
	if selected:
		selection_overlay.modulate = Color("d8b35a")
		selection_overlay.modulate.a = 0.95
	elif active:
		selection_overlay.modulate = Color("9a7a43")
		selection_overlay.modulate.a = 0.75
	else:
		selection_overlay.visible = false

	var portrait_alpha := 1.0
	if presentation_state == STATE_DISABLED:
		portrait_alpha = 0.62
	elif presentation_state == STATE_DEAD:
		portrait_alpha = 0.48
	portrait.modulate.a = portrait_alpha
	frame.modulate.a = 1.0

func _on_pressed() -> void:
	selected = true
	character_selected.emit(character_id)
	_resolve_state()
	_set_visuals()
