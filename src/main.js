/* ==========================================
   METRO SURF - MAIN APPLICATION ENTRYPOINT
   ========================================== */

import './style.css';
import game from './game.js';
import audio from './audio.js';
import renderer from './renderer.js';
import missions from './missions.js';
import leaderboard from './leaderboard.js';
import gestureController from './gesture/GestureController.js';

function setupApp() {
  // 1. Initialize the Core Game Coordinator
  game.init();

  // 2. DOM Elements for Panel toggles
  const mainMenu = document.getElementById('main-menu');
  const leaderboardPanel = document.getElementById('leaderboard-panel');
  const missionsPanel = document.getElementById('missions-panel');
  const settingsPanel = document.getElementById('settings-panel');
  
  // Game screens
  const pauseScreen = document.getElementById('pause-screen');
  const gameOverScreen = document.getElementById('game-over-screen');

  // --- BUTTON CLICKS WIREUP ---

  // Main menu actions
  document.getElementById('btn-play').addEventListener('click', () => {
    game.startGame();
  });

  document.getElementById('btn-missions').addEventListener('click', () => {
    renderMissionsList();
    missionsPanel.classList.add('active');
  });

  document.getElementById('btn-leaderboard').addEventListener('click', () => {
    renderLeaderboardList();
    leaderboardPanel.classList.add('active');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPanel.classList.add('active');
  });

  // Close buttons
  document.getElementById('btn-close-missions').addEventListener('click', () => {
    missionsPanel.classList.remove('active');
  });

  document.getElementById('btn-close-leaderboard').addEventListener('click', () => {
    leaderboardPanel.classList.remove('active');
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsPanel.classList.remove('active');
  });

  document.getElementById('btn-back-settings').addEventListener('click', () => {
    settingsPanel.classList.remove('active');
  });

  // HUD pause button
  document.getElementById('btn-hud-pause').addEventListener('click', (e) => {
    e.stopPropagation();
    game.pauseGame();
  });

  // Pause screen actions
  document.getElementById('btn-resume').addEventListener('click', () => {
    game.resumeGame();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    game.startGame();
    pauseScreen.classList.remove('active');
  });

  document.getElementById('btn-quit').addEventListener('click', () => {
    game.quitToMenu();
  });

  // Game over actions
  document.getElementById('btn-play-again').addEventListener('click', () => {
    game.startGame();
  });

  document.getElementById('btn-go-menu').addEventListener('click', () => {
    game.quitToMenu();
  });

  // Leaderboard reset
  document.getElementById('btn-reset-leaderboard').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all high scores back to defaults?')) {
      leaderboard.reset();
      renderLeaderboardList();
    }
  });

  // --- SETTINGS INPUTS CHANGE ---

  const sfxToggle = document.getElementById('setting-audio');
  sfxToggle.addEventListener('change', (e) => {
    audio.setSfxEnabled(e.target.checked);
  });

  const musicToggle = document.getElementById('setting-music');
  musicToggle.addEventListener('change', (e) => {
    audio.setMusicEnabled(e.target.checked);
  });

  const qualitySelect = document.getElementById('setting-quality');
  qualitySelect.addEventListener('change', (e) => {
    renderer.setQuality(e.target.value);
  });

  // Initialize toggles from defaults
  audio.setSfxEnabled(sfxToggle.checked);
  audio.setMusicEnabled(musicToggle.checked);
  renderer.setQuality(qualitySelect.value);

  // --- GESTURE CONTROLS SETTINGS WIREUP ---
  const gestureEnable = document.getElementById('setting-gesture-enable');
  const gesturePreview = document.getElementById('setting-gesture-preview');
  const gestureSensitivity = document.getElementById('setting-gesture-sensitivity');
  const gestureCooldown = document.getElementById('setting-gesture-cooldown');
  const gestureConfidence = document.getElementById('setting-gesture-confidence');
  
  const valSensitivity = document.getElementById('val-gesture-sensitivity');
  const valCooldown = document.getElementById('val-gesture-cooldown');
  const valConfidence = document.getElementById('val-gesture-confidence');
  
  const rowGesturePreview = document.getElementById('row-gesture-preview');

  function updateGesturePreviewRow() {
    if (gestureEnable.checked) {
      rowGesturePreview.style.display = 'flex';
    } else {
      rowGesturePreview.style.display = 'none';
    }
  }

  gestureEnable.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    gestureController.updateSettings({ isEnabled });
    updateGesturePreviewRow();
  });

  gesturePreview.addEventListener('change', (e) => {
    gestureController.updateSettings({ isPreviewVisible: e.target.checked });
  });

  gestureSensitivity.addEventListener('input', (e) => {
    const val = e.target.value;
    valSensitivity.innerText = val;
    gestureController.updateSettings({ sensitivity: val });
  });

  gestureCooldown.addEventListener('input', (e) => {
    const val = e.target.value;
    valCooldown.innerText = `${val}ms`;
    gestureController.updateSettings({ cooldown: val });
  });

  gestureConfidence.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(2);
    valConfidence.innerText = val;
    gestureController.updateSettings({ confidenceThreshold: val });
  });

  // Toggle button on the webcam feed itself
  const toggleBtn = document.getElementById('btn-toggle-webcam-visibility');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = gesturePreview.checked;
      gesturePreview.checked = !current;
      gesturePreview.dispatchEvent(new Event('change'));
    });
  }

  // Set initial settings based on controls
  updateGesturePreviewRow();
  gestureController.updateSettings({
    isEnabled: gestureEnable.checked,
    isPreviewVisible: gesturePreview.checked,
    sensitivity: gestureSensitivity.value,
    cooldown: gestureCooldown.value,
    confidenceThreshold: gestureConfidence.value
  });

  // --- RENDER HELPERS ---

  function renderMissionsList() {
    const list = document.getElementById('missions-list');
    list.innerHTML = '';
    
    // Display base multiplier
    document.getElementById('mission-base-mult').innerText = missions.getMultiplier();

    missions.activeMissions.forEach(m => {
      const card = document.createElement('div');
      card.className = `mission-card ${m.completed ? 'completed' : ''}`;
      
      const pct = (m.progress / m.target) * 100;
      card.innerHTML = `
        <div class="mission-card-header">
          <span class="mission-title">${m.desc}</span>
          <span class="mission-reward">${m.completed ? 'Completed! +x1 Mult' : `Reward: 🪙${m.reward}`}</span>
        </div>
        <div class="mission-progress-bar-container">
          <div class="mission-progress-bar" style="width: ${pct}%"></div>
        </div>
        <div class="mission-progress-text">
          Progress: ${Math.floor(m.progress)} / ${m.target}
        </div>
      `;
      list.appendChild(card);
    });
  }

  function renderLeaderboardList() {
    const tbody = document.getElementById('leaderboard-body');
    leaderboard.renderTable(tbody);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}
