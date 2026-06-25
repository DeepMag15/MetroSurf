/* ==========================================
   METRO SURF - OBSTACLES & POWERUPS SPAWNER
   ========================================== */

import * as THREE from 'three';
import audio from './audio.js';

class SpawnerController {
  constructor() {
    this.group = new THREE.Group();
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    
    // Lane X coordinates
    this.lanes = [-2, 0, 2];
    
    // Materials
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6
    });
    
    this.trainMat = new THREE.MeshStandardMaterial({
      color: 0xaa0033, // Steel red
      roughness: 0.4,
      metalness: 0.8
    });
    
    this.trainWindowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Glowing cyan windows
    
    this.barrierMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00, // Warning yellow
      roughness: 0.6
    });

    this.powerupMaterials = {
      magnet: new THREE.MeshStandardMaterial({ color: 0xffea00, metalness: 0.5 }),
      shield: new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.5 }),
      multiplier: new THREE.MeshStandardMaterial({ color: 0xbd00ff, metalness: 0.5 })
    };
  }

  init(scene) {
    this.scene = scene;
    this.scene.add(this.group);
  }

  // Generate obstacles and collectibles on a recycled/new track segment
  spawnForSegment(segmentZ) {
    // 1. Clear any old items that were spawned around this Z coordinate
    this.clearItemsInRange(segmentZ - 20, segmentZ + 20);

    // 2. Decide on a pattern
    // Each segment is 40 units long. We can spawn items at 3 distinct Z offsets: -12, 0, 12 relative to the segment center.
    const offsets = [-12, 0, 12];
    
    offsets.forEach(zOffset => {
      const zPos = segmentZ + zOffset;
      
      // Prevent spawning items too close to the starting line (Z = 0)
      if (zPos > -15) return;

      const roll = Math.random();
      
      if (roll < 0.3) {
        // Spawn Coins Line in one random lane
        const lane = Math.floor(Math.random() * 3);
        this.spawnCoinsLine(this.lanes[lane], zPos, 3);
      } 
      else if (roll < 0.5) {
        // Spawn low hurdles
        const openLane = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === openLane) {
            // Spawn a coin in the open lane
            this.spawnCoin(this.lanes[l], 0.6, zPos);
          } else {
            this.spawnLowBarrier(this.lanes[l], zPos);
          }
        }
      } 
      else if (roll < 0.7) {
        // Spawn high hurdles
        const openLane = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === openLane) {
            this.spawnCoin(this.lanes[l], 0.6, zPos);
          } else {
            this.spawnHighBarrier(this.lanes[l], zPos);
          }
        }
      } 
      else if (roll < 0.85) {
        // Spawn a Subway Train (static or moving)
        const lane = Math.floor(Math.random() * 3);
        const isMoving = Math.random() < 0.4; // 40% chance the train moves
        this.spawnTrain(this.lanes[lane], zPos, isMoving);

        // Spawn coins on top of the train, or power-up
        const onTopRoll = Math.random();
        if (onTopRoll < 0.15) {
          // Spawn power-up on top of the train
          this.spawnPowerup(this.lanes[lane], zPos, 3.8);
        } else if (onTopRoll < 0.6) {
          // Coins on top of the train
          this.spawnCoinsLine(this.lanes[lane], zPos - 4, 3, 3.4);
        }
      } 
      else {
        // Spawn standard barriers and a power-up
        const powerupLane = Math.floor(Math.random() * 3);
        this.spawnPowerup(this.lanes[powerupLane], zPos, 0.6);
        
        // Block other lanes
        for (let l = 0; l < 3; l++) {
          if (l !== powerupLane) {
            this.spawnLowBarrier(this.lanes[l], zPos);
          }
        }
      }
    });
  }

  // --- SPAWN HELPER FUNCTIONS ---

  spawnCoin(x, y, z) {
    const coinGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
    const coin = new THREE.Mesh(coinGeo, this.coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, y, z);
    coin.castShadow = true;

    this.group.add(coin);
    this.collectibles.push({
      mesh: coin,
      type: 'coin',
      boundingBox: new THREE.Box3().setFromObject(coin)
    });
  }

  spawnCoinsLine(x, centerZ, count, startY = 0.6) {
    const spacing = 1.8;
    const startZ = centerZ - ((count - 1) * spacing) / 2;
    
    // Sometimes spawn an arch
    const makeArch = count >= 3 && Math.random() < 0.5;

    for (let i = 0; i < count; i++) {
      const z = startZ + i * spacing;
      let y = startY;
      
      if (makeArch) {
        // Parabolic arch formula: y height peaks at the center index
        const mid = (count - 1) / 2;
        const offset = Math.abs(i - mid);
        y = startY + (mid - offset) * 0.8;
      }
      
      this.spawnCoin(x, y, z);
    }
  }

  spawnLowBarrier(x, z) {
    const barrierGeo = new THREE.BoxGeometry(1.6, 0.5, 0.3);
    const standGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    
    const barrierGroup = new THREE.Group();
    barrierGroup.position.set(x, 0, z);

    // Cross bar
    const bar = new THREE.Mesh(barrierGeo, this.barrierMat);
    bar.position.y = 0.45;
    bar.castShadow = true;
    barrierGroup.add(bar);

    // Stripe textures on barrier (warning stripes)
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const stripeGeo = new THREE.BoxGeometry(0.2, 0.52, 0.32);
    for (let i = -0.6; i <= 0.6; i += 0.4) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(i, 0.45, 0);
      barrierGroup.add(stripe);
    }

    // Legs/stands
    const leftLeg = new THREE.Mesh(standGeo, this.barrierMat);
    leftLeg.position.set(-0.7, 0.25, 0);
    barrierGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(standGeo, this.barrierMat);
    rightLeg.position.set(0.7, 0.25, 0);
    barrierGroup.add(rightLeg);

    this.group.add(barrierGroup);
    
    // Collision Box setup
    const collBox = new THREE.Box3(
      new THREE.Vector3(x - 0.8, 0, z - 0.2),
      new THREE.Vector3(x + 0.8, 0.7, z + 0.2)
    );

    this.obstacles.push({
      mesh: barrierGroup,
      type: 'barrier_low',
      isMoving: false,
      boundingBox: collBox
    });
  }

  spawnHighBarrier(x, z) {
    // High barrier: clearing below (player must roll).
    // The bar is high, support beams are on the sides
    const crossBarGeo = new THREE.BoxGeometry(1.8, 0.4, 0.3);
    const pillarGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
    
    const barrierGroup = new THREE.Group();
    barrierGroup.position.set(x, 0, z);

    const bar = new THREE.Mesh(crossBarGeo, this.barrierMat);
    bar.position.y = 2.0;
    bar.castShadow = true;
    barrierGroup.add(bar);

    // Warning sign hanger
    const signGeo = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.6, 0);
    barrierGroup.add(sign);

    const leftPillar = new THREE.Mesh(pillarGeo, this.barrierMat);
    leftPillar.position.set(-0.85, 1.1, 0);
    barrierGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, this.barrierMat);
    rightPillar.position.set(0.85, 1.1, 0);
    barrierGroup.add(rightPillar);

    this.group.add(barrierGroup);

    // Collision box: The obstacle starts at y = 1.0 (clearance height) and goes up to 2.2
    // If the player rolls, their height is small, so they slide under it.
    const collBox = new THREE.Box3(
      new THREE.Vector3(x - 0.9, 1.0, z - 0.25),
      new THREE.Vector3(x + 0.9, 2.2, z + 0.25)
    );

    this.obstacles.push({
      mesh: barrierGroup,
      type: 'barrier_high',
      isMoving: false,
      boundingBox: collBox
    });
  }

  spawnTrain(x, z, isMoving) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(x, 0, z);

    // Train Body (tall, long)
    const bodyGeo = new THREE.BoxGeometry(1.7, 2.6, 14.0);
    const body = new THREE.Mesh(bodyGeo, this.trainMat);
    body.position.y = 1.3;
    body.castShadow = true;
    body.receiveShadow = true;
    trainGroup.add(body);

    // Train windshield (front)
    const shieldGeo = new THREE.BoxGeometry(1.5, 0.8, 0.1);
    const windshield = new THREE.Mesh(shieldGeo, this.trainWindowMat);
    windshield.position.set(0, 1.8, -7.01); // Facing player coming from -Z
    trainGroup.add(windshield);

    // Side windows
    const sideWinGeo = new THREE.BoxGeometry(0.1, 0.4, 1.0);
    for (let offsetZ = -5; offsetZ <= 5; offsetZ += 2.5) {
      const leftWindow = new THREE.Mesh(sideWinGeo, this.trainWindowMat);
      leftWindow.position.set(-0.86, 1.6, offsetZ);
      trainGroup.add(leftWindow);

      const rightWindow = new THREE.Mesh(sideWinGeo, this.trainWindowMat);
      rightWindow.position.set(0.86, 1.6, offsetZ);
      trainGroup.add(rightWindow);
    }

    // Wheels (simplistic boxes/cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelY = 0.25;
    const wheelX = 0.75;
    const wheelZs = [-5, -2, 2, 5];

    wheelZs.forEach(wZ => {
      const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
      wheelL.rotation.z = Math.PI / 2;
      wheelL.position.set(-wheelX, wheelY, wZ);
      trainGroup.add(wheelL);

      const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
      wheelR.rotation.z = Math.PI / 2;
      wheelR.position.set(wheelX, wheelY, wZ);
      trainGroup.add(wheelR);
    });

    this.group.add(trainGroup);

    // Bounding Box
    const collBox = new THREE.Box3(
      new THREE.Vector3(x - 0.85, 0, z - 7.0),
      new THREE.Vector3(x + 0.85, 2.6, z + 7.0)
    );

    this.obstacles.push({
      mesh: trainGroup,
      type: 'train',
      isMoving: isMoving,
      speed: isMoving ? 14 : 0, // Speed moving towards positive Z
      boundingBox: collBox
    });
  }

  spawnPowerup(x, z, y = 0.6) {
    const types = ['magnet', 'shield', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Outer floating container box (spinning)
    const boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const box = new THREE.Mesh(boxGeo, this.powerupMaterials[type]);
    box.position.set(x, y, z);
    box.castShadow = true;

    // Small icon primitive inside
    let innerGeo;
    if (type === 'magnet') {
      innerGeo = new THREE.TorusGeometry(0.15, 0.05, 8, 16);
    } else if (type === 'shield') {
      innerGeo = new THREE.OctahedronGeometry(0.2);
    } else {
      innerGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1); // x2 letter post
    }
    
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.set(0, 0, 0);
    box.add(innerMesh);

    this.group.add(box);
    this.collectibles.push({
      mesh: box,
      type: `powerup_${type}`,
      boundingBox: new THREE.Box3().setFromObject(box)
    });
  }

  // Generate bright particle burst when an item is collected
  spawnSparkles(x, y, z, colorCode = 0xffd700, count = 12) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: colorCode });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);

      // Random 3D velocity vectors radiating outwards
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 2.0 + Math.random() * 3.5;
      
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = (Math.sin(phi) * Math.sin(theta) * speed) + 1.5; // push slightly upward
      const vz = Math.cos(phi) * speed;

      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7
      });
    }
  }

  // --- CORE GAME LOOP LOGIC ---

  update(dt, playerInstance) {
    const playerPos = playerInstance.group.position;
    const isMagnetActive = playerInstance.powerups.magnet > 0;

    // 1. Update Obstacles (Moving trains & recalculating bounding boxes)
    this.obstacles.forEach(obs => {
      if (obs.isMoving) {
        // Move towards the player (positive Z)
        obs.mesh.position.z += obs.speed * dt;
        
        // Recalculate AABB
        obs.boundingBox.setFromObject(obs.mesh);
      }
    });

    // 2. Update Collectibles (Spinning/floating, and Magnet pull force)
    this.collectibles.forEach(col => {
      // Basic hover/spin animation
      col.mesh.rotation.y += 2.0 * dt;
      
      // Floating offset
      if (col.type === 'coin') {
        // Keep coins spinning
      } else {
        // Floating power-up boxes
        col.mesh.position.y += Math.sin(col.mesh.rotation.y * 3) * 0.005;
      }

      // Magnet pull logic
      if (col.type === 'coin' && isMagnetActive) {
        const distZ = Math.abs(col.mesh.position.z - playerPos.z);
        
        // If coin is within 16 units in Z, pull it!
        if (distZ < 16 && col.mesh.position.z < playerPos.z + 2) {
          // Vector from coin to player
          const targetPos = new THREE.Vector3(playerPos.x, playerPos.y + 0.8, playerPos.z);
          
          // Lerp coin's position towards target player position quickly
          col.mesh.position.lerp(targetPos, 14 * dt);
          
          // Update AABB
          col.boundingBox.setFromObject(col.mesh);
        }
      }
    });

    // 3. Update active collection sparkles/particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        // Physics integration
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        
        p.vy -= 9.8 * 0.25 * dt; // Gravity pull down

        // Scale down size over time (fading effect)
        const scale = p.life / p.maxLife;
        p.mesh.scale.set(scale, scale, scale);

        p.mesh.rotation.x += 6 * dt;
        p.mesh.rotation.y += 6 * dt;
      }
    }
  }

  // Clear specific meshes and bounding boxes
  clearItemsInRange(minZ, maxZ) {
    // Clear obstacles
    this.obstacles = this.obstacles.filter(obs => {
      const zPos = obs.mesh.position.z;
      if (zPos >= minZ && zPos <= maxZ) {
        this.group.remove(obs.mesh);
        return false;
      }
      return true;
    });

    // Clear collectibles
    this.collectibles = this.collectibles.filter(col => {
      const zPos = col.mesh.position.z;
      if (zPos >= minZ && zPos <= maxZ) {
        this.group.remove(col.mesh);
        return false;
      }
      return true;
    });
  }

  // Clear everything (used on restart/gameover)
  reset() {
    this.obstacles.forEach(obs => this.group.remove(obs.mesh));
    this.collectibles.forEach(col => this.group.remove(col.mesh));
    this.particles.forEach(p => this.group.remove(p.mesh));
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
  }
}

export const spawner = new SpawnerController();
export default spawner;
