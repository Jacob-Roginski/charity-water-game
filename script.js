const settings = {
  easy: {
    label: "Easy",
    goal: 10,
    time: 45,
    spawnMs: 900,
    pollutionChance: 0.2,
    dropLifeMs: 3200,
    pollutionPenalty: 1,
  },
  normal: {
    label: "Normal",
    goal: 16,
    time: 40,
    spawnMs: 700,
    pollutionChance: 0.28,
    dropLifeMs: 2500,
    pollutionPenalty: 2,
  },
  hard: {
    label: "Hard",
    goal: 24,
    time: 35,
    spawnMs: 560,
    pollutionChance: 0.36,
    dropLifeMs: 1850,
    pollutionPenalty: 3,
  },
};

const milestoneMessages = [
  { score: 5, text: "Nice start. A full container begins with one drop." },
  { score: 10, text: "Halfway there. Keep the water clean." },
  { score: 15, text: "Momentum! You are helping more families." },
  { score: 20, text: "Big impact. Final push!" },
];

const gameBoard = document.getElementById("gameBoard");
const scoreValue = document.getElementById("scoreValue");
const goalValue = document.getElementById("goalValue");
const timeValue = document.getElementById("timeValue");
const statusMessage = document.getElementById("statusMessage");
const startBtn = document.getElementById("startBtn");
const difficultyButtons = [...document.querySelectorAll(".difficulty-btn")];

let selectedMode = "easy";
let score = 0;
let timeLeft = settings[selectedMode].time;
let running = false;
let spawnTimer = null;
let clockTimer = null;
const spawnedItems = new Set();
const reachedMilestones = new Set();

function playTone(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "collect") {
    osc.type = "triangle";
    osc.frequency.value = 640;
    gain.gain.value = 0.04;
  } else if (type === "penalty") {
    osc.type = "square";
    osc.frequency.value = 180;
    gain.gain.value = 0.03;
  } else if (type === "win") {
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
  }

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => ctx.close();
}

function resetStats() {
  score = 0;
  timeLeft = settings[selectedMode].time;
  reachedMilestones.clear();
  scoreValue.textContent = String(score);
  goalValue.textContent = String(settings[selectedMode].goal);
  timeValue.textContent = `${timeLeft}s`;
}

function setStatus(text) {
  statusMessage.textContent = text;
}

function updateDifficultyUI() {
  difficultyButtons.forEach((button) => {
    const isActive = button.dataset.mode === selectedMode;
    button.classList.toggle("active", isActive);
  });

  goalValue.textContent = String(settings[selectedMode].goal);
  timeValue.textContent = `${settings[selectedMode].time}s`;
}

function removeItem(item) {
  if (spawnedItems.has(item)) {
    spawnedItems.delete(item);
  }
  item.remove();
}

function createItem() {
  const modeConfig = settings[selectedMode];
  const item = document.createElement("button");
  const isPollution = Math.random() < modeConfig.pollutionChance;
  const itemWidth = 44;
  const itemHeight = 60;

  item.type = "button";
  item.className = isPollution ? "pollution float-in" : "drop float-in";
  item.ariaLabel = isPollution ? "Pollution spill" : "Clean water drop";

  const maxX = gameBoard.clientWidth - itemWidth;
  const maxY = gameBoard.clientHeight - itemHeight;
  item.style.left = `${Math.max(0, Math.random() * maxX)}px`;
  item.style.top = `${Math.max(0, Math.random() * maxY)}px`;

  item.addEventListener("click", () => {
    if (!running) {
      return;
    }

    if (isPollution) {
      score = Math.max(0, score - modeConfig.pollutionPenalty);
      setStatus(`Pollution hit! -${modeConfig.pollutionPenalty} points.`);
      playTone("penalty");
    } else {
      score += 1;
      setStatus("Clean drop collected! Keep going.");
      playTone("collect");
    }

    scoreValue.textContent = String(score);
    checkMilestones();
    removeItem(item);
    checkWinState();
  });

  spawnedItems.add(item);
  gameBoard.append(item);

  window.setTimeout(() => {
    removeItem(item);
  }, modeConfig.dropLifeMs);
}

function clearBoard() {
  spawnedItems.forEach((item) => item.remove());
  spawnedItems.clear();
}

function checkMilestones() {
  const milestone = milestoneMessages.find(
    (entry) => score >= entry.score && !reachedMilestones.has(entry.score),
  );

  if (milestone) {
    reachedMilestones.add(milestone.score);
    setStatus(milestone.text);
  }
}

function checkWinState() {
  if (score >= settings[selectedMode].goal) {
    endGame(true);
  }
}

function tickClock() {
  if (!running) {
    return;
  }

  timeLeft -= 1;
  timeValue.textContent = `${Math.max(0, timeLeft)}s`;

  if (timeLeft <= 0) {
    endGame(false);
  }
}

function endGame(won) {
  running = false;
  clearInterval(spawnTimer);
  clearInterval(clockTimer);
  spawnTimer = null;
  clockTimer = null;
  clearBoard();
  startBtn.disabled = false;

  if (won) {
    playTone("win");
    setStatus(
      `You won on ${settings[selectedMode].label}! You reached ${score}/${settings[selectedMode].goal}.`,
    );
  } else {
    setStatus(
      `Time's up. Final score: ${score}/${settings[selectedMode].goal}. Try again!`,
    );
  }
}

function startGame() {
  if (running) {
    return;
  }

  running = true;
  startBtn.disabled = true;
  clearBoard();
  resetStats();
  setStatus(`Mode: ${settings[selectedMode].label}. Go collect clean drops.`);

  const modeConfig = settings[selectedMode];
  spawnTimer = window.setInterval(createItem, modeConfig.spawnMs);
  clockTimer = window.setInterval(tickClock, 1000);
  createItem();
}

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (running) {
      return;
    }

    selectedMode = button.dataset.mode;
    updateDifficultyUI();
    resetStats();
    setStatus(`Difficulty set to ${settings[selectedMode].label}.`);
  });
});

startBtn.addEventListener("click", startGame);

updateDifficultyUI();
resetStats();
