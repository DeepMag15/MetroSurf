/* ==========================================
   METRO SURF - THREE.JS RENDERER CONTROLLER
   ========================================== */

import * as THREE from 'three';

class RendererController {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    
    // Lights
    this.ambientLight = null;
    this.dirLight = null;
    
    // Quality settings
    this.quality = 'medium';
  }

  init(containerElement) {
    const width = containerElement.clientWidth;
    const height = containerElement.clientHeight;

    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // Cyberpunk/Subway dark blue-purple theme fog
    this.scene.background = new THREE.Color(0x0a0a12);
    this.scene.fog = new THREE.FogExp2(0x0a0a12, 0.015);

    // 2. Create Camera
    // Field of View: 60, Aspect, Near: 0.1, Far: 1000
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    // Position camera slightly behind and above the player
    // Player will run along the -Z axis (towards negative Z)
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(new THREE.Vector3(0, 1.5, -5));

    // 3. Create WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Color management
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Attach to HTML DOM
    containerElement.appendChild(this.renderer.domElement);

    // 4. Setup Lighting
    this.setupLighting();
  }

  setupLighting() {
    // Ambient lighting (subtle blue tone)
    this.ambientLight = new THREE.AmbientLight(0x222244, 1.5);
    this.scene.add(this.ambientLight);

    // Directional light (like moonlight/neon tower casts)
    this.dirLight = new THREE.DirectionalLight(0x88bbff, 2.5);
    this.dirLight.position.set(10, 20, 10);
    this.scene.add(this.dirLight);

    // Default graphics configuration
    this.setQuality('medium');
  }

  setQuality(quality) {
    this.quality = quality;
    if (!this.renderer) return;

    if (quality === 'high') {
      // Enable Shadows
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 50;
      
      const d = 15;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
    } else {
      // Disable Shadows for medium and low
      this.renderer.shadowMap.enabled = false;
      this.dirLight.castShadow = false;
    }
  }

  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Helper to add helper grids/axes if debugging is needed
  addHelpers() {
    const grid = new THREE.GridHelper(100, 100, 0x00f0ff, 0x444444);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }
}

export const renderer = new RendererController();
export default renderer;
