/* =========================================================================
   METRO SURF - GESTURE CONTROLLER COORDINATOR
   Manages hand tracking, draws the preview overlay, and triggers game controls.
   ========================================================================= */

import HandTracker from './HandTracker.js';
import GestureRecognizer from './GestureRecognizer.js';

class GestureController {
  constructor() {
    this.tracker = new HandTracker();
    this.recognizer = new GestureRecognizer();

    // DOM Elements
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;

    // Callbacks
    this.callbacks = {
      onLeft: null,
      onRight: null,
      onJump: null,
      onRoll: null,
      onPause: null,
      onResume: null
    };

    // State Settings
    this.isEnabled = false;
    this.isPreviewVisible = true;
    this.cooldown = 300; // ms
    this.lastGestureTime = 0;
    this.activeGesture = null;
    this.lastDetectionTime = 0;
    this.throttleInterval = 45; // Run inference at ~22 FPS to prevent blocking game loop thread

    // Animation frame handle
    this.frameId = null;

    // Hand Skeleton Connections map
    this.connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [9, 10], [10, 11], [11, 12],
      // Ring finger
      [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm base connects
      [5, 9], [9, 13], [13, 17]
    ];
  }

  /**
   * Initializes the gesture controller with necessary DOM elements and gameplay callbacks.
   */
  async init(options = {}) {
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext('2d');
    }

    // Bind action callbacks
    this.callbacks.onLeft = options.onLeft || null;
    this.callbacks.onRight = options.onRight || null;
    this.callbacks.onJump = options.onJump || null;
    this.callbacks.onRoll = options.onRoll || null;
    this.callbacks.onPause = options.onPause || null;
    this.callbacks.onResume = options.onResume || null;

    // Load HandLandmarker model
    try {
      await this.tracker.init();
      console.log('GestureController: MediaPipe initialization complete.');
    } catch (err) {
      console.error('GestureController: Failed to initialize tracking model.', err);
    }
  }

  /**
   * Set configuration values dynamically from settings panel.
   */
  updateSettings(settings = {}) {
    if (settings.isEnabled !== undefined) {
      if (settings.isEnabled && !this.isEnabled) {
        this.enable();
      } else if (!settings.isEnabled && this.isEnabled) {
        this.disable();
      }
    }

    if (settings.isPreviewVisible !== undefined) {
      this.isPreviewVisible = settings.isPreviewVisible;
      this.updatePreviewVisibility();
    }

    if (settings.sensitivity !== undefined) {
      this.recognizer.sensitivity = parseInt(settings.sensitivity, 10);
    }

    if (settings.cooldown !== undefined) {
      this.cooldown = parseInt(settings.cooldown, 10);
    }

    if (settings.confidenceThreshold !== undefined) {
      this.recognizer.confidenceThreshold = parseFloat(settings.confidenceThreshold);
    }
  }

  /**
   * Show or hide the webcam preview container.
   */
  updatePreviewVisibility() {
    const container = document.getElementById('webcam-preview-container');
    if (!container) return;

    if (this.isEnabled && this.isPreviewVisible) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  /**
   * Enables webcam stream and starts the landmark detection loop.
   */
  async enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    try {
      this.updatePreviewVisibility();
      
      // Reset gesture tracking state and add a brief stabilizer cooldown
      this.resetState(1500);
      
      // Start camera feed
      if (this.videoElement) {
        await this.tracker.startWebcam(this.videoElement);
      }

      // Start looping frames
      this.startLoop();
    } catch (err) {
      console.error('GestureController: Error enabling webcam.', err);
      this.isEnabled = false;
      this.updatePreviewVisibility();
    }
  }

  /**
   * Disables camera stream and stops the frame loop.
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    
    this.stopLoop();
    this.tracker.stopWebcam();
    this.clearCanvas();
    this.recognizer.clearHistory();
    this.updatePreviewVisibility();
  }

  /**
   * Clears gesture history and starts a transient cooldown.
   * Typically called when starting a new run or resuming the game
   * to prevent immediate false triggers.
   */
  resetState(cooldownMs = 1500) {
    this.recognizer.clearHistory();
    this.activeGesture = null;
    this.lastGestureTime = performance.now() + cooldownMs - this.cooldown;
  }

  /**
   * Starts the requestAnimationFrame loop.
   */
  startLoop() {
    this.stopLoop(); // Prevent duplicate loops
    
    const loop = () => {
      if (!this.isEnabled) return;
      
      this.processFrame();
      this.frameId = requestAnimationFrame(loop);
    };
    
    this.frameId = requestAnimationFrame(loop);
  }

  /**
   * Cancels the requestAnimationFrame loop.
   */
  stopLoop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /**
   * Process a single video frame and run detection.
   * Throttled to prevent blocking the game loop.
   */
  processFrame() {
    const now = performance.now();
    if (now - this.lastDetectionTime < this.throttleInterval) {
      return;
    }

    const results = this.tracker.detectFrame();
    
    // Only update canvas and recognize when a new frame is actually processed
    if (results) {
      this.lastDetectionTime = now;
      this.clearCanvas();

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const score = results.handedness[0].score;

        // Draw hand skeletal tracking mesh (only if preview is active)
        if (this.isPreviewVisible) {
          this.drawHandMesh(landmarks);
        }

        // Discard recognizer history and skip triggers if in a cooldown period
        if (now - this.lastGestureTime < this.cooldown) {
          this.recognizer.clearHistory();
          this.activeGesture = null;
          return;
        }

        // Feed coordinates to recognizer to analyze gestures
        const gesture = this.recognizer.recognize(landmarks, score);
        if (gesture) {
          this.handleGestureTrigger(gesture);
        }
      } else {
        // Clear tracking points if hand leaves frame
        this.recognizer.clearHistory();
        this.activeGesture = null;
      }
    }
  }

  /**
   * Debounces and dispatches recognized gestures to game callbacks.
   */
  handleGestureTrigger(gesture) {
    const now = performance.now();
    
    // Ignore fist (No Action)
    if (gesture === 'fist') {
      this.activeGesture = 'fist';
      return;
    }

    // Cooldown check
    if (now - this.lastGestureTime < this.cooldown) {
      return;
    }

    // Prevent re-triggering the same continuous static posture without returning to neutral first
    if ((gesture === 'pause' || gesture === 'resume') && this.activeGesture === gesture) {
      return;
    }

    this.activeGesture = gesture;
    this.lastGestureTime = now;

    console.log(`GestureController: Recognized Gesture -> ${gesture}`);

    // Trigger gameplay callbacks
    switch (gesture) {
      case 'swipe_left':
        if (this.callbacks.onLeft) this.callbacks.onLeft();
        break;
      case 'swipe_right':
        if (this.callbacks.onRight) this.callbacks.onRight();
        break;
      case 'swipe_up':
        if (this.callbacks.onJump) this.callbacks.onJump();
        break;
      case 'swipe_down':
        if (this.callbacks.onRoll) this.callbacks.onRoll();
        break;
      case 'pause':
        if (this.callbacks.onPause) this.callbacks.onPause();
        break;
      case 'resume':
        if (this.callbacks.onResume) this.callbacks.onResume();
        break;
    }
  }

  /**
   * Clears the tracking feedback canvas.
   */
  clearCanvas() {
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  /**
   * Draws a glowing, cyber-themed hand skeleton tracking mesh on the canvas.
   */
  drawHandMesh(landmarks) {
    if (!this.canvasCtx || !this.canvasElement) return;

    const width = this.canvasElement.width;
    const height = this.canvasElement.height;

    // Draw connection lines
    this.canvasCtx.lineWidth = 3;
    this.canvasCtx.strokeStyle = 'rgba(0, 240, 255, 0.7)'; // Cyber Neon Cyan
    this.canvasCtx.shadowBlur = 6;
    this.canvasCtx.shadowColor = '#00f0ff';

    this.connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start && end) {
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(start.x * width, start.y * height);
        this.canvasCtx.lineTo(end.x * width, end.y * height);
        this.canvasCtx.stroke();
      }
    });

    // Draw individual joints (dots)
    this.canvasCtx.shadowBlur = 8;
    this.canvasCtx.shadowColor = '#39ff14'; // Cyber Neon Green

    landmarks.forEach((pt) => {
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(pt.x * width, pt.y * height, 4, 0, 2 * Math.PI);
      this.canvasCtx.fillStyle = '#39ff14';
      this.canvasCtx.fill();
    });

    // Reset shadow values for rendering performance
    this.canvasCtx.shadowBlur = 0;
  }
}

// Export single instance
const gestureController = new GestureController();
export default gestureController;
export { gestureController };
