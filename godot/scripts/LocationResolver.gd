extends RefCounted
class_name LocationResolver

## Presentation-facing resolver. It consumes world-state location data when the
## authoritative world begins publishing it; it never owns region truth.

static func resolve(state: Dictionary, grid_position: Vector2i) -> String:
	var direct_location := _read_name(state.get("location", null))
	if not direct_location.is_empty():
		return direct_location

	var current_location := _read_name(state.get("currentLocation", null))
	if not current_location.is_empty():
		return current_location

	var region := _read_name(state.get("region", null))
	if not region.is_empty():
		return region

	var regions_variant: Variant = state.get("regions", [])
	if regions_variant is Array:
		for region_variant in regions_variant as Array:
			if not region_variant is Dictionary:
				continue
			var region_data := region_variant as Dictionary
			if _contains_position(region_data, grid_position):
				var name := _read_name(region_data)
				if not name.is_empty():
					return name

	return ""

static func _read_name(value: Variant) -> String:
	if value is String:
		return str(value).strip_edges()
	if value is Dictionary:
		var data := value as Dictionary
		for key in ["displayName", "name", "locationName"]:
			var candidate := str(data.get(key, "")).strip_edges()
			if not candidate.is_empty():
				return candidate
	return ""

static func _contains_position(region: Dictionary, position: Vector2i) -> bool:
	var bounds_variant: Variant = region.get("bounds", null)
	if bounds_variant is Dictionary:
		var bounds := bounds_variant as Dictionary
		var min_x := int(bounds.get("minX", bounds.get("x", 0)))
		var min_y := int(bounds.get("minY", bounds.get("y", 0)))
		var max_x := int(bounds.get("maxX", bounds.get("width", min_x)))
		var max_y := int(bounds.get("maxY", bounds.get("height", min_y)))
		return position.x >= min_x and position.y >= min_y and position.x <= max_x and position.y <= max_y
	return false
