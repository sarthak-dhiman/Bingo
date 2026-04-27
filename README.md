# Bingo Live 🎮

A real-time, multiplayer Bingo web app built with Flask and Socket.IO. Play classic 5x5 Bingo with friends simultaneously, featuring turn-based play, manual calling mode, and a fun pixel-art style!

## 🌟 Features

- **Real-Time Multiplayer:** Instant updates utilizing WebSockets (Flask-SocketIO), keeping all players' boards in sync.
- **Turn-based Gameplay:** Players take turns calling numbers sequentially.
- **Automatic & Manual Calling:** Option to automatically draw a randomly available number or manually select specific numbers from a 1-25 grid.
- **Terraria Avatars:** Choose from multiple fun sprite avatars (Warrior, Mage, Ranger, Slimes, etc.) when joining the game.
- **Live Event Feed:** Keep track of who joined, whose turn it is, and what numbers were called.
- **Responsive Layout:** Adaptive design with a retro-arcade aesthetic.
- **Docker Support:** Ready to be deployed with the provided `Dockerfile`.

## 🛠️ Built With

- **Backend:** Python, Flask, Flask-SocketIO, Eventlet
- **Frontend:** HTML5, Vanilla CSS, Vanilla JavaScript, Socket.IO Client
- **Assets:** Google Fonts ("Press Start 2P")

## 🚀 Getting Started

### Prerequisites

You need Python 3.8+ installed on your system.

### Local Setup

1. **Clone the repository** (or navigate to the directory).
2. **Create a virtual environment (Optional but Recommended):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the server:**
   ```bash
   python app.py
   ```
5. **Play:** Open [http://localhost:5000](http://localhost:5000) in multiple browser tabs or devices on your network to join the game!

### Running with Docker

Alternatively, you can build and run the application in a Docker container:

```bash
docker build -t bingo-game .
docker run -p 5000:5000 bingo-game
```

## 🕹️ How to Play

1. **Join the Game**: Enter your name and pick an avatar.
2. **Take Your Turn**: Wait until it's your turn. If "Manual Mode" is disabled, click the "Call Number" button to automatically draw a random remaining number. If enabled, pick a specific number to call.
3. **Mark the Board**: Your board updates automatically when numbers are called.
4. **Win**: As soon as you complete a Bingo (5 in a row horizontally, vertically, or diagonally), smash the "Claim Bingo" button to win!

## 🤝 Credits

Developed at Chicmic Studios by:
- Sarthak Dhiman , Kaashif Matto
