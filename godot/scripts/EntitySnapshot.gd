extends RefCounted

## Render-facing snapshot of a game entity.
## This mirrors only the data the Godot presentation layer needs.
## It is intentionally independent from D&D rules and Godot scene nodes.

class_name EntitySnapshot

var id: String
var name: String
var entity_type: String
var grid_position: Vector2i
var hp: int
var max_hp: int
var armor_class: int
var movement: int

func _init(
	entity_id: String,
	entity_name: String,
	type: String,
	position: Vector2i,
	current_hp: int,
	maximum_hp: int,
	ac: int,
	movement_speed: int
) -> void:
	id = entity_id
	name = entity_name
	entity_type = type
	grid_position = position
	hp = current_hp
	max_hp = maximum_hp
	armor_class = ac
	movement = movement_speed

static func from_dictionary(data: Dictionary) -> EntitySnapshot:
	return EntitySnapshot.new(
		str(data.get("id", "")),
		str(data.get("name", "")),
		str(data.get("type", "NPC")),
		Vector2i(int(data.get("x", 0)), int(data.get("y", 0))),
		int(data.get("hp", 0)),
		int(data.get("maxHp", 0)),
		int(data.get("armorClass", 10)),
		int(data.get("movement", 0))
	)
