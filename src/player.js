/* ==========================================
   METRO SURF - PLAYER CONTROLLER & ANIMATION
   ========================================== */

import * as THREE from 'three';
import audio from './audio.js';

class PlayerController {
  constructor() {
    this.group = new THREE.Group();
    
    // Lane configuration
    // Left: 0 (x = -2), Middle: 1 (x = 0), Right: 2 (x = 2)
    this.lanes = [-2, 0, 2];
    this.currentLane = 1; // Start in middle
    this.targetX = 0;
    
    // Physics / Jump / Roll
    this.isJumping = false;
    this.isRolling = false;
    this.jumpVelocity = 0;
    this.gravity = 35; // Acceleration units/s^2
    this.jumpForce = 12;
    this.rollDuration = 0.6; // Seconds
    this.rollTimeLeft = 0;
    
    // Default collision bounding box dimensions
    this.width = 0.8;
    this.height = 1.6;
    this.depth = 0.8;

    // Power-up States (remaining durations in seconds)
    this.powerups = {
      shield: 0,
      magnet: 0,
      multiplier: 0
    };
    
    // Visual References
    this.characterGroup = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.leftArm = null;
    this.rightArm = null;
    this.shieldMesh = null;
    this.magnetRing = null;
    
    this.createGraphics();
  }

  createGraphics() {
    // Character root group (allows us to scale/rotate character easily during animations)
    this.characterGroup = new THREE.Group();
    this.group.add(this.characterGroup);

    // Styling materials
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x221144, // Cyber dark purple
      roughness: 0.3,
      metalness: 0.8
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffdbac, // Skin peach
      roughness: 0.5
    });
    const neonVisorMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff // Glowing cyan visor
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xff007a, // Neon pink shoes
      roughness: 0.4
    });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.characterGroup.add(torso);

    // 2. Head
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.45, 0);
    head.castShadow = true;
    this.characterGroup.add(head);

    // 3. Cyber Visor
    const visorGeo = new THREE.BoxGeometry(0.35, 0.1, 0.25);
    const visor = new THREE.Mesh(visorGeo, neonVisorMat);
    visor.position.set(0, 1.48, 0.12);
    this.characterGroup.add(visor);

    // 4. Limbs
    const limbGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    
    // Left Arm
    this.leftArm = new THREE.Mesh(limbGeo, suitMat);
    this.leftArm.position.set(-0.45, 0.9, 0);
    this.leftArm.castShadow = true;
    this.characterGroup.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Mesh(limbGeo, suitMat);
    this.rightArm.position.set(0.45, 0.9, 0);
    this.rightArm.castShadow = true;
    this.characterGroup.add(this.rightArm);

    // Left Leg
    this.leftLeg = new THREE.Mesh(limbGeo, suitMat);
    this.leftLeg.position.set(-0.2, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.characterGroup.add(this.leftLeg);
    
    // Right Leg
    this.rightLeg = new THREE.Mesh(limbGeo, suitMat);
    this.rightLeg.position.set(0.2, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.characterGroup.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.28);
    
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.26, 0.04);
    this.leftLeg.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.26, 0.04);
    this.rightLeg.add(rightShoe);

    // 5. Shield Bubble (Hidden by default)
    const shieldGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(0, 0.9, 0);
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 6. Magnet Attraction Ring (Hidden by default)
    const magnetGeo = new THREE.RingGeometry(0.8, 1.0, 16);
    const magnetMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.magnetRing = new THREE.Mesh(magnetGeo, magnetMat);
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.position.set(0, 0.1, 0);
    this.magnetRing.visible = false;
    this.group.add(this.magnetRing);

    // Initial position
    this.group.position.set(0, 0, -2);
  }

  // Player Input Handlers
  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = this.lanes[this.currentLane];
      audio.playJump(); // Quick sweep sound for lane switch
    }
  }

  moveRight() {
    if (this.currentLane < 2) {
      this.currentLane++;
      this.targetX = this.lanes[this.currentLane];
      audio.playJump();
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = this.jumpForce;
      
      // If sliding/rolling, cancel it
      if (this.isRolling) {
        this.cancelRoll();
      }

      audio.playJump();
    }
  }

  roll() {
    if (this.isJumping) {
      // Slam down mechanic (Subway Surfers advanced control)
      this.jumpVelocity = -12;
      this.startRoll();
    } else if (!this.isRolling) {
      this.startRoll();
    }
  }

  startRoll() {
    this.isRolling = true;
    this.rollTimeLeft = this.rollDuration;
    
    // Squash the bounding box/height of character visually
    this.characterGroup.scale.set(1, 0.45, 1);
    this.characterGroup.position.y = -0.3; // Bring center down
    
    // Rotate torso forward slightly for dynamic posture
    this.characterGroup.rotation.x = Math.PI / 4;
    
    audio.playSlide();
  }

  cancelRoll() {
    this.isRolling = false;
    this.rollTimeLeft = 0;
    this.characterGroup.scale.set(1, 1, 1);
    this.characterGroup.position.y = 0;
    this.characterGroup.rotation.x = 0;
  }

  // Update Game Loop
  update(dt, time) {
    // 1. Horizontal lane movement (Lerping)
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.targetX, 15 * dt);

    // 2. Vertical Jump physics
    if (this.isJumping) {
      this.group.position.y += this.jumpVelocity * dt;
      this.jumpVelocity -= this.gravity * dt;

      // Check ground collision
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }

    // 3. Roll/Slide logic
    if (this.isRolling) {
      this.rollTimeLeft -= dt;
      
      // Spin torso visually while rolling
      const progress = (this.rollDuration - this.rollTimeLeft) / this.rollDuration;
      this.characterGroup.rotation.x = progress * Math.PI * 2;

      if (this.rollTimeLeft <= 0) {
        this.cancelRoll();
      }
    }

    // 4. Running animation (swinging legs/arms)
    if (!this.isJumping && !this.isRolling) {
      const swingSpeed = 15;
      const angle = Math.sin(time * swingSpeed) * 0.6;
      
      this.leftLeg.rotation.x = angle;
      this.rightLeg.rotation.x = -angle;
      this.leftArm.rotation.x = -angle * 0.8;
      this.rightArm.rotation.x = angle * 0.8;
    }

    // 5. Update power-up timers
    Object.keys(this.powerups).forEach(key => {
      if (this.powerups[key] > 0) {
        this.powerups[key] -= dt;
        if (this.powerups[key] <= 0) {
          this.powerups[key] = 0;
          this.deactivatePowerupVisual(key);
        }
      }
    });

    // 6. Update power-up visual effect transformations
    if (this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += 2 * dt;
      this.shieldMesh.rotation.x += 1 * dt;
      // Position matches player group relative coordinates
    }
    if (this.magnetRing.visible) {
      this.magnetRing.rotation.z += 3 * dt;
    }
  }

  // Activate power-up and update visuals
  activatePowerup(type, duration) {
    this.powerups[type] = duration;
    audio.playPowerup();

    if (type === 'shield') {
      this.shieldMesh.visible = true;
    } else if (type === 'magnet') {
      this.magnetRing.visible = true;
    }
  }

  deactivatePowerupVisual(type) {
    if (type === 'shield') {
      this.shieldMesh.visible = false;
    } else if (type === 'magnet') {
      this.magnetRing.visible = false;
    }
  }

  // Bounding box for collisions
  getBoundingBox() {
    // Dynamic height for rolling/slide vs jump
    const currentHeight = this.isRolling ? this.height * 0.45 : this.height;
    
    // Position of player is at (x, y, z)
    // The player model center is at y = currentHeight/2
    const min = new THREE.Vector3(
      this.group.position.x - this.width / 2,
      this.group.position.y,
      this.group.position.z - this.depth / 2
    );

    const max = new THREE.Vector3(
      this.group.position.x + this.width / 2,
      this.group.position.y + currentHeight,
      this.group.position.z + this.depth / 2
    );

    return new THREE.Box3(min, max);
  }

  reset() {
    this.currentLane = 1;
    this.targetX = 0;
    this.group.position.set(0, 0, -2);
    this.isJumping = false;
    this.isRolling = false;
    this.jumpVelocity = 0;
    this.rollTimeLeft = 0;
    this.characterGroup.scale.set(1, 1, 1);
    this.characterGroup.position.set(0, 0, 0);
    this.characterGroup.rotation.set(0, 0, 0);

    // Reset powerups
    Object.keys(this.powerups).forEach(key => {
      this.powerups[key] = 0;
      this.deactivatePowerupVisual(key);
    });
  }
}

export const player = new PlayerController();
export default player;
