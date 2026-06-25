# 🚇 Metro Surf: 3D Cyberpunk Endless Runner

A high-performance, responsive 3D endless runner game inspired by *Subway Surfers* and set in a glowing neon-cyberpunk subway tunnel. Built from scratch with **Vanilla JavaScript ES6 modules**, **Three.js (WebGL)**, and **Web Audio API** oscillators for 100% procedural sound synthesis.

---

## 🌟 Key Features

*   **Responsive 3D WebGL Canvas:** Smooth performance on mobile and desktop devices with real-time responsive scaling.
*   **Procedural Track Recycling:** A memory-efficient segment recycler that continuously spawns rails, walls, columns, and neon archways ahead of the runner.
*   **Dynamic Obstacles:**
    *   *Subway Trains:* Both stationary and moving trains rushing towards the player.
    *   *Low Hurdles:* Roadblock gates that the player must jump over.
    *   *High Barriers:* Overhead warning signs that require the player to roll/slide under.
*   **Arcade Power-Ups:**
    *   🧲 **Coin Magnet:** Automatically pulls gold coins from adjacent lanes within 16 units.
    *   🛡️ **Invincibility Shield:** Absorbs a single collision hit and grants temporary invulnerability.
    *   ⚡ **Score Multiplier:** Temporarily doubles the current run's scoring rate.
*   **Interactive Particle Sparks:** A bright 3D physics-based particle system that triggers colorful fading bursts upon collecting items (gold for coins, cyan for shields, purple for multipliers).
*   **Chasing AI Inspector & Guard Dog:** A blocky security guard and his trotting guard dog chase the player. Stumbling on side-rails causes the guard to sprint closer, and a second stumble while he is near results in an immediate capture.
*   **Daily Missions & Multipliers:** Rotational missions (e.g., run a target distance without crashing, collect coins) tracked in `localStorage`. Completing missions permanently upgrades your base score multiplier.
*   **Glassmorphic UI Overlay:** Modern menus featuring translucent dark panels, glowing cyber borders, sliding configurations, and responsive touch-swipe guides for mobile users.
*   **Local High Score Leaderboards:** Sorts and persists top runs locally with custom usernames.
*   **Synthesized Audio Engine:** Synthesizes retro sound effects and an arpeggiated music loop procedurally in the browser—no bulky audio assets required.

---

## 🎮 Game Controls

| Action | Keyboard Input | Touch Gesture |
| :--- | :--- | :--- |
| **Move Left** | `A` or `Left Arrow` | Swipe Left |
| **Move Right** | `D` or `Right Arrow` | Swipe Right |
| **Jump** | `W` or `Up Arrow` or `Space` | Swipe Up |
| **Roll / Slide** | `S` or `Down Arrow` | Swipe Down |
| **Pause / Resume** | `Escape` or `P` | Pause Button (HUD) |

---

## 🛠️ Tech Stack

*   **Core:** HTML5 / Vanilla CSS3 (Glassmorphism + Neon animations)
*   **Language:** JavaScript (ES6 Modules)
*   **Graphics:** [Three.js](https://threejs.org/) (WebGL rendering, materials, lights, shadows, and fog)
*   **Effects:** [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) (High score celebration)
*   **Audio:** Web Audio API (real-time synthesizer nodes)
*   **Build Tool:** Vite

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Clone the Repository
```bash
git clone https://github.com/DeepMag15/MetroSurf.git
cd MetroSurf
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Vite will start the server, typically at [http://localhost:5173/](http://localhost:5173/). Open this URL in your web browser.

### 4. Build for Production
```bash
npm run build
```
This compiles the application assets into a highly compressed production-ready bundle within the `dist` directory.
