extends RefCounted

## D&D Online visual scale contract.
## This is presentation-only. D&D distances and creature footprints remain in Game Core.
## Grid size is deliberately independent from visual creature height.

class_name VisualScale

# 64 px is a convenient power-of-two raster unit for pixel-art textures,
# atlases and integer camera/grid positioning. It does not affect Core rules.
const GRID_CELL_PIXELS: float = 64.0
const MEDIUM_VISUAL_HEIGHT_CELLS: float = 1.55
const MEDIUM_VISUAL_WIDTH_CELLS_MIN: float = 0.45
const MEDIUM_VISUAL_WIDTH_CELLS_MAX: float = 0.55

const SMALL_VISUAL_HEIGHT_CELLS_MIN: float = 1.10
const SMALL_VISUAL_HEIGHT_CELLS_MAX: float = 1.25
const LARGE_VISUAL_HEIGHT_CELLS_MIN: float = 2.0
const LARGE_VISUAL_HEIGHT_CELLS_MAX: float = 2.4
const HUGE_VISUAL_HEIGHT_CELLS_MIN: float = 2.8
const HUGE_VISUAL_HEIGHT_CELLS_MAX: float = 3.5
const GARGANTUAN_VISUAL_HEIGHT_CELLS_MIN: float = 3.8
const GARGANTUAN_VISUAL_HEIGHT_CELLS_MAX: float = 4.8

static func cells_to_pixels(cells: float) -> float:
	return cells * GRID_CELL_PIXELS

static func medium_height_pixels() -> float:
	return cells_to_pixels(MEDIUM_VISUAL_HEIGHT_CELLS)
