/* ==========================================
   METRO SURF - MISSION & ACHIEVEMENT SYSTEM
   ========================================== */

const MISSIONS_POOL = [
  { id: 'run_500', type: 'distance', target: 500, desc: 'Run 500 meters in a single run', reward: 200 },
  { id: 'run_1000', type: 'distance', target: 1000, desc: 'Run 1,000 meters in a single run', reward: 500 },
  { id: 'coins_50', type: 'coins_run', target: 50, desc: 'Collect 50 coins in a single run', reward: 150 },
  { id: 'coins_150', type: 'coins_run', target: 150, desc: 'Collect 150 coins in a single run', reward: 400 },
  { id: 'total_coins_300', type: 'total_coins', target: 300, desc: 'Collect 300 coins across all runs', reward: 300 },
  { id: 'powerups_3', type: 'powerups', target: 3, desc: 'Grab 3 power-ups in a single run', reward: 250 },
  { id: 'shield_2', type: 'shield', target: 2, desc: 'Activate the shield 2 times', reward: 200 },
  { id: 'magnet_2', type: 'magnet', target: 2, desc: 'Activate the magnet 2 times', reward: 200 },
  { id: 'no_crash_300', type: 'no_crash', target: 300, desc: 'Run 300 meters without hitting anything', reward: 350 }
];

class MissionsManager {
  constructor() {
    this.activeMissions = [];
    this.totalCompletedCount = 0; // Each completed mission adds +1 to base multiplier
    this.totalCoins = 0;
    this.onMissionCompletedCallback = null;
  }

  init(onCompletedCallback) {
    this.onMissionCompletedCallback = onCompletedCallback;
    this.loadState();
  }

  loadState() {
    // Load coins
    this.totalCoins = parseInt(localStorage.getItem('ms_total_coins')) || 0;
    this.totalCompletedCount = parseInt(localStorage.getItem('ms_completed_missions')) || 0;

    // Load active missions
    const savedMissions = localStorage.getItem('ms_active_missions');
    const savedDate = localStorage.getItem('ms_missions_date');
    const today = new Date().toDateString();

    if (savedMissions && savedDate === today) {
      this.activeMissions = JSON.parse(savedMissions);
    } else {
      // Regenerate daily missions
      this.generateDailyMissions();
      localStorage.setItem('ms_missions_date', today);
    }
  }

  saveState() {
    localStorage.setItem('ms_total_coins', this.totalCoins);
    localStorage.setItem('ms_completed_missions', this.totalCompletedCount);
    localStorage.setItem('ms_active_missions', JSON.stringify(this.activeMissions));
  }

  generateDailyMissions() {
    // Select 3 random unique missions from the pool
    const shuffled = [...MISSIONS_POOL].sort(() => 0.5 - Math.random());
    this.activeMissions = shuffled.slice(0, 3).map(m => ({
      ...m,
      progress: 0,
      completed: false
    }));
    this.saveState();
  }

  // Update progress for missions of a specific type
  updateProgress(type, amount, isIncremental = true) {
    let stateChanged = false;

    this.activeMissions.forEach(m => {
      if (m.completed) return;

      if (m.type === type) {
        if (isIncremental) {
          m.progress += amount;
        } else {
          // Absolute value update (like single-run distance)
          m.progress = Math.max(m.progress, amount);
        }

        // Check for completion
        if (m.progress >= m.target) {
          m.progress = m.target;
          m.completed = true;
          this.totalCompletedCount++;
          this.totalCoins += m.reward;
          stateChanged = true;

          // Trigger screen alert
          if (this.onMissionCompletedCallback) {
            this.onMissionCompletedCallback(m);
          }
        }
      }
    });

    if (stateChanged) {
      this.saveState();
    }
  }

  // Get current score multiplier
  getMultiplier() {
    // Base multiplier starts at 1, each completed mission adds +1
    return 1 + this.totalCompletedCount;
  }

  addTotalCoins(amount) {
    this.totalCoins += amount;
    this.updateProgress('total_coins', amount, true);
    this.saveState();
  }
}

export const missions = new MissionsManager();
export default missions;
