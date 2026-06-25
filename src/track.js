/* ==========================================
   METRO SURF - PROCEDURAL TRACK GENERATION
   ========================================== */

import * as THREE from 'three';

class TrackSegment {
  constructor(index, zPosition) {
    this.index = index;
    this.z = zPosition;
    this.length = 40; // Length along Z
    this.width = 8;   // Total width
    this.group = new THREE.Group();
    
    this.createGraphics();
  }

  createGraphics() {
    // 1. Asphalt Ground
    const groundGeo = new THREE.PlaneGeometry(this.width, this.length);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x11111d,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // 2. Neon Lane Dividers (Rails)
    // Left Rail (separates Left & Mid lanes: x = -1)
    // Right Rail (separates Mid & Right lanes: x = 1)
    const railGeo = new THREE.BoxGeometry(0.15, 0.05, this.length);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      metalness: 0.8,
      roughness: 0.2
    });

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-1, 0.025, 0);
    leftRail.receiveShadow = true;
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(1, 0.025, 0);
    rightRail.receiveShadow = true;
    this.group.add(rightRail);

    // 3. Side Walls
    const wallGeo = new THREE.PlaneGeometry(2, this.length);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f18,
      roughness: 0.7
    });
    
    // Left Wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-this.width / 2, 1, 0);
    this.group.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(this.width / 2, 1, 0);
    this.group.add(rightWall);

    // 4. Cyberpunk Neon Archways & Pillars
    // Add 2 arches per segment (at start and middle)
    const zOffsets = [-this.length / 4, this.length / 4];
    zOffsets.forEach((zOffset, idx) => {
      const archGroup = new THREE.Group();
      archGroup.position.set(0, 0, zOffset);

      // Pillars
      const pillarGeo = new THREE.BoxGeometry(0.4, 4, 0.4);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1d1d2c });
      
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-this.width / 2 + 0.2, 2, 0);
      leftPillar.castShadow = true;
      archGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(this.width / 2 - 0.2, 2, 0);
      rightPillar.castShadow = true;
      archGroup.add(rightPillar);

      // Top Crossbar
      const barGeo = new THREE.BoxGeometry(this.width, 0.4, 0.4);
      const crossBar = new THREE.Mesh(barGeo, pillarMat);
      crossBar.position.set(0, 4, 0);
      crossBar.castShadow = true;
      archGroup.add(crossBar);

      // Neon Lights on the arches
      // Alternate colors per segment
      const color = this.index % 2 === 0 ? 0x00f0ff : 0xbd00ff; // Cyan or Purple
      const neonMat = new THREE.MeshBasicMaterial({ color: color });
      
      // Horizontal light bar
      const lightBarGeo = new THREE.BoxGeometry(this.width - 2, 0.1, 0.1);
      const lightBar = new THREE.Mesh(lightBarGeo, neonMat);
      lightBar.position.set(0, 3.7, 0.21); // Slightly forward of the crossbar
      archGroup.add(lightBar);

      // Decorative panels on the pillars
      const sideLightGeo = new THREE.BoxGeometry(0.1, 2, 0.1);
      const leftSideLight = new THREE.Mesh(sideLightGeo, neonMat);
      leftSideLight.position.set(-this.width / 2 + 0.41, 2, 0);
      archGroup.add(leftSideLight);

      const rightSideLight = new THREE.Mesh(sideLightGeo, neonMat);
      rightSideLight.position.set(this.width / 2 - 0.41, 2, 0);
      archGroup.add(rightSideLight);

      this.group.add(archGroup);
    });

    // Set position of the entire segment
    this.group.position.set(0, 0, this.z);
  }

  // Recycle and shift to a new position along the track
  recycle(newZ) {
    this.z = newZ;
    this.group.position.z = newZ;
  }
}

class TrackManager {
  constructor() {
    this.segments = [];
    this.segmentLength = 40;
    this.maxSegments = 8; // Number of active segments kept in memory (~320 units)
    this.group = new THREE.Group();
    this.onSegmentRecycled = null; // Callback triggered when a segment is created or recycled
  }

  init(scene) {
    this.scene = scene;
    this.scene.add(this.group);
    this.generateInitialTrack();
  }

  generateInitialTrack() {
    // Generate initial set of segments starting from Z = 0 and going forward (negative Z)
    for (let i = 0; i < this.maxSegments; i++) {
      const zPos = -i * this.segmentLength;
      const segment = new TrackSegment(i, zPos);
      this.segments.push(segment);
      this.group.add(segment.group);
      
      if (this.onSegmentRecycled) {
        this.onSegmentRecycled(zPos);
      }
    }
  }

  update(playerZ) {
    // Check if player has passed the oldest segment (the one with the highest Z position)
    // The segment ends at segment.z - segmentLength.
    // If player.z is less than segment.z - segmentLength, the player has completely moved past it.
    
    // Find the segment with the highest Z (oldest segment behind the player)
    let oldestIdx = 0;
    let maxZ = -Infinity;
    
    this.segments.forEach((seg, idx) => {
      if (seg.z > maxZ) {
        maxZ = seg.z;
        oldestIdx = idx;
      }
    });

    const oldestSegment = this.segments[oldestIdx];

    // If player has run past this segment, recycle it to the front
    if (playerZ < oldestSegment.z - this.segmentLength) {
      // Find the segment that is furthest in front (lowest Z position)
      let minZ = Infinity;
      this.segments.forEach(seg => {
        if (seg.z < minZ) {
          minZ = seg.z;
        }
      });

      // Place the recycled segment right after the furthest one
      const newZ = minZ - this.segmentLength;
      oldestSegment.recycle(newZ);

      if (this.onSegmentRecycled) {
        this.onSegmentRecycled(newZ);
      }
    }
  }

  reset() {
    // Remove all segments from scene
    this.segments.forEach(seg => {
      this.group.remove(seg.group);
    });
    this.segments = [];
    this.generateInitialTrack();
  }
}

export const trackManager = new TrackManager();
export default trackManager;
