/* ==========================================
   METRO SURF - MAIN GAME PLAYPLAY COORDINATOR
   ========================================== */

import * as THREE from 'three';
import renderer from './renderer.js';
import trackManager from './track.js';
import player from './player.js';
import spawner from './spawner.js';
import enemy from './enemy.js';
import audio from './audio.js';
import input from './input.js';
import missions from './missions.js';
import leaderboard from './leaderboard.js';
import gestureController from './gesture/GestureController.js';

const STATE_MENU = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;
const STATE_GAMEOVER = 3;

class GameCoordinator {
  constructor() {
    this.state = STATE_MENU;
    
    // Gameplay Stats
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    
    // Speed variables
    this.speed = 12.0; // Units per second
    this.startSpeed = 12.0;
    this.maxSpeed = 28.0;
    this.speedIncrement = 0.04; // How fast the game speeds up
    
    // Timing
    this.clock = new THREE.Clock();
    this.gameTime = 0;
    this.invincibilityTimer = 0; // Temporary safety window after stumbles
    
    // Tracking for stats
    this.powerupsCollectedInRun = 0;
    this.noCrashDistTracker = 0;

    // DOM Elements Cache
    this.dom = {};
  }

  init() {
    // 1. Cache UI DOM elements
    this.cacheDomElements();

    // 2. Initialize engines
    const container = document.getElementById('game-container');
    renderer.init(container);
    trackManager.onSegmentRecycled = (z) => spawner.spawnForSegment(z);
    trackManager.init(renderer.scene);
    spawner.init(renderer.scene);
    enemy.init(renderer.scene);
    
    // Attach player to scene
    renderer.scene.add(player.group);

    // Initialize inputs and wire callbacks
    input.init();
    this.setupInputCallbacks();

    // Initialize hand gesture controllers
    const videoElement = document.getElementById('webcam-video');
    const canvasElement = document.getElementById('webcam-canvas');
    gestureController.init({
      videoElement,
      canvasElement,
      onLeft: () => {
        if (this.state === STATE_PLAYING) player.moveLeft();
      },
      onRight: () => {
        if (this.state === STATE_PLAYING) player.moveRight();
      },
      onJump: () => {
        if (this.state === STATE_PLAYING) player.jump();
      },
      onRoll: () => {
        if (this.state === STATE_PLAYING) player.roll();
      },
      onPause: () => {
        if (this.state === STATE_PLAYING) this.pauseGame();
      },
      onResume: () => {
        if (this.state === STATE_PAUSED) this.resumeGame();
      }
    }).catch(err => console.error('Failed to initialize gesture controls:', err));

    // Initialize local storage systems
    missions.init((completedMission) => this.showMissionFloater(completedMission));
    leaderboard.init();

    // 3. Listeners
    window.addEventListener('resize', () => {
      renderer.resize(container.clientWidth, container.clientHeight);
    });

    // Populate static stats on start screen
    this.updateMenuStats();

    // 4. Start the global render loop
    this.clock.getDelta(); // Clear clock
    this.animate();
  }

  cacheDomElements() {
    this.dom.mainMenu = document.getElementById('main-menu');
    this.dom.pauseScreen = document.getElementById('pause-screen');
    this.dom.gameOverScreen = document.getElementById('game-over-screen');
    this.dom.hud = document.getElementById('game-hud');
    this.dom.leaderboard = document.getElementById('leaderboard-panel');
    this.dom.missions = document.getElementById('missions-panel');
    this.dom.settings = document.getElementById('settings-panel');
    
    this.dom.score = document.getElementById('hud-score');
    this.dom.multiplier = document.getElementById('hud-multiplier');
    this.dom.coins = document.getElementById('hud-coins');
    this.dom.distance = document.getElementById('hud-distance');
    this.dom.powerupTimers = document.getElementById('powerup-timers');
    
    // Audio toggles in settings
    this.dom.settingAudio = document.getElementById('setting-audio');
    this.dom.settingMusic = document.getElementById('setting-music');
    this.dom.settingQuality = document.getElementById('setting-quality');
  }

  setupInputCallbacks() {
    input.onLeft(() => {
      if (this.state === STATE_PLAYING) player.moveLeft();
    });
    input.onRight(() => {
      if (this.state === STATE_PLAYING) player.moveRight();
    });
    input.onJump(() => {
      if (this.state === STATE_PLAYING) player.jump();
    });
    input.onRoll(() => {
      if (this.state === STATE_PLAYING) player.roll();
    });
    input.onPause(() => {
      if (this.state === STATE_PLAYING) {
        this.pauseGame();
      } else if (this.state === STATE_PAUSED) {
        this.resumeGame();
      }
    });
  }

  updateMenuStats() {
    document.getElementById('menu-high-score').innerText = leaderboard.getHighScore().toLocaleString();
    document.getElementById('menu-total-coins').innerText = missions.totalCoins.toLocaleString();
  }

  // --- GAME STATES CONTROLLERS ---

  startGame() {
    this.state = STATE_PLAYING;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = this.startSpeed;
    this.gameTime = 0;
    this.invincibilityTimer = 0;
    this.powerupsCollectedInRun = 0;
    this.noCrashDistTracker = 0;

    // Reset models
    player.reset();
    trackManager.reset();
    spawner.reset();
    enemy.reset();

    // Setup active HUD
    this.dom.mainMenu.classList.remove('active');
    this.dom.gameOverScreen.classList.remove('active');
    this.dom.hud.classList.add('active');

    // Trigger audio music
    audio.startMusic();

    // Clear gesture history and apply 1.5s startup cooldown to prevent false pauses/swipes
    gestureController.resetState(1500);
  }

  pauseGame() {
    if (this.state !== STATE_PLAYING) return;
    this.state = STATE_PAUSED;
    this.dom.pauseScreen.classList.add('active');
    
    // Populate stats in pause screen
    document.getElementById('pause-score').innerText = Math.floor(this.score).toLocaleString();
    document.getElementById('pause-coins').innerText = this.coins.toLocaleString();
    
    audio.stopMusic();
  }

  resumeGame() {
    if (this.state !== STATE_PAUSED) return;
    this.state = STATE_PLAYING;
    this.dom.pauseScreen.classList.remove('active');
    this.clock.getDelta(); // Clear time delta
    audio.startMusic();

    // Clear gesture history and apply 1.0s resume cooldown to prevent false pauses/swipes
    gestureController.resetState(1000);
  }

  quitToMenu() {
    this.state = STATE_MENU;
    this.dom.pauseScreen.classList.remove('active');
    this.dom.gameOverScreen.classList.remove('active');
    this.dom.hud.classList.remove('active');
    this.dom.mainMenu.classList.add('active');
    
    this.updateMenuStats();
    audio.stopMusic();
  }

  gameOver(reason) {
    this.state = STATE_GAMEOVER;
    this.dom.hud.classList.remove('active');
    this.dom.gameOverScreen.classList.add('active');

    // Play crash sound
    audio.playGameOver();

    // Check if new High Score
    const isNewHighScore = leaderboard.checkHighScore(this.score);
    
    // Submit score to local leaderboard
    leaderboard.submitScore('Jake (You)', this.score, this.coins);
    
    // Save coins collected in this run to missions
    missions.addTotalCoins(this.coins);
    
    // Update daily missions absolute progress
    missions.updateProgress('distance', this.distance, false);
    missions.updateProgress('coins_run', this.coins, false);

    // Update Game Over panel items
    document.getElementById('game-over-reason').innerText = reason;
    document.getElementById('go-score').innerText = Math.floor(this.score).toLocaleString();
    document.getElementById('go-distance').innerText = `${Math.floor(this.distance)}m`;
    document.getElementById('go-coins').innerText = this.coins;
    document.getElementById('go-multiplier').innerText = `x${this.getCurrentMultiplier()}`;

    // High Score Badge
    const highscoreBadge = document.getElementById('go-new-highscore');
    if (isNewHighScore) {
      highscoreBadge.classList.remove('hidden');
      this.triggerConfetti();
    } else {
      highscoreBadge.classList.add('hidden');
    }

    // Render missions progress in the game over screen
    this.renderGameOverMissions();
  }

  renderGameOverMissions() {
    const listContainer = document.getElementById('go-missions-list');
    listContainer.innerHTML = '';

    missions.activeMissions.forEach(m => {
      const card = document.createElement('div');
      card.className = `mission-card ${m.completed ? 'completed' : ''}`;
      
      const pct = (m.progress / m.target) * 100;
      card.innerHTML = `
        <div class="mission-card-header">
          <span class="mission-title">${m.desc}</span>
          <span class="mission-reward">${m.completed ? '✓ DONE' : `+🪙${m.reward}`}</span>
        </div>
        <div class="mission-progress-bar-container">
          <div class="mission-progress-bar" style="width: ${pct}%"></div>
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  // Confetti celebration for High Score
  triggerConfetti() {
    import('canvas-confetti').then(module => {
      const confetti = module.default;
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }).catch(err => console.log('Confetti load error:', err));
  }

  // --- CORE GAME LOOP ---

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1); // Clamp delta to avoid massive leaps on frame drop
    const time = this.clock.getElapsedTime();

    if (this.state === STATE_PLAYING) {
      this.gameTime += dt;

      // 1. Move player forward (along negative Z axis)
      // The speed increases slowly over time
      this.speed = Math.min(this.speed + this.speedIncrement * dt, this.maxSpeed);
      
      // Update Z coordinate of player
      player.group.position.z -= this.speed * dt;
      
      // Calculate distance run (Z distance from start Z=-2)
      const prevDistance = this.distance;
      this.distance = Math.abs(player.group.position.z + 2);
      
      // Update missions incremental distance
      const distanceDelta = this.distance - prevDistance;
      if (this.invincibilityTimer <= 0) {
        this.noCrashDistTracker += distanceDelta;
        missions.updateProgress('no_crash', this.noCrashDistTracker, true);
      }

      // 2. Score calculation: score increases based on distance and current multiplier
      const mult = this.getCurrentMultiplier();
      this.score += this.speed * dt * 10 * mult;

      // 3. Update game entities
      player.update(dt, this.gameTime);
      trackManager.update(player.group.position.z);
      spawner.update(dt, player);
      enemy.update(dt, this.gameTime, player.group.position);

      // Handle safety temporary invincibility frame timer
      if (this.invincibilityTimer > 0) {
        this.invincibilityTimer -= dt;
        // Make player blink to show invincibility
        player.characterGroup.visible = Math.floor(this.gameTime * 15) % 2 === 0;
      } else {
        player.characterGroup.visible = true;
      }

      // 4. Collision Detection
      this.checkCollisions();

      // 5. Update HUD elements
      this.updateHud();

      // 6. Spawn items for new segments
      // If spawner generated items are far behind, segment recyclers will trigger spawners.
      // We listen to trackManager recycles. In track.js, segment recycling resets and shifts Z.
      // Let's hook into segment recycles!
      trackManager.segments.forEach(seg => {
        // If a segment was recently moved and has no obstacles generated yet at its new position:
        // We track this by checking if we have spawned items around this new Z.
        // To keep it simple, we check if the recycled Z matches any active spawned items.
        // We spawn items when the segment's front edge is generated.
        // An easier way: whenever a segment recycles in `trackManager`, we trigger `spawner.spawnForSegment(newZ)`.
        // Let's modify `track.js` or do it in the loop.
        // Since we want this decoupled, we can check if we need to spawn items for segment Z.
        // We store generated segment Z coordinates. Let's spawn when the segment is recycled.
        // To implement this, let's keep a set of spawned segment indices.
        // Better: let's modify track.js to trigger a spawn callback! Let's do it in track.js.
        // Wait, track.js has a recycle function. We can hook it up by assigning a callback:
        // `trackManager.onSegmentRecycled = (newZ) => spawner.spawnForSegment(newZ)`.
        // Let's set that up in init!
      });
    }

    // Render 3D Scene
    // For Menu state, we rotate or pan the camera slightly for a cool dynamic feel
    if (this.state === STATE_MENU) {
      // Let camera drift slightly
      renderer.camera.position.x = Math.sin(time * 0.5) * 1.0;
      renderer.camera.lookAt(new THREE.Vector3(0, 1.5, -5));
    } 
    else if (this.state === STATE_PLAYING) {
      // Camera smoothly follows player
      // Camera X coordinates follow player lanes with a delay
      renderer.camera.position.x = THREE.MathUtils.lerp(renderer.camera.position.x, player.group.position.x * 0.7, 6 * dt);
      renderer.camera.position.y = THREE.MathUtils.lerp(renderer.camera.position.y, player.group.position.y * 0.4 + 5, 5 * dt);
      renderer.camera.position.z = player.group.position.z + 8.5; // Offset behind player
      
      const lookAtTarget = new THREE.Vector3(
        player.group.position.x * 0.4,
        player.group.position.y * 0.2 + 1.2,
        player.group.position.z - 4.5
      );
      renderer.camera.lookAt(lookAtTarget);
    }

    renderer.render();
  }

  // --- COLLISION RESOLUTION ---

  checkCollisions() {
    const playerBB = player.getBoundingBox();

    // 1. Collectibles (Coins and Power-ups) - Iterating backwards to prevent array shifting index skips
    for (let i = spawner.collectibles.length - 1; i >= 0; i--) {
      const col = spawner.collectibles[i];
      if (playerBB.intersectsBox(col.boundingBox)) {
        let particleColor = 0xffd700; // Default gold

        // Collect!
        if (col.type === 'coin') {
          this.coins++;
          audio.playCoin();
        } 
        else if (col.type.startsWith('powerup_')) {
          const type = col.type.split('_')[1]; // magnet, shield, multiplier
          this.powerupsCollectedInRun++;
          
          if (type === 'shield') {
            player.activatePowerup('shield', 12.0);
            missions.updateProgress('shield', 1, true);
            particleColor = 0x00f0ff; // Cyan
          } else if (type === 'magnet') {
            player.activatePowerup('magnet', 10.0);
            missions.updateProgress('magnet', 1, true);
            particleColor = 0xffea00; // Yellow
          } else if (type === 'multiplier') {
            player.activatePowerup('multiplier', 10.0);
            particleColor = 0xbd00ff; // Purple
          }

          missions.updateProgress('powerups', 1, true);
        }

        // Spawn bright collection sparkles at the item's position
        spawner.spawnSparkles(col.mesh.position.x, col.mesh.position.y, col.mesh.position.z, particleColor);

        // Remove from scene and active arrays
        renderer.scene.remove(col.mesh);
        spawner.collectibles.splice(i, 1);
      }
    }

    // 2. Obstacles (Trains, low hurdles, high hurdles)
    if (this.invincibilityTimer > 0) return; // Ignore collisions during invincibility

    spawner.obstacles.forEach(obs => {
      if (playerBB.intersectsBox(obs.boundingBox)) {
        // We hit an obstacle!
        if (player.powerups.shield > 0) {
          // Shield absorbs the blow!
          player.powerups.shield = 0;
          player.deactivatePowerupVisual('shield');
          
          // Trigger invincibility so player can run through the barrier and get away
          this.invincibilityTimer = 1.6;
          this.noCrashDistTracker = 0; // Reset no-crash distance mission
          audio.playHit();
          
          // Move obstacle out of the way or delete it
          renderer.scene.remove(obs.mesh);
          const obsIdx = spawner.obstacles.indexOf(obs);
          if (obsIdx > -1) spawner.obstacles.splice(obsIdx, 1);
        } 
        else {
          // No Shield! Check if it's a side-rub (minor stumble) or head-on crash.
          // In Subway Surfers, if you hit a barrier side-on (e.g. while switching lanes),
          // the guard rushes up behind you. If you hit it front-on, you die immediately.
          
          // Calculate if collision is head-on.
          // If player's center is roughly aligned with the obstacle X lane, it's head-on.
          const xDiff = Math.abs(player.group.position.x - obs.mesh.position.x);
          
          if (xDiff > 0.85 && (obs.type === 'train' || obs.type === 'barrier_low' || obs.type === 'barrier_high')) {
            // Minor Side Collision (Lane switch rub)
            this.invincibilityTimer = 1.4;
            this.noCrashDistTracker = 0;
            audio.playHit();
            
            if (enemy.isClose()) {
              // Inspector catches you if he was already close!
              this.gameOver(`The inspector caught you stumbling!`);
            } else {
              // Trigger inspector to run close
              enemy.triggerStumble();
            }
          } 
          else {
            // Head-on crash! Death!
            let reason = 'You crashed into an obstacle!';
            if (obs.type === 'train') {
              reason = obs.isMoving ? 'You got ran over by a moving train!' : 'You slammed head-on into a static subway train!';
            } else if (obs.type === 'barrier_high') {
              reason = 'You forgot to slide under the high barrier warning sign!';
            } else if (obs.type === 'barrier_low') {
              reason = 'You tripped over a low track gate!';
            }
            this.gameOver(reason);
          }
        }
      }
    });
  }

  // --- HUD RENDERING & POWERUP BARS ---

  getCurrentMultiplier() {
    const base = missions.getMultiplier();
    const active2x = player.powerups.multiplier > 0 ? 2 : 1;
    return base * active2x;
  }

  updateHud() {
    this.dom.score.innerText = Math.floor(this.score).toString().padStart(6, '0');
    this.dom.multiplier.innerText = `x${this.getCurrentMultiplier()}`;
    this.dom.coins.innerText = this.coins;
    this.dom.distance.innerText = `${Math.floor(this.distance)}m`;

    // Active powerups progress bars rendering
    this.dom.powerupTimers.innerHTML = '';
    
    if (player.powerups.shield > 0) {
      const pct = (player.powerups.shield / 12.0) * 100;
      this.renderPowerupBar('shield-timer', '🛡️', pct);
    }
    if (player.powerups.magnet > 0) {
      const pct = (player.powerups.magnet / 10.0) * 100;
      this.renderPowerupBar('magnet-timer', '🧲', pct);
    }
    if (player.powerups.multiplier > 0) {
      const pct = (player.powerups.multiplier / 10.0) * 100;
      this.renderPowerupBar('mult-timer', '⚡ 2x', pct);
    }
  }

  renderPowerupBar(className, icon, percentage) {
    const timerDiv = document.createElement('div');
    timerDiv.className = `powerup-timer ${className}`;
    timerDiv.innerHTML = `
      <span class="p-icon">${icon}</span>
      <div class="p-bar-bg">
        <div class="p-bar" style="width: ${percentage}%"></div>
      </div>
    `;
    this.dom.powerupTimers.appendChild(timerDiv);
  }

  // --- FLOATER MISSION NOTIFICATION ---
  showMissionFloater(mission) {
    const floater = document.getElementById('mission-floater');
    document.getElementById('floater-mission-desc').innerText = mission.desc;
    
    // Play a chime/powerup sound
    audio.playPowerup();

    floater.classList.add('show');
    
    // Hide after 3.2 seconds
    setTimeout(() => {
      floater.classList.remove('show');
    }, 3200);
  }
}

export const game = new GameCoordinator();

export default game;
