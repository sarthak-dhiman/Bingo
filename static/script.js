const socket = io();
const board = document.getElementById("board");
const numberDisplay = document.getElementById("numberDisplay");
const historyList = document.getElementById("historyList");
const playerList = document.getElementById("playerList");
const loginCard = document.getElementById("loginCard");
const gameCard = document.getElementById("gameCard");
const usernameInput = document.getElementById("username");
const loginForm = document.getElementById("loginForm");
const messageArea = document.getElementById("messageArea");
const currentTurnPlayer = document.getElementById("currentTurnPlayer");
const callButton = document.getElementById("callButton");
const userAvatarDisplay = document.getElementById("userAvatar");
const manualModeToggle = document.getElementById("manualModeToggle");
const manualNumberSelection = document.getElementById("manualNumberSelection");
const manualGrid = document.getElementById("manualGrid");

let numbers = [];
let username = "";
let userAvatar = "⚔️";
let calledNumbers = new Set();
let bingoCount = 0;
let isManualMode = false;
let myTurn = false;
const bingoLetters = ["B", "I", "N", "G", "O"];

// Manual Mode Functions
function toggleManualMode(checked) {
    socket.emit("toggle_manual_mode", { manual_mode: checked });
}

function callSpecificNumber(num) {
    if (!myTurn || !isManualMode || calledNumbers.has(num)) return;
    socket.emit("call_specific_number", { number: num });
}

function updateManualGrid() {
    manualGrid.innerHTML = "";
    for (let i = 1; i <= 25; i++) {
        const cell = document.createElement("div");
        cell.classList.add("manual-cell");
        cell.innerText = i;
        if (calledNumbers.has(i)) {
            cell.classList.add("called");
        } else if (myTurn && isManualMode) {
            cell.classList.add("my-turn-highlight");
            cell.onclick = () => callSpecificNumber(i);
        }
        manualGrid.appendChild(cell);
    }
}

// Splash Screen Logic
window.addEventListener("load", () => {
    const splash = document.getElementById("splashScreen");
    const hideSplash = () => {
        splash.classList.add("splash-hidden");
        // Remove from DOM after transition to avoid interference
        setTimeout(() => splash.remove(), 800);
    };
    
    // Auto-hide after 3 seconds
    const timer = setTimeout(hideSplash, 3500);
    
    // Allow skip on click
    splash.addEventListener("click", () => {
        clearTimeout(timer);
        hideSplash();
    });
});

// Avatar Selection
document.querySelectorAll(".avatar-option").forEach(opt => {
    opt.addEventListener("click", () => {
        document.querySelectorAll(".avatar-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        userAvatar = opt.dataset.avatar;
    });
});

function setMessage(text, type = "normal") {
    messageArea.innerText = text;
    messageArea.classList.remove("error", "success");
    if (type === "error") messageArea.classList.add("error");
    if (type === "success") messageArea.classList.add("success");
}

function updateBingoLetters() {
    const size = 5;
    const state = getBoardState();
    let completedLines = 0;

    // rows
    for (let r = 0; r < size; r++) {
        let full = true;
        for (let c = 0; c < size; c++) {
            if (!state[r * size + c]) {
                full = false;
                break;
            }
        }
        if (full) completedLines++;
    }

    // columns
    for (let c = 0; c < size; c++) {
        let full = true;
        for (let r = 0; r < size; r++) {
            if (!state[r * size + c]) {
                full = false;
                break;
            }
        }
        if (full) completedLines++;
    }

    // main diagonal
    let diag1 = true;
    for (let i = 0; i < size; i++) {
        if (!state[i * size + i]) {
            diag1 = false;
            break;
        }
    }
    if (diag1) completedLines++;

    // anti diagonal
    let diag2 = true;
    for (let i = 0; i < size; i++) {
        if (!state[i * size + (size - 1 - i)]) {
            diag2 = false;
            break;
        }
    }
    if (diag2) completedLines++;

    bingoCount = Math.min(completedLines, 5);
    
    bingoLetters.forEach((letter, index) => {
        const el = document.getElementById(`letter-${letter}`);
        if (index < bingoCount) {
            if (!el.classList.contains("active")) {
                el.classList.add("active");
                // Animation trigger
                el.style.animation = 'none';
                el.offsetHeight; // trigger reflow
                el.style.animation = null;
            }
        } else {
            el.classList.remove("active");
        }
    });
}

function generateBoard() {
    numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);
    board.innerHTML = "";

    numbers.forEach((num) => {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.innerText = num;
        cell.dataset.number = num;
        cell.onclick = () => {
            const value = Number(cell.dataset.number);
            if (!calledNumbers.has(value)) {
                setMessage("Error: this number has not been called yet.", "error");
                return;
            }
            cell.classList.toggle("marked");
            updateBingoLetters();
            setMessage("", "normal");
        };
        board.appendChild(cell);
    });
    
    // Reset BINGO letters
    bingoLetters.forEach(l => document.getElementById(`letter-${l}`).classList.remove("active"));
}

generateBoard();

function generateNumber() {
    socket.emit("call_number");
}

function resetGame() {
    socket.emit("reset_game");
}

function applyLocalReset() {
    calledNumbers.clear();
    generateBoard();
    bingoCount = 0;
    historyList.innerHTML = "";
    numberDisplay.innerText = "Waiting for a new number...";
    setMessage("Game has been reset.", "success");
    
    // Reset manual mode UI
    isManualMode = false;
    manualModeToggle.checked = false;
    manualNumberSelection.classList.add("hidden");
    updateManualGrid();
    
    // Close modal if it was open
    closeWinnerModal();
    closeLoserModal();
    closeGreedyModal();
}

function getBoardState() {
    const cells = Array.from(board.querySelectorAll(".cell"));
    return cells.map((cell) => cell.classList.contains("marked"));
}

function hasBingo() {
    const state = getBoardState();
    const size = 5;

    // rows
    for (let r = 0; r < size; r++) {
        let full = true;
        for (let c = 0; c < size; c++) {
            if (!state[r * size + c]) {
                full = false;
                break;
            }
        }
        if (full) return true;
    }

    // columns
    for (let c = 0; c < size; c++) {
        let full = true;
        for (let r = 0; r < size; r++) {
            if (!state[r * size + c]) {
                full = false;
                break;
            }
        }
        if (full) return true;
    }

    // main diagonal
    let diag1 = true;
    for (let i = 0; i < size; i++) {
        if (!state[i * size + i]) {
            diag1 = false;
            break;
        }
    }
    if (diag1) return true;

    // anti diagonal
    let diag2 = true;
    for (let i = 0; i < size; i++) {
        if (!state[i * size + (size - 1 - i)]) {
            diag2 = false;
            break;
        }
    }
    return diag2;
}

function claimBingo() {
    if (!username) {
        setMessage("Please join the game first.", "error");
        return;
    }

    if (bingoCount >= 5) {
        socket.emit("bingo_claim", { name: username });
    } else {
        showGreedyModal();
    }
}

function showGreedyModal() {
    const modal = document.getElementById("greedyModal");
    const avatarDisplay = document.getElementById("greedyAvatarDisplay");
    const container = document.querySelector(".greedy-avatar-container");
    
    avatarDisplay.innerText = userAvatar;
    container.classList.remove("hit");
    modal.classList.remove("hidden");
    
    setTimeout(() => {
        container.classList.add("hit");
    }, 600);
}

function closeGreedyModal() {
    document.getElementById("greedyModal").classList.add("hidden");
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    username = usernameInput.value.trim() || "Guest";
    socket.emit("join_game", { name: username, avatar: userAvatar });
});

socket.on("game_joined", (data) => {
    loginCard.classList.add("hidden");
    gameCard.classList.remove("hidden");
    document.getElementById("welcomeText").innerText = `Welcome, ${username}`;
    userAvatarDisplay.innerText = userAvatar;
});

socket.on("player_list", (players) => {
    playerList.innerHTML = "";
    players.forEach((player) => {
        const item = document.createElement("li");
        item.innerHTML = `<span>${player.avatar}</span> ${player.name}`;
        playerList.appendChild(item);
    });
});

socket.on("turn_update", (data) => {
    currentTurnPlayer.innerText = data.current_player;
    myTurn = data.current_player_sid === socket.id;
    
    if (myTurn) {
        callButton.disabled = isManualMode; // Disable auto-call button if in manual mode
        callButton.classList.add("my-turn");
        if (!isManualMode) {
            setMessage("It's your turn to call a number!", "success");
        } else {
            setMessage("It's your turn! Select a number from the grid.", "success");
        }
    } else {
        callButton.disabled = true;
        callButton.classList.remove("my-turn");
    }
    updateManualGrid();
});

socket.on("manual_mode_update", (data) => {
    isManualMode = data.manual_mode;
    manualModeToggle.checked = isManualMode;
    
    if (isManualMode) {
        manualNumberSelection.classList.remove("hidden");
        if (myTurn) {
            callButton.disabled = true;
            setMessage("Manual mode active. Select a number from the grid.", "success");
        }
    } else {
        manualNumberSelection.classList.add("hidden");
        if (myTurn) {
            callButton.disabled = false;
            setMessage("It's your turn to call a number!", "success");
        }
    }
    updateManualGrid();
});

socket.on("number_called", (data) => {
    const num = data.number;
    calledNumbers.add(num);
    numberDisplay.innerText = num;
    const item = document.createElement("li");
    item.innerText = num;
    historyList.prepend(item);
    
    // Highlight matching cell on board if any
    const cell = board.querySelector(`.cell[data-number="${num}"]`);
    if (cell) {
        cell.classList.add("can-mark");
    }
    
    setMessage(`Number ${num} called.`, "success");
    updateManualGrid();
});

socket.on("game_reset", () => {
    applyLocalReset();
});

socket.on("bingo_result", (data) => {
    const winnerName = data.name || "A player";
    const winnerAvatar = data.avatar || "🐱";
    const message = data.message || `${winnerName} claims Bingo!`;
    setMessage(message, "success");
    
    if (data.sid === socket.id) {
        showWinnerModal(winnerName, winnerAvatar);
    } else {
        showLoserModal(winnerName, winnerAvatar);
    }
});

function showWinnerModal(name, avatar) {
    const modal = document.getElementById("winnerModal");
    const display = document.getElementById("winnerNameDisplay");
    const avatarDisplay = document.getElementById("winnerAvatarDisplay");
    
    display.innerText = "YOU ARE THE KING!";
    avatarDisplay.innerText = avatar;
    modal.classList.remove("hidden");
    
    confettiEffect();
}

function showLoserModal(winnerName, winnerAvatar) {
    const modal = document.getElementById("loserModal");
    const display = document.getElementById("loserAvatarDisplay");
    const message = document.getElementById("loserMessage");
    const container = document.querySelector(".loser-avatar-container");
    
    display.innerText = userAvatar;
    message.innerText = `loser, embrace your new king ${winnerName}`;
    container.classList.remove("bowing");
    modal.classList.remove("hidden");
    
    setTimeout(() => {
        container.classList.add("bowing");
    }, 500);
}

function closeWinnerModal() {
    document.getElementById("winnerModal").classList.add("hidden");
    document.body.classList.remove("winner-flash");
}

function closeLoserModal() {
    document.getElementById("loserModal").classList.add("hidden");
    document.body.classList.remove("winner-flash");
}

function confettiEffect() {
    // Basic pixel-art style celebration (simplified)
    document.body.classList.add("winner-flash");
    setTimeout(() => {
        document.body.classList.remove("winner-flash");
    }, 5000);
}

socket.on("game_message", (message) => {
    setMessage(message);
});
