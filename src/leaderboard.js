/* ==========================================
   METRO SURF - LOCAL LEADERBOARD SYSTEM
   ========================================== */

const DEFAULT_LEADERBOARD = [
  { name: 'Jake', score: 250000, coins: 1200, date: 'Classic' },
  { name: 'Tricky', score: 180000, coins: 850, date: 'Classic' },
  { name: 'Fresh', score: 120000, coins: 600, date: 'Classic' },
  { name: 'Spike', score: 80000, coins: 400, date: 'Classic' },
  { name: 'Yutani', score: 50000, coins: 250, date: 'Classic' }
];

class LeaderboardManager {
  constructor() {
    this.scores = [];
  }

  init() {
    this.loadScores();
  }

  loadScores() {
    const saved = localStorage.getItem('ms_leaderboard');
    if (saved) {
      this.scores = JSON.parse(saved);
    } else {
      this.scores = [...DEFAULT_LEADERBOARD];
      this.saveScores();
    }
  }

  saveScores() {
    localStorage.setItem('ms_leaderboard', JSON.stringify(this.scores));
  }

  // Returns true if this is a new high score for the user (beats their personal best)
  checkHighScore(newScore) {
    const currentBest = this.getHighScore();
    return newScore > currentBest;
  }

  getHighScore() {
    // Return highest score in the list
    if (this.scores.length === 0) return 0;
    return Math.max(...this.scores.map(s => s.score));
  }

  // Try to submit a score
  submitScore(name, score, coins) {
    const newEntry = {
      name: name || 'Anonymous',
      score: parseInt(score) || 0,
      coins: parseInt(coins) || 0,
      date: new Date().toLocaleDateString()
    };

    this.scores.push(newEntry);
    
    // Sort descending by score, then coins
    this.scores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.coins - a.coins;
    });

    // Keep top 8 scores
    this.scores = this.scores.slice(0, 8);
    this.saveScores();
  }

  reset() {
    this.scores = [...DEFAULT_LEADERBOARD];
    this.saveScores();
  }

  // Render scores directly to index.html table body
  renderTable(tbodyElement, currentUserScore = null) {
    if (!tbodyElement) return;

    tbodyElement.innerHTML = '';

    this.scores.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      
      // Check if this row matches the user's just-completed score
      if (currentUserScore && entry.score === currentUserScore.score && entry.name === currentUserScore.name) {
        tr.classList.add('current-user-row');
      }

      // Rank column with custom rank badge styling
      const rank = idx + 1;
      let rankDisplay = `<span class="rank-badge">${rank}</span>`;
      if (rank === 1) rankDisplay = `<span class="rank-badge rank-1">1</span>`;
      else if (rank === 2) rankDisplay = `<span class="rank-badge rank-2">2</span>`;
      else if (rank === 3) rankDisplay = `<span class="rank-badge rank-3">3</span>`;

      tr.innerHTML = `
        <td>${rankDisplay}</td>
        <td><strong>${entry.name}</strong></td>
        <td>${entry.score.toLocaleString()}</td>
        <td>🪙 ${entry.coins.toLocaleString()}</td>
      `;

      tbodyElement.appendChild(tr);
    });
  }
}

export const leaderboard = new LeaderboardManager();
export default leaderboard;
