extends Node
class_name GameCoreClient

signal state_received(snapshot: Dictionary)
signal action_resolved(action_result: Dictionary, snapshot: Dictionary)
signal transport_error(message: String)

const BASE_URL: String = "http://127.0.0.1:8787"
var http_request: HTTPRequest
var busy: bool = false
var latest_snapshot: Dictionary = {}
var last_requested_action: Dictionary = {}

func _ready() -> void:
	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_request_completed)

func request_state() -> void:
	_request("GET", "/state", {})

func request_action(action: Dictionary) -> void:
	last_requested_action = action.duplicate(true)
	_request("POST", "/action", action)

func end_turn() -> void:
	last_requested_action = {"type": "END_TURN"}
	_request("POST", "/turn/end", {})

func reset_game() -> void:
	last_requested_action = {"type": "RESET"}
	_request("POST", "/reset", {})

func respawn_player() -> void:
	last_requested_action = {"type": "RESPAWN", "actorId": "player-01"}
	_request("POST", "/player/respawn", {})

func _request(method: String, path: String, payload: Dictionary) -> void:
	if busy:
		return
	busy = true
	var headers: PackedStringArray = ["Content-Type: application/json"]
	var body: String = JSON.stringify(payload)
	var http_method: HTTPClient.Method = HTTPClient.METHOD_GET
	if method == "POST":
		http_method = HTTPClient.METHOD_POST
	var error: Error = http_request.request(BASE_URL + path, headers, http_method, body)
	if error != OK:
		busy = false
		transport_error.emit("Falha ao iniciar comunicação com o Game Core: %s" % error)

func _on_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	busy = false
	if result != HTTPRequest.RESULT_SUCCESS:
		transport_error.emit("Game Core indisponível. Inicie o servidor com: npm run game-core")
		return
	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	if parsed == null or not parsed is Dictionary:
		transport_error.emit("Resposta inválida do Game Core.")
		return
	var payload: Dictionary = parsed
	latest_snapshot = payload
	var action_result_variant: Variant = payload.get("actionResult", {})
	var action_result: Dictionary = action_result_variant as Dictionary if action_result_variant is Dictionary else {}
	if response_code < 200 or response_code >= 300:
		var message: String = str(action_result.get("message", payload.get("message", "Ação rejeitada pelo Game Core.")))
		transport_error.emit(message)
		state_received.emit(payload)
		return
	if payload.has("actionResult"):
		# Presentation systems can inspect the action requested immediately before this response.
		action_resolved.emit(action_result, payload)
	state_received.emit(payload)
