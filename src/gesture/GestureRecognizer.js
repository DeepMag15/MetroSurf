/* =========================================================================
   METRO SURF - GESTURE RECOGNIZER
   Analyzes 3D hand landmarks to detect static postures and dynamic swipes.
   ========================================================================= */

class GestureRecognizer {
  constructor() {
    this.history = [];
    this.historyMaxAge = 400; // ms to keep coordinates in history
    this.minSwipeDuration = 80; // ms minimum duration to filter out noise
    
    // Configurable parameters (updated via controllers/settings)
    this.sensitivity = 5; // 1 to 10
    this.confidenceThreshold = 0.8;
  }

  /**
   * Helper to compute Euclidean distance between two 3D landmarks
   */
  getDistance(p1, p2) {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }

  /**
   * Calculates the centroid (center of mass) of the 21 hand landmarks
   */
  getHandCentroid(landmarks) {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let i = 0; i < landmarks.length; i++) {
      sumX += landmarks[i].x;
      sumY += landmarks[i].y;
      sumZ += landmarks[i].z;
    }

    return {
      x: sumX / landmarks.length,
      y: sumY / landmarks.length,
      z: sumZ / landmarks.length
    };
  }

  /**
   * Main recognition function. Takes raw landmarks, processes them, and returns recognized gesture.
   * @param {Array} landmarks Array of 21 normalized hand landmarks.
   * @param {number} confidence Hand detection confidence score.
   * @returns {string|null} Recognized gesture name ('pause', 'resume', 'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down', 'fist', or null).
   */
  recognize(landmarks, confidence) {
    // 1. Validate confidence threshold
    if (confidence < this.confidenceThreshold) {
      this.clearHistory();
      return null;
    }

    // 2. Track hand centroid for dynamic swipe gestures
    const rawCentroid = this.getHandCentroid(landmarks);
    
    // Mirror X coordinates for natural interaction (so moving hand to screen-left decreases X)
    const centroid = {
      x: 1 - rawCentroid.x,
      y: rawCentroid.y,
      time: performance.now()
    };

    this.history.push(centroid);
    this.pruneHistory();

    // 3. Check for dynamic swipe gestures first
    const swipeGesture = this.detectSwipe();
    if (swipeGesture) {
      return swipeGesture;
    }

    // 4. Fallback to static posture gestures if no active swipe movement is detected
    return this.detectStaticPosture(landmarks);
  }

  /**
   * Prunes history entries that exceed the maximum tracking window age.
   */
  pruneHistory() {
    const now = performance.now();
    this.history = this.history.filter(p => now - p.time <= this.historyMaxAge);
  }

  /**
   * Clears the tracking history (used to reset tracking state).
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Dynamically analyzes displacement history to identify swipes.
   */
  detectSwipe() {
    if (this.history.length < 3) return null;

    const current = this.history[this.history.length - 1];
    const oldest = this.history[0];
    const dt = current.time - oldest.time;

    // Filter out short duration noise/jumps
    if (dt < this.minSwipeDuration) return null;

    // Map sensitivity (1 to 10) to screen coordinate distance threshold
    // High sensitivity = low threshold (easier to swipe)
    // Low sensitivity = high threshold (requires larger gesture)
    const swipeThreshold = 0.20 - (this.sensitivity / 10) * 0.15;

    let maxDx = 0;
    let maxDy = 0;
    let targetPoint = null;

    // Find the point in history that gives the maximum displacement to current frame
    for (let i = 0; i < this.history.length - 1; i++) {
      const p = this.history[i];
      const dx = current.x - p.x;
      const dy = current.y - p.y;

      if (Math.max(Math.abs(dx), Math.abs(dy)) > Math.max(Math.abs(maxDx), Math.abs(maxDy))) {
        maxDx = dx;
        maxDy = dy;
        targetPoint = p;
      }
    }

    if (!targetPoint) return null;

    const absDx = Math.abs(maxDx);
    const absDy = Math.abs(maxDy);

    // Check if the displacement exceeds our sensitivity-based threshold
    if (absDx > swipeThreshold || absDy > swipeThreshold) {
      // Determine direction. Ensure motion is dominant in one axis to filter diagonal noise
      const dominanceFactor = 1.3; // One axis must be 30% larger than the other

      if (absDx > absDy * dominanceFactor) {
        // Horizontal Swipe
        this.clearHistory(); // Clear history after successful trigger
        return maxDx > 0 ? 'swipe_right' : 'swipe_left';
      } else if (absDy > absDx * dominanceFactor) {
        // Vertical Swipe
        this.clearHistory(); // Clear history after successful trigger
        return maxDy > 0 ? 'swipe_down' : 'swipe_up';
      }
    }

    return null;
  }

  /**
   * Analyzes fingers status (extended/folded) to detect static postures.
   */
  detectStaticPosture(landmarks) {
    const wrist = landmarks[0];

    // Fingers MCP Joints
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];

    // Fingers PIP Joints
    const indexPip = landmarks[6];
    const middlePip = landmarks[10];
    const ringPip = landmarks[14];
    const pinkyPip = landmarks[18];

    // Fingers Tips
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Determine finger extensions based on localized MCP-relative distance
    // A finger is extended if the distance from MCP base to Tip is significantly larger than MCP base to PIP
    const isIndexExtended = this.getDistance(indexMcp, indexTip) > this.getDistance(indexMcp, indexPip) * 1.3;
    const isMiddleExtended = this.getDistance(middleMcp, middleTip) > this.getDistance(middleMcp, middlePip) * 1.3;
    const isRingExtended = this.getDistance(ringMcp, ringTip) > this.getDistance(ringMcp, ringPip) * 1.3;
    const isPinkyExtended = this.getDistance(pinkyMcp, pinkyTip) > this.getDistance(pinkyMcp, pinkyPip) * 1.3;

    // Thumb extended if tip is far from wrist/thumbBase and index MCP base
    const thumbBase = landmarks[2];
    const isThumbExtended = this.getDistance(wrist, thumbTip) > this.getDistance(wrist, thumbBase) * 1.25 &&
                            this.getDistance(indexMcp, thumbTip) > this.getDistance(indexMcp, thumbBase);

    // Count extended fingers
    let extendedFingersCount = 0;
    if (isIndexExtended) extendedFingersCount++;
    if (isMiddleExtended) extendedFingersCount++;
    if (isRingExtended) extendedFingersCount++;
    if (isPinkyExtended) extendedFingersCount++;
    if (isThumbExtended) extendedFingersCount++;

    // Classify postures:
    
    // 1. Open Palm (Pause) -> All 5 fingers extended
    if (extendedFingersCount >= 4 && isIndexExtended && isMiddleExtended && isRingExtended) {
      return 'pause';
    }

    // 2. Closed Fist -> All fingers folded
    if (extendedFingersCount === 0 || (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended)) {
      return 'fist';
    }

    // 3. Thumbs Up (Resume) -> Only thumb extended, oriented vertically upward
    // Thumb tip must be higher than other joints
    if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      const isThumbsUpOriented = thumbTip.y < landmarks[3].y && thumbTip.y < landmarks[2].y;
      if (isThumbsUpOriented) {
        return 'resume';
      }
    }

    return null;
  }
}

export default GestureRecognizer;
