const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#gameOverlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const soundButton = document.querySelector("#soundButton");
const helpButton = document.querySelector("#helpButton");
const helpMarkup = overlayText.innerHTML;
const helpTitle = overlayTitle.textContent;
const ASSET = "burger_dog_assets/";

const images = {
  dogLeft: image(`${ASSET}dog_left.png`),
  dogRight: image(`${ASSET}dog_right.png`),
  burger: image(`${ASSET}burger.png`),
};
const sounds = {
  bark: new Audio(`${ASSET}bark_sound.wav`),
  miss: new Audio(`${ASSET}miss_sound.wav`),
  music: new Audio(`${ASSET}bd_background_music.wav`),
};
sounds.music.loop = true;
sounds.music.volume = .38;

const keys = new Set();
let width = 800;
let height = 600;
let scale = 1;
let running = false;
let hasStarted = false;
let roundFinished = false;
let overlayMode = "start";
let soundEnabled = true;
let lastTime = 0;
let score = 0;
let burgerPoints = 0;
let burgersEaten = 0;
let lives = 3;
let boost = 100;
let burgerSpeed = 180;
let facing = "left";

const dog = { x: 368, y: 536, size: 64 };
const burger = { x: 200, y: -100, size: 32 };

function image(src) {
  const result = new Image();
  result.src = src;
  return result;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  width = rect.width;
  height = rect.height;
  scale = Math.max(.56, Math.min(width / 800, height / 600));
  dog.size = clamp(64 * scale, 46, 76);
  burger.size = clamp(32 * scale, 25, 40);
  dog.x = clamp(dog.x, 0, width - dog.size);
  dog.y = clamp(dog.y, hudHeight(), height - dog.size);
}

function hudHeight() {
  return clamp(100 * scale, 68, 110);
}

function play(name) {
  if (!soundEnabled) return;
  const sound = sounds[name];
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function resetDog() {
  dog.x = width / 2 - dog.size / 2;
  dog.y = height - dog.size;
}

function resetBurger(keepSpeed = false) {
  burger.x = Math.random() * Math.max(1, width - burger.size);
  burger.y = -Math.max(45, 100 * scale);
  if (!keepSpeed) burgerSpeed = 180 * Math.max(.78, scale);
}

function resetGame() {
  score = 0;
  burgerPoints = 0;
  burgersEaten = 0;
  lives = 3;
  boost = 100;
  roundFinished = false;
  resetDog();
  resetBurger();
}

function startGame() {
  resetGame();
  overlay.classList.remove("is-visible");
  startButton.textContent = "Tekrar oyna";
  running = true;
  hasStarted = true;
  overlayMode = "resume";
  lastTime = performance.now();
  if (soundEnabled) sounds.music.play().catch(() => {});
  requestAnimationFrame(loop);
}

function gameOver() {
  running = false;
  hasStarted = false;
  roundFinished = true;
  overlayMode = "restart";
  sounds.music.pause();
  overlayTitle.textContent = `Final skor: ${score.toLocaleString("tr-TR")}`;
  overlayText.textContent = `${burgersEaten} burger yakaladın. Rekorunu geliştirmek için yeniden başlayabilirsin.`;
  overlay.classList.add("is-visible");
}

function showHelp() {
  const canResume = hasStarted && !roundFinished;
  running = false;
  keys.clear();
  sounds.music.pause();
  overlayMode = canResume ? "resume" : "start";
  overlayTitle.textContent = helpTitle;
  overlayText.innerHTML = helpMarkup;
  startButton.textContent = canResume ? "Oyuna dön" : "Oyuna başla";
  overlay.classList.add("is-visible");
}

function handleOverlayAction() {
  if (overlayMode === "resume") {
    overlay.classList.remove("is-visible");
    running = true;
    lastTime = performance.now();
    if (soundEnabled) sounds.music.play().catch(() => {});
    requestAnimationFrame(loop);
    return;
  }
  startGame();
}

function update(dt) {
  const boosting = keys.has("Space") && boost > 0;
  const speed = (boosting ? 560 : 290) * scale;
  if (boosting) boost = Math.max(0, boost - 38 * dt);
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const up = keys.has("ArrowUp") || keys.has("KeyW");
  const down = keys.has("ArrowDown") || keys.has("KeyS");
  const diagonal = (left || right) && (up || down) ? Math.SQRT1_2 : 1;
  const move = speed * dt * diagonal;

  if (left) { dog.x -= move; facing = "left"; }
  if (right) { dog.x += move; facing = "right"; }
  if (up) dog.y -= move;
  if (down) dog.y += move;
  dog.x = clamp(dog.x, 0, width - dog.size);
  dog.y = clamp(dog.y, hudHeight(), height - dog.size);

  burger.y += burgerSpeed * dt;
  burgerPoints = Math.max(0, Math.floor((burgerSpeed / Math.max(.6, scale)) * (height - burger.y + 100 * scale) / 60));

  if (intersects(dog, burger)) {
    score += burgerPoints;
    burgersEaten += 1;
    boost = Math.min(100, boost + 25);
    burgerSpeed += 30 * Math.max(.72, scale);
    play("bark");
    resetBurger(true);
  } else if (burger.y > height) {
    lives -= 1;
    play("miss");
    boost = 100;
    resetDog();
    resetBurger();
    if (lives <= 0) gameOver();
  }
}

function intersects(a, b) {
  const pad = 5 * scale;
  return (
    a.x + pad < b.x + b.size &&
    a.x + a.size - pad > b.x &&
    a.y + pad < b.y + b.size &&
    a.y + a.size - pad > b.y
  );
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050301";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(burger.x, burger.y, 0, burger.x, burger.y, 180 * scale);
  glow.addColorStop(0, "rgba(246,170,54,.14)");
  glow.addColorStop(1, "rgba(246,170,54,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, hudHeight(), width, height - hudHeight());

  const font = clamp(23 * scale, 13, 28);
  ctx.font = `700 ${font}px Burger, ui-sans-serif, system-ui`;
  ctx.fillStyle = "#f6aa36";
  ctx.textBaseline = "top";
  ctx.fillText(`Burger: ${burgerPoints}`, 10, 8);
  ctx.fillText(`Skor: ${score}`, 10, 12 + font);
  ctx.textAlign = "center";
  ctx.font = `400 ${clamp(32 * scale, 17, 38)}px Burger, ui-sans-serif`;
  ctx.fillText("Burger Dog", width / 2, 7);
  ctx.font = `700 ${font}px Burger, ui-sans-serif`;
  ctx.fillText(`Yenen: ${burgersEaten}`, width / 2, 13 + font);
  ctx.textAlign = "right";
  ctx.fillText(`Can: ${lives}`, width - 10, 8);
  ctx.fillText(`Hız: ${Math.ceil(boost)}`, width - 10, 12 + font);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = Math.max(1, 3 * scale);
  ctx.beginPath();
  ctx.moveTo(0, hudHeight());
  ctx.lineTo(width, hudHeight());
  ctx.stroke();

  if (images.burger.complete) ctx.drawImage(images.burger, burger.x, burger.y, burger.size, burger.size);
  const dogImage = facing === "left" ? images.dogLeft : images.dogRight;
  if (dogImage.complete) ctx.drawImage(dogImage, dog.x, dog.y, dog.size, dog.size);

  const meterWidth = Math.min(width * .35, 220);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(width / 2 - meterWidth / 2, height - 12, meterWidth, 4);
  ctx.fillStyle = "#f6aa36";
  ctx.fillRect(width / 2 - meterWidth / 2, height - 12, meterWidth * boost / 100, 4);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, .034);
  lastTime = now;
  update(dt);
  draw();
  if (running) requestAnimationFrame(loop);
}

function setKey(code, active, button) {
  if (active) keys.add(code);
  else keys.delete(code);
  button?.classList.toggle("is-active", active);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("resize", resize);

document.querySelectorAll("[data-key]").forEach((button) => {
  const code = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    setKey(code, true, button);
    button.setPointerCapture?.(event.pointerId);
  };
  const release = (event) => {
    event.preventDefault();
    setKey(code, false, button);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

startButton.addEventListener("click", handleOverlayAction);
helpButton.addEventListener("click", showHelp);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "Ses açık" : "Ses kapalı";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  Object.values(sounds).forEach((sound) => { sound.muted = !soundEnabled; });
  if (soundEnabled && running) sounds.music.play().catch(() => {});
  else sounds.music.pause();
});

resize();
resetDog();
resetBurger();
draw();
