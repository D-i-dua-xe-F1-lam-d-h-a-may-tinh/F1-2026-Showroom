/**
 * Environment Module — Phase 2 Upgrade
 * ======================================
 * - PMREMGenerator HDR environment for PBR reflections
 * - RectAreaLight for overhead LED strips
 * - SpotLight for car highlights
 * - ContactShadows plane
 */

import * as THREE from 'three';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/**
 * Generate a procedural HDR environment texture using PMREMGenerator.
 * Returns an envMap suitable for MeshPhysicalMaterial.envMap.
 * (When you have a real .hdr file, replace this with RGBELoader)
 *
 * @param {THREE.WebGLRenderer} renderer
 * @returns {THREE.Texture} pmrem envMap
 */
export function createHDREnvironment(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  // Build a richer procedural scene for studio-quality reflections
  const envScene = new THREE.Scene();

  // ── Studio backdrop — warm white sphere ──
  const envGeom = new THREE.SphereGeometry(50, 64, 64);
  const ceilMat = new THREE.MeshBasicMaterial({
    color: 0xfff8f0,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(envGeom, ceilMat));

  // ── Bright overhead panel for sharp reflections on paint ──
  const panelGeo = new THREE.PlaneGeometry(20, 6);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, 30, 0);
  panel.rotation.x = Math.PI / 2;
  envScene.add(panel);

  // ── Side accent panels for gradient reflections ──
  const sidePanelGeo = new THREE.PlaneGeometry(8, 20);
  const sidePanelMat = new THREE.MeshBasicMaterial({ color: 0xddeeff, side: THREE.DoubleSide });
  const leftPanel = new THREE.Mesh(sidePanelGeo, sidePanelMat);
  leftPanel.position.set(-30, 10, 0);
  leftPanel.rotation.y = Math.PI / 2;
  envScene.add(leftPanel);
  const rightPanel = new THREE.Mesh(sidePanelGeo.clone(), sidePanelMat.clone());
  rightPanel.position.set(30, 10, 0);
  rightPanel.rotation.y = -Math.PI / 2;
  envScene.add(rightPanel);

  // ── Multiple point lights for complex reflections ──
  const addEnvLight = (color, intensity, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, 100);
    light.position.set(x, y, z);
    envScene.add(light);
  };

  addEnvLight(0xfff5e6, 4,   0,  35,  0);    // Bright warm top key
  addEnvLight(0xffffff, 2.5, 15, 25,  10);   // White right-front
  addEnvLight(0xffffff, 2.5,-15, 25, -10);   // White left-rear
  addEnvLight(0xa0c8ff, 2,  -25, 12, -25);   // Cool blue fill
  addEnvLight(0x00f0ff, 1.5, 12,  6, -30);   // Cyan rim accent
  addEnvLight(0xff6600, 0.6,-12,  3,  25);   // Warm orange accent
  addEnvLight(0x00ff88, 0.4, 20,  8, -15);   // Green subtle
  addEnvLight(0xffe0c0, 1.5,  0, 18,  20);   // Front warm wash

  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();

  return envMap;
}

/**
 * Build the full showroom environment
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @returns {{ envMap: THREE.Texture, floor: THREE.Mesh }}
 */
export function createEnvironment(scene, renderer) {
  RectAreaLightUniformsLib.init();

  // ── Background & Fog ──────────────────────────────────────
  scene.background = new THREE.Color(0x06080f);
  scene.fog = new THREE.FogExp2(0x080b14, 0.012);

  // ── HDR Environment Map ───────────────────────────────────
  const envMap = createHDREnvironment(renderer);
  scene.environment = envMap;  // Affects all PBR materials globally

  // ── Reflective Floor ─────────────────────────────────────
  const floorGeo = new THREE.CircleGeometry(18, 80);
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x111520,
    metalness: 0.0,
    roughness: 0.05,
    envMap,
    envMapIntensity: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  floor.name = 'FLOOR';
  scene.add(floor);

  // ContactShadows simulation — dark gradient disc directly under car
  const shadowGeo = new THREE.CircleGeometry(4.5, 64);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.001;
  contactShadow.name = 'CONTACT_SHADOW';
  scene.add(contactShadow);

  // Floor ring glow
  const ringGeo = new THREE.RingGeometry(9.8, 10, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  scene.add(ring);

  // Ground plane beyond the ring
  const groundGeo = new THREE.PlaneGeometry(80, 80);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x070a12,
    roughness: 1.0,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Overhead LED Strips (RectAreaLight) ───────────────────
  // Front strip
  const rectFront = new THREE.RectAreaLight(0xfff8f0, 8, 6, 1.5);
  rectFront.position.set(0, 9, 3);
  rectFront.lookAt(0, 0, 3);
  scene.add(rectFront);

  // Rear strip
  const rectRear = new THREE.RectAreaLight(0xfff0e0, 5, 4, 1.0);
  rectRear.position.set(0, 8, -3);
  rectRear.lookAt(0, 0, -3);
  scene.add(rectRear);

  // Side strips (blue-ish for contrast)
  const rectLeft = new THREE.RectAreaLight(0x88aaff, 3, 1.2, 8);
  rectLeft.position.set(-8, 5, 0);
  rectLeft.lookAt(0, 1, 0);
  scene.add(rectLeft);

  const rectRight = new THREE.RectAreaLight(0x88aaff, 3, 1.2, 8);
  rectRight.position.set(8, 5, 0);
  rectRight.lookAt(0, 1, 0);
  scene.add(rectRight);

  // ── Key SpotLight (main car highlight) ───────────────────
  const keySpot = new THREE.SpotLight(0xfff5e0, 300);
  keySpot.position.set(5, 11, 6);
  keySpot.angle = Math.PI / 7;
  keySpot.penumbra = 0.5;
  keySpot.decay = 1.2;
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.set(2048, 2048);
  keySpot.shadow.bias = -0.0002;
  keySpot.shadow.camera.near = 2;
  keySpot.shadow.camera.far = 30;
  keySpot.target.position.set(0, 0.3, 0);
  scene.add(keySpot);
  scene.add(keySpot.target);

  // Rim SpotLight (cyan back-light for drama)
  const rimSpot = new THREE.SpotLight(0x00f0ff, 120);
  rimSpot.position.set(-2, 8, -9);
  rimSpot.angle = Math.PI / 8;
  rimSpot.penumbra = 0.7;
  rimSpot.decay = 1.5;
  rimSpot.target.position.set(0, 0.5, -2);
  scene.add(rimSpot);
  scene.add(rimSpot.target);

  // Fill (soft warm from opposite)
  const fillSpot = new THREE.SpotLight(0xffa080, 60);
  fillSpot.position.set(-9, 6, 4);
  fillSpot.angle = Math.PI / 5;
  fillSpot.penumbra = 0.9;
  fillSpot.decay = 1.5;
  fillSpot.target.position.set(0, 0.3, 0);
  scene.add(fillSpot);
  scene.add(fillSpot.target);

  // Top cold spot for helmets/cockpit detail
  const topSpot = new THREE.SpotLight(0xd0e8ff, 80);
  topSpot.position.set(0, 14, 0);
  topSpot.angle = Math.PI / 9;
  topSpot.penumbra = 0.8;
  topSpot.decay = 1.5;
  topSpot.castShadow = true;
  topSpot.shadow.mapSize.set(1024, 1024);
  topSpot.target.position.set(0, 0, 0);
  scene.add(topSpot);
  scene.add(topSpot.target);

  // Ambient
  const ambient = new THREE.AmbientLight(0x1a2540, 1.2);
  scene.add(ambient);

  // Hemisphere
  const hemi = new THREE.HemisphereLight(0x2244aa, 0x080c18, 0.5);
  scene.add(hemi);

  // ── Background wall arcs (aesthetic) ─────────────────────
  const archCount = 8;
  for (let i = 0; i < archCount; i++) {
    const angle = (i / archCount) * Math.PI * 2;
    const archGeo = new THREE.TorusGeometry(14, 0.04, 8, 40, Math.PI * 0.6);
    const archMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.03 + (i % 2) * 0.02,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(
      Math.cos(angle) * 0.1,
      6,
      Math.sin(angle) * 0.1
    );
    arch.rotation.y = angle;
    arch.rotation.x = Math.PI / 2;
    scene.add(arch);
  }

  return { envMap, floor, contactShadow };
}
