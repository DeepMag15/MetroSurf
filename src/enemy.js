/* ==========================================
   METRO SURF - CHASING ENEMY INSPECTOR & DOG
   ========================================== */

import * as THREE from 'three';

class EnemyController {
  constructor() {
    this.group = new THREE.Group();
    
    // Distance behind player: 
    // Far = 7.0 (safe), Close = 3.2 (urgent chase)
    this.zOffset = 7.0;
    this.targetZOffset = 7.0;
    
    // Timer during which inspector stays close after stumble
    this.chaseTimer = 0;
    this.chaseDuration = 5.0; // Seconds before receding
    
    // Limb models for animation
    this.inspectorGroup = null;
    this.dogGroup = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.dogLegs = [];

    this.createGraphics();
  }

  init(scene) {
    this.scene = scene;
    this.scene.add(this.group);
    
    // Initially place behind start line
    this.group.position.set(0, 0, 5);
  }

  createGraphics() {
    // 1. Guard/Inspector model
    this.inspectorGroup = new THREE.Group();
    this.group.add(this.inspectorGroup);

    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x0c1033, // Navy blue uniform
      roughness: 0.5
    });
    
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe0bd,
      roughness: 0.6
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3
    });

    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold badge

    // Inspector Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.9, 0.45);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    this.inspectorGroup.add(torso);

    // Inspector Head
    const headGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.5, 0);
    head.castShadow = true;
    this.inspectorGroup.add(head);

    // Inspector Cap
    const capGeo = new THREE.BoxGeometry(0.34, 0.12, 0.38);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.7, 0.05);
    this.inspectorGroup.add(cap);

    const brimGeo = new THREE.BoxGeometry(0.34, 0.03, 0.15);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 1.66, 0.22);
    this.inspectorGroup.add(brim);

    // Gold badge on cap
    const badgeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 1.7, 0.2);
    this.inspectorGroup.add(badge);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    
    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.52, 0.95, 0);
    // Position arm forward (chasing gesture)
    leftArm.rotation.x = -Math.PI / 3; 
    this.inspectorGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, suitMat);
    rightArm.position.set(0.52, 0.95, 0);
    rightArm.rotation.x = -Math.PI / 4;
    this.inspectorGroup.add(rightArm);

    // Legs
    this.leftLeg = new THREE.Mesh(armGeo, suitMat);
    this.leftLeg.position.set(-0.24, 0.35, 0);
    this.inspectorGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(armGeo, suitMat);
    this.rightLeg.position.set(0.24, 0.35, 0);
    this.inspectorGroup.add(this.rightLeg);

    // 2. Chasing Dog model (runs next to the inspector, at x = -0.8)
    this.dogGroup = new THREE.Group();
    this.dogGroup.position.set(-0.85, 0, 0.2);
    this.group.add(this.dogGroup);

    const furMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b, // Brown fur
      roughness: 0.8
    });

    const collarMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red collar

    // Dog Body
    const dogBodyGeo = new THREE.BoxGeometry(0.35, 0.35, 0.7);
    const dogBody = new THREE.Mesh(dogBodyGeo, furMat);
    dogBody.position.y = 0.35;
    dogBody.castShadow = true;
    this.dogGroup.add(dogBody);

    // Dog Head
    const dogHeadGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const dogHead = new THREE.Mesh(dogHeadGeo, furMat);
    dogHead.position.set(0, 0.6, -0.28);
    dogHead.castShadow = true;
    this.dogGroup.add(dogHead);

    // Dog Snout
    const snoutGeo = new THREE.BoxGeometry(0.18, 0.15, 0.2);
    const snout = new THREE.Mesh(snoutGeo, furMat);
    snout.position.set(0, 0.55, -0.45);
    this.dogGroup.add(snout);

    // Dog Collar
    const collarGeo = new THREE.BoxGeometry(0.32, 0.06, 0.32);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.48, -0.24);
    this.dogGroup.add(collar);

    // Dog Legs
    const dogLegGeo = new THREE.BoxGeometry(0.1, 0.22, 0.1);
    const legOffsets = [
      [-0.12, -0.22], // Front Left
      [0.12, -0.22],  // Front Right
      [-0.12, 0.22],  // Back Left
      [0.12, 0.22]    // Back Right
    ];

    legOffsets.forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(dogLegGeo, furMat);
      leg.position.set(dx, 0.11, dz);
      leg.castShadow = true;
      this.dogGroup.add(leg);
      this.dogLegs.push(leg);
    });
  }

  // Trigger when player makes a mistake (hits barrier side or slides late)
  triggerStumble() {
    this.targetZOffset = 3.2; // Rushes close!
    this.chaseTimer = this.chaseDuration;
  }

  // Returns true if inspector has caught the player (stumbles while inspector is already close)
  isClose() {
    return this.zOffset < 4.0;
  }

  // Update loop
  update(dt, time, playerPos) {
    // 1. Manage stumble timer (recede if timer expires)
    if (this.chaseTimer > 0) {
      this.chaseTimer -= dt;
      if (this.chaseTimer <= 0) {
        this.targetZOffset = 7.0; // Recede to safe distance
      }
    }

    // 2. Lerp distance behind player
    this.zOffset = THREE.MathUtils.lerp(this.zOffset, this.targetZOffset, 2 * dt);

    // 3. Update position (X lerps to player lane, Y is ground, Z is behind player)
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, playerPos.x, 8 * dt);
    this.group.position.y = 0;
    this.group.position.z = playerPos.z + this.zOffset;

    // 4. Run Animations (Leg swinging)
    const runSpeed = 18;
    const swing = Math.sin(time * runSpeed) * 0.65;
    
    // Guard legs
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    // Dog legs (rapid trotting)
    this.dogLegs.forEach((leg, idx) => {
      const offset = idx % 2 === 0 ? swing : -swing;
      leg.rotation.x = offset * 0.8;
    });

    // Make dog hop up and down slightly
    this.dogGroup.position.y = Math.abs(Math.sin(time * runSpeed * 2)) * 0.08;
  }

  reset() {
    this.zOffset = 7.0;
    this.targetZOffset = 7.0;
    this.chaseTimer = 0;
    this.group.position.set(0, 0, 5);
  }
}

export const enemy = new EnemyController();
export default enemy;
