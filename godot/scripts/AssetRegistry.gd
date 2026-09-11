extends RefCounted

## Presentation-only asset abstraction.
## Game Core never depends on these paths or filenames.
## Replacing the visual pack should require changes only in this registry
## and/or presentation-specific assets.

class_name AssetRegistry

const PACK_ROOT := "res://assets/source/ClawAndBlade/"
const HUMAN_FIGHTER_ROOT := "res://assets/characters/human_fighter/"

const CHARACTER_PLAYER := PACK_ROOT + "Characters/Character - 128 x 128/character_001.png"
const CHARACTER_NPC := PACK_ROOT + "Characters/Character - 128 x 128/character_002.png"
const HUMAN_FIGHTER_INTERACT := HUMAN_FIGHTER_ROOT + "animations/interact.png"

const TERRAIN_GROUND_ALL := PACK_ROOT + "Tilemaps/Grounds/ground_all.png"
const TERRAIN_GRASS := PACK_ROOT + "Tilemaps/Grounds/ground_grass_dirt_medium.png"
const TERRAIN_SAND := PACK_ROOT + "Tilemaps/Grounds/ground_sand_light.png"
const TERRAIN_SNOW := PACK_ROOT + "Tilemaps/Grounds/ground_snow.png"
const TERRAIN_TREES := PACK_ROOT + "Tilemaps/Trees/trees_all.png"
const BUILDING_ALL := PACK_ROOT + "Buildings/building_all.png"

static func character_texture(entity_type: String) -> Texture2D:
	var path := CHARACTER_PLAYER if entity_type == "PLAYER" else CHARACTER_NPC
	return _load_texture(path)

static func animation_sheet(state: CharacterAnimationState.State, entity_type: String) -> Texture2D:
	if entity_type != "PLAYER":
		return null
	if state == CharacterAnimationState.State.INTERACT:
		return _load_texture(HUMAN_FIGHTER_INTERACT)
	return null

static func has_asset(path: String) -> bool:
	return ResourceLoader.exists(path)

static func load_texture(path: String) -> Texture2D:
	return _load_texture(path)

static func _load_texture(path: String) -> Texture2D:
	if not ResourceLoader.exists(path):
		return null
	return load(path) as Texture2D
