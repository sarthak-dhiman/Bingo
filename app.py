import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import random

app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

called_numbers = []
available_numbers = list(range(1, 26))
players = {} # sid -> {"name": username, "avatar": avatar}
player_order = []
current_turn_index = 0
manual_mode = False

@app.route("/")
def index():
    return render_template("index.html")

def get_current_turn_player():
    if not player_order:
        return None
    return player_order[current_turn_index]

@socketio.on("toggle_manual_mode")
def toggle_manual_mode(data):
    global manual_mode
    manual_mode = data.get("manual_mode", False)
    emit("manual_mode_update", {"manual_mode": manual_mode}, broadcast=True)
    emit("game_message", f"Manual mode {'enabled' if manual_mode else 'disabled'}.", broadcast=True)

@socketio.on("join_game")
def join_game(data):
    global player_order
    username = data.get("name", "Guest")
    avatar = data.get("avatar", "⚔️")
    sid = request.sid
    
    # Check if avatar is already taken
    for p_sid, p_info in players.items():
        if p_info.get("avatar") == avatar:
            emit("game_message", "Avatar is already taken!", room=sid)
            return

    players[sid] = {"name": username, "avatar": avatar}
    if sid not in player_order:
        player_order.append(sid)
    
    emit("game_joined", {"name": username, "avatar": avatar})
    emit("player_list", [{"name": p["name"], "avatar": p["avatar"]} for p in players.values()], broadcast=True)
    emit("game_message", f"{username} joined the game.", broadcast=True)
    emit("manual_mode_update", {"manual_mode": manual_mode}, room=sid)
    
    current_player_sid = get_current_turn_player()
    emit("turn_update", {
        "current_player": players.get(current_player_sid, {}).get("name", "Waiting..."),
        "is_your_turn": current_player_sid == sid
    }, broadcast=True)

@socketio.on("call_number")
def generate_number():
    global available_numbers, current_turn_index
    sid = request.sid
    
    if manual_mode:
        emit("game_message", "Manual mode is active. Select a number to call.", room=sid)
        return

    if get_current_turn_player() != sid:
        emit("game_message", "It's not your turn!", room=sid)
        return

    if len(available_numbers) > 0:
        number = random.choice(available_numbers)
        available_numbers.remove(number)
        called_numbers.append(number)
        
        # Advance turn
        current_turn_index = (current_turn_index + 1) % len(player_order)
        next_player_sid = get_current_turn_player()
        
        emit("number_called", {"number": number, "called_numbers": called_numbers}, broadcast=True)
        emit("turn_update", {
            "current_player": players.get(next_player_sid, {}).get("name", "Waiting..."),
            "is_your_turn": False
        }, broadcast=True)
    else:
        emit("game_message", "All numbers have been called!", broadcast=True)

@socketio.on("call_specific_number")
def call_specific_number(data):
    global available_numbers, current_turn_index
    sid = request.sid
    number = int(data.get("number"))

    if not manual_mode:
        emit("game_message", "Manual mode is not active.", room=sid)
        return

    if get_current_turn_player() != sid:
        emit("game_message", "It's not your turn!", room=sid)
        return

    if number in available_numbers:
        available_numbers.remove(number)
        called_numbers.append(number)
        
        # Advance turn
        current_turn_index = (current_turn_index + 1) % len(player_order)
        next_player_sid = get_current_turn_player()
        
        emit("number_called", {"number": number, "called_numbers": called_numbers}, broadcast=True)
        emit("turn_update", {
            "current_player": players.get(next_player_sid, {}).get("name", "Waiting..."),
            "is_your_turn": False
        }, broadcast=True)
    else:
        emit("game_message", "That number has already been called!", room=sid)

@socketio.on("reset_game")
def reset_game():
    global called_numbers, available_numbers, current_turn_index, manual_mode
    called_numbers = []
    available_numbers = list(range(1, 26))
    current_turn_index = 0
    # Keep manual_mode as it is or reset? Usually reset to False is safer
    manual_mode = False
    
    emit("game_reset", broadcast=True)
    emit("manual_mode_update", {"manual_mode": manual_mode}, broadcast=True)
    emit("game_message", "The game has been reset.", broadcast=True)

@socketio.on("bingo_claim")
def bingo_claim(data):
    sid = request.sid
    p_info = players.get(sid, {})
    name = p_info.get("name", "A player")
    avatar = p_info.get("avatar", "🐱")
    emit("bingo_result", {"name": name, "sid": sid, "avatar": avatar, "message": f"{name} says BINGO!"}, broadcast=True)
    emit("game_message", f"{name} wins! Start a new game or reset.", broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    global player_order, current_turn_index
    sid = request.sid
    username = players.pop(sid, None)
    
    if sid in player_order:
        idx = player_order.index(sid)
        player_order.remove(sid)
        if len(player_order) > 0:
            if current_turn_index >= len(player_order):
                current_turn_index = 0
            elif idx < current_turn_index:
                current_turn_index -= 1
        else:
            current_turn_index = 0

    if username:
        emit("player_list", [{"name": p["name"], "avatar": p["avatar"]} for p in players.values()], broadcast=True)
        emit("game_message", f"{username['name']} left the game.", broadcast=True)
        
        current_player_sid = get_current_turn_player()
        emit("turn_update", {
            "current_player": players.get(current_player_sid, {}).get("name", "Waiting...") if current_player_sid else "No one",
            "is_your_turn": False
        }, broadcast=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
