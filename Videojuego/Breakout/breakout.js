/**
 * Breakout Game
 * Based on Pong logic from class.
 * 
 * Features:
 * - Ball and paddle collision system (AABB)
 * - Destructible brick grid (configurable rows/columns)
 * - Lives system (3 lives)
 * - Win and Game Over conditions
 * - Sound effects using Web Audio API
 * 
 * Author: Juan Carlos Luz Gallardo - A01028527
 */

"use strict";

// BREAKOUT
const canvasWidth = 800;
const canvasHeight = 600;

// SOUND MANAGER
// Using Web Audio API instead of <audio> tags because it provides better control
// over timing and allows us to generate tones programmatically without external files
class SoundManager {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Keep volume low to avoid being annoying during gameplay
    this.masterVolume = 0.3;
  }

  playTone(frequency, duration, type = 'sine', volume = 1.0) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(this.masterVolume * volume, this.audioContext.currentTime);
    // Fade out the sound to avoid abrupt clicks at the end
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  wallBounce() {
    this.playTone(440, 0.05, 'square', 0.3);
  }

  paddleHit() {
    this.playTone(523.25, 0.08, 'triangle', 0.5);
  }

  brickBreak() {
    // Two-tone sequence creates a more satisfying impact sound
    this.playTone(659.25, 0.1, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(783.99, 0.1, 'sawtooth', 0.3), 50);
  }

  ballLaunch() {
    // Ascending pitch gives a sense of upward motion
    this.playTone(392, 0.1, 'sine', 0.4);
    setTimeout(() => this.playTone(523.25, 0.1, 'sine', 0.4), 80);
  }

  loseLife() {
    // Descending pitch conveys a negative event
    this.playTone(220, 0.3, 'sawtooth', 0.6);
    setTimeout(() => this.playTone(185, 0.3, 'sawtooth', 0.5), 150);
  }

  gameOver() {
    this.playTone(196, 0.2, 'square', 0.5);
    setTimeout(() => this.playTone(174.61, 0.2, 'square', 0.5), 200);
    setTimeout(() => this.playTone(146.83, 0.4, 'square', 0.6), 400);
  }

  win() {
    // Four-note ascending melody creates a triumphant feeling
    this.playTone(523.25, 0.15, 'sine', 0.5);
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.5), 150);
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.5), 300);
    setTimeout(() => this.playTone(1046.5, 0.3, 'sine', 0.6), 450);
  }
}

// Create singleton instance to avoid recreating AudioContext
// which is expensive and has browser limits
const soundManager = new SoundManager();

let canvas;
let ctx;
// Track previous frame time to calculate smooth deltaTime
let oldTime = 0;

// HTML
let livesElement;
let scoreElement;
let remainingElement;
let messageElement;
let restartBtn;

// Config
// Centralized config makes tweaking gameplay balance much easier
const config = {
  paddleSpeed: 0.7,
  ballSpeed: 0.5,
  brickRows: 5,
  brickCols: 8,
  brickWidth: 80,
  brickHeight: 25,
  brickPadding: 10,
  brickOffsetTop: 70,
  brickOffsetLeft: 35,
  maxLives: 3
};

// Helper Classes
// Vector class simplifies 2D math and makes physics code more readable
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  plus(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  times(n) {
    return new Vector(this.x * n, this.y * n);
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const mag = this.magnitude();
    // Prevent division by zero which would cause NaN values
    if (mag === 0) return new Vector(0, 0);
    return new Vector(this.x / mag, this.y / mag);
  }
}

class GameObject {
  constructor(position, width, height, color) {
    this.position = position;
    this.width = width;
    this.height = height;
    this.color = color;
    // Store half dimensions to avoid repeated division during collision checks
    this.halfSize = new Vector(width / 2, height / 2);
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.halfSize.x,
      this.position.y - this.halfSize.y,
      this.width,
      this.height
    );
  }
}

class Ball extends GameObject {
  constructor(position, width, height, color) {
    super(position, width, height, color);
    this.velocity = new Vector(0, 0);
  }

  update(deltaTime) {
    // Normalize velocity to prevent speed increase from diagonal movement
    // and maintain consistent ball speed
    if (this.velocity.magnitude() > 0) {
      this.velocity = this.velocity.normalize().times(config.ballSpeed);
    }
    this.position = this.position.plus(this.velocity.times(deltaTime));
  }

  reset() {
    this.position = new Vector(canvasWidth / 2, canvasHeight - 70);
    this.velocity = new Vector(0, 0);
  }

  serve() {
    // Random horizontal component adds variety to each launch
    this.velocity = new Vector(Math.random() > 0.5 ? 0.35 : -0.35, -0.5);
    soundManager.ballLaunch();
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

class Paddle extends GameObject {
  constructor(position, width, height, color) {
    super(position, width, height, color);
    this.velocity = new Vector(0, 0);
    // Array allows handling multiple keys pressed simultaneously
    this.keys = [];

    this.motion = {
      left: { axis: "x", sign: -1 },
      right: { axis: "x", sign: 1 }
    };
  }

  update(deltaTime) {
    // Reset velocity each frame to avoid accumulation
    this.velocity.x = 0;
    this.velocity.y = 0;

    // Aggregate all active key inputs
    for (const direction of this.keys) {
      const axis = this.motion[direction].axis;
      const sign = this.motion[direction].sign;
      this.velocity[axis] += sign;
    }

    this.velocity = this.velocity.normalize().times(config.paddleSpeed);
    this.position = this.position.plus(this.velocity.times(deltaTime));

    this.clampWithinCanvas();
  }

  clampWithinCanvas() {
    if (this.position.x - this.halfSize.x < 0) {
      this.position.x = this.halfSize.x;
    }
    if (this.position.x + this.halfSize.x > canvasWidth) {
      this.position.x = canvasWidth - this.halfSize.x;
    }
  }
}

// Helper Functions
// AABB (Axis-Aligned Bounding Box) collision detection
// Fast and sufficient for rectangular objects in this game
function boxOverlap(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < obj1.halfSize.x + obj2.halfSize.x &&
    Math.abs(obj1.position.y - obj2.position.y) < obj1.halfSize.y + obj2.halfSize.y
  );
}


// Game
class Game {
  constructor() {
    this.lives = config.maxLives;
    this.destroyedBlocks = 0;
    this.gameOver = false;
    this.win = false;

    this.initObjects();
    this.createEventListeners();
    this.updateHUD();
  }

  initObjects() {
    this.background = new GameObject(
      new Vector(canvasWidth / 2, canvasHeight / 2),
      canvasWidth,
      canvasHeight,
      "#0b1020"
    );

    this.paddle = new Paddle(
      new Vector(canvasWidth / 2, canvasHeight - 30),
      120,
      20,
      "white"
    );

    this.ball = new Ball(
      new Vector(canvasWidth / 2, canvasHeight - 70),
      20,
      20,
      "#38bdf8"
    );

    this.bricks = [];
    this.createBricks();
  }

  createBricks() {
    // Color palette creates visual distinction between rows
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

    for (let row = 0; row < config.brickRows; row++) {
      for (let col = 0; col < config.brickCols; col++) {
        const x = config.brickOffsetLeft + col * (config.brickWidth + config.brickPadding);
        const y = config.brickOffsetTop + row * (config.brickHeight + config.brickPadding);

        const brick = new GameObject(
          new Vector(x + config.brickWidth / 2, y + config.brickHeight / 2),
          config.brickWidth,
          config.brickHeight,
          colors[row % colors.length]
        );

        brick.active = true;
        this.bricks.push(brick);
      }
    }
  }

  update(deltaTime) {
    if (this.gameOver || this.win) return;

    this.paddle.update(deltaTime);
    this.ball.update(deltaTime);

    this.handleWallCollisions();
    this.handlePaddleCollision();
    this.handleBrickCollisions();
    this.checkBottomCollision();
    this.checkWin();
  }

  handleWallCollisions() {
    if (this.ball.position.x - this.ball.halfSize.x < 0) {
      this.ball.position.x = this.ball.halfSize.x;
      this.ball.velocity.x *= -1;
      soundManager.wallBounce();
    }

    if (this.ball.position.x + this.ball.halfSize.x > canvasWidth) {
      this.ball.position.x = canvasWidth - this.ball.halfSize.x;
      this.ball.velocity.x *= -1;
      soundManager.wallBounce();
    }

    if (this.ball.position.y - this.ball.halfSize.y < 0) {
      this.ball.position.y = this.ball.halfSize.y;
      this.ball.velocity.y *= -1;
      soundManager.wallBounce();
    }
  }

  handlePaddleCollision() {
    // Check velocity.y > 0 to prevent double collision when ball is on paddle
    if (boxOverlap(this.ball, this.paddle) && this.ball.velocity.y > 0) {
      this.ball.velocity.y *= -1;

      // Modify horizontal velocity based on hit position for player control
      // Hitting edges sends ball at sharper angles
      const offset = (this.ball.position.x - this.paddle.position.x) / this.paddle.halfSize.x;
      this.ball.velocity.x = offset;
      soundManager.paddleHit();
    }
  }

  handleBrickCollisions() {
    for (let brick of this.bricks) {
      if (brick.active && boxOverlap(this.ball, brick)) {
        brick.active = false;
        this.ball.velocity.y *= -1;
        this.destroyedBlocks++;
        this.updateHUD();
        soundManager.brickBreak();
        // Break to handle only one collision per frame, preventing tunneling bugs
        break;
      }
    }
  }

  checkBottomCollision() {
    if (this.ball.position.y - this.ball.halfSize.y > canvasHeight) {
      this.lives--;
      this.updateHUD();

      if (this.lives <= 0) {
        this.gameOver = true;
        messageElement.textContent = "GAME OVER";
        soundManager.gameOver();
      } else {
        this.ball.reset();
        soundManager.loseLife();
      }
    }
  }

  checkWin() {
    const remaining = this.bricks.filter(brick => brick.active).length;
    if (remaining === 0) {
      this.win = true;
      messageElement.textContent = "YOU WIN!";
      soundManager.win();
    }
  }

  draw(ctx) {
    this.background.draw(ctx);

    for (let brick of this.bricks) {
      if (brick.active) {
        brick.draw(ctx);
      }
    }

    this.paddle.draw(ctx);
    this.ball.draw(ctx);

    if (this.gameOver) {
      this.drawCenterMessage(ctx, "GAME OVER", "#ef4444");
    }

    if (this.win) {
      this.drawCenterMessage(ctx, "YOU WIN!", "#22c55e");
    }
  }

  drawCenterMessage(ctx, text, color) {
    ctx.fillStyle = color;
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
    ctx.textAlign = "start";
  }

  updateHUD() {
    livesElement.textContent = this.lives;
    scoreElement.textContent = this.destroyedBlocks;
    remainingElement.textContent = this.bricks.filter(brick => brick.active).length;
  }

  addKey(direction) {
    // Prevent duplicate entries from repeated keydown events
    if (!this.paddle.keys.includes(direction)) {
      this.paddle.keys.push(direction);
    }
  }

  delKey(direction) {
    const index = this.paddle.keys.indexOf(direction);
    if (index !== -1) {
      this.paddle.keys.splice(index, 1);
    }
  }

  createEventListeners() {
    window.addEventListener("keydown", (event) => {
      // Support both arrow keys and WASD for accessibility
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        this.addKey("left");
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        this.addKey("right");
      }

      if (event.code === "Space") {
        if (!this.gameOver && !this.win && this.ball.velocity.magnitude() === 0) {
          this.ball.serve();
        }
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        this.delKey("left");
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        this.delKey("right");
      }
    });
  }

  resetGame() {
    this.lives = config.maxLives;
    this.destroyedBlocks = 0;
    this.gameOver = false;
    this.win = false;
    messageElement.textContent = "";

    this.ball.reset();
    this.paddle.position = new Vector(canvasWidth / 2, canvasHeight - 30);
    this.paddle.keys = [];

    this.bricks = [];
    this.createBricks();
    this.updateHUD();
  }
}

let game;

function main() {
  canvas = document.getElementById("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx = canvas.getContext("2d");

  livesElement = document.getElementById("lives");
  scoreElement = document.getElementById("score");
  remainingElement = document.getElementById("remaining");
  messageElement = document.getElementById("message");
  restartBtn = document.getElementById("restartBtn");

  game = new Game();

  restartBtn.addEventListener("click", () => {
    game.resetGame();
  });

  drawScene(0);
}

// Main game loop using requestAnimationFrame for smooth 60fps rendering
function drawScene(newTime) {
  // DeltaTime ensures consistent movement speed regardless of frame rate
  const deltaTime = newTime - oldTime;
  oldTime = newTime;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  game.update(deltaTime);
  game.draw(ctx);

  requestAnimationFrame(drawScene);
}