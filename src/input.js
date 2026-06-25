/* ==========================================
   METRO SURF - KEYBOARD & SWIPE INPUT SYSTEM
   ========================================== */

class InputHandler {
  constructor() {
    this.listeners = {
      left: [],
      right: [],
      jump: [],
      roll: [],
      pause: []
    };

    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.minSwipeDistance = 35; // Pixels
    
    // Binding methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  init() {
    // Keyboard listeners
    window.addEventListener('keydown', this.handleKeyDown);

    // Touch listeners for mobile swipe
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
  }

  // Subscribe methods
  onLeft(callback) { this.listeners.left.push(callback); }
  onRight(callback) { this.listeners.right.push(callback); }
  onJump(callback) { this.listeners.jump.push(callback); }
  onRoll(callback) { this.listeners.roll.push(callback); }
  onPause(callback) { this.listeners.pause.push(callback); }

  // Trigger subscribers
  trigger(action) {
    this.listeners[action].forEach(cb => cb());
  }

  // Keyboard Event Handler
  handleKeyDown(e) {
    // Avoid triggering inputs when in input forms or settings text fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.trigger('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.trigger('right');
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.trigger('jump');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.trigger('roll');
        break;
      case 'Escape':
      case 'p':
      case 'P':
        this.trigger('pause');
        break;
    }
  }

  // Touch Event Handlers
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  handleTouchEnd(e) {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const diffX = touchEndX - this.touchStartX;
      const diffY = touchEndY - this.touchStartY;

      // Identify swipe only if swipe distance is larger than the threshold
      if (Math.max(Math.abs(diffX), Math.abs(diffY)) > this.minSwipeDistance) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          // Horizontal Swipe
          if (diffX > 0) {
            this.trigger('right');
          } else {
            this.trigger('left');
          }
        } else {
          // Vertical Swipe
          if (diffY > 0) {
            this.trigger('roll');
          } else {
            this.trigger('jump');
          }
        }
      }
    }
  }
}

// Export single instance
export const input = new InputHandler();
export default input;
