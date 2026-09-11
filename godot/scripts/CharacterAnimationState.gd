extends RefCounted

## Presentation-only animation state identifiers.
## Gameplay systems refer to states, never to asset filenames.

class_name CharacterAnimationState

enum State {
	IDLE,
	WALK,
	ATTACK,
	HIT,
	DEATH,
	DEAD,
	BLOCK,
	INTERACT
}

enum Direction {
	SOUTH,
	SOUTHEAST,
	EAST,
	NORTHEAST,
	NORTH,
	NORTHWEST,
	WEST,
	SOUTHWEST
}
