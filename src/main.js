/**
 * F1 2026 Virtual Showroom + Race Mode — main.js
 * ==================================================
 * Phase 2: GLB Loading, Wheelbase Fix, MeshPhysicalMaterial
 * Phase 3: FIA Validator, Article Codes, START RACE Lock
 * Phase 4: Track, Chase Camera, Cannon.js Physics
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

import './styles/main.css';

import { createEnvironment } from './scene/environment.js';
import { createCarAssembly }  from './scene/car.js';
import { createInternalComponents } from './scene/components.js';
import { checkGLBExists, loadGLBModel } from './scene/glbLoader.js';
import { initRaceMode } from './scene/raceMode.js';
import { initTeamSelector }  from './ui/teamSelector.js';
import { initDashboard }     from './ui/dashboard.js';
import { initXRayControls }  from './ui/xrayControls.js';

// ── Loading ─────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const loadingBar    = document.getElementById('loading-bar');
const loadingText   = document.getElementById('loading-text');

function setProgress(pct, label) {
  if (loadingBar) loadingBar.style.width = `${pct}%`;
  if (label && loadingText) loadingText.textContent = label;
}

// ══════════════════════════════════════════════════════════
// RENDERER
// ══════════════════════════════════════════════════════════
setProgress(5, 'CREATING RENDERER...');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;     // Softer shadow edges
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // Cinematic tone curve
renderer.toneMappingExposure = 1.25;                  // Brighter specular highlights
renderer.outputColorSpace = THREE.SRGBColorSpace;     // sRGB output
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ══════════════════════════════════════════════════════════
// SCENE & CAMERA
// ══════════════════════════════════════════════════════════
setProgress(10, 'INITIALIZING SCENE...');

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(5, 3, 7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.05;
controls.target.set(0, 0.4, 0);
controls.minDistance    = 2.5;
controls.maxDistance    = 22;
controls.maxPolarAngle  = Math.PI / 2 - 0.04;
controls.autoRotate     = false;
controls.panSpeed       = 0.5;

// ══════════════════════════════════════════════════════════
// ENVIRONMENT
// ══════════════════════════════════════════════════════════
setProgress(20, 'BUILDING HDR ENVIRONMENT...');
const { envMap } = createEnvironment(scene, renderer);

// ══════════════════════════════════════════════════════════
// CAR: Try GLB first, fallback to placeholder geometry
// ══════════════════════════════════════════════════════════
setProgress(35, 'LOADING CAR MODEL...');

let carGroup, bodyGroup, bodyMaterial, changeLivery, setRaceMode;
let internalsGroup, components, activateGlow, deactivateAllGlows;

// Check for GLB file in /public/models/
const GLB_PATH = '/models/f1-car.glb';
const hasGLB = await checkGLBExists(GLB_PATH);

if (hasGLB) {
  setProgress(40, 'LOADING GLB MODEL (WHEELBASE FIX)...');
  try {
    const glb = await loadGLBModel(GLB_PATH, envMap, (p) => {
      setProgress(40 + p * 20, `LOADING GLB... ${Math.round(p * 100)}%`);
    });
    carGroup = glb.carGroup;
    bodyGroup = glb.bodyGroup;
    bodyMaterial = glb.bodyMaterial;

    // changeLivery for GLB — iterate bodyGroup meshes
    changeLivery = (hexColor, duration = 0.9) => {
      const target = new THREE.Color(hexColor);
      bodyGroup.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        gsap.to(child.material.color, {
          r: target.r, g: target.g, b: target.b,
          duration, ease: 'power2.inOut',
        });
      });
    };

    console.log('[Main] GLB model loaded with wheelbase correction');
  } catch (err) {
    console.warn('[Main] GLB load failed, using placeholder:', err.message);
    // Fallback below
  }
}

if (!carGroup) {
  // Fallback: placeholder geometry
  setProgress(45, 'BUILDING PLACEHOLDER CAR...');
  const car = createCarAssembly(envMap);
  carGroup = car.carGroup;
  bodyGroup = car.bodyGroup;
  bodyMaterial = car.bodyMaterial;
  changeLivery = car.changeLivery;
  setRaceMode = car.setRaceMode;
}

scene.add(carGroup);

// ══════════════════════════════════════════════════════════
// INTERNAL COMPONENTS
// ══════════════════════════════════════════════════════════
setProgress(60, 'LOADING POWERTRAIN...');
const intComps = createInternalComponents(envMap);
internalsGroup = intComps.internalsGroup;
components = intComps.components;
activateGlow = intComps.activateGlow;
deactivateAllGlows = intComps.deactivateAllGlows;
carGroup.add(internalsGroup);

// ══════════════════════════════════════════════════════════
// RACE MODE (Phase 4)
// ══════════════════════════════════════════════════════════
setProgress(70, 'BUILDING RACE TRACK...');
const carApi = { setRaceMode: setRaceMode || (() => {}) };
const raceMode = initRaceMode(scene, camera, controls, carGroup, carApi);

// Back to showroom button
const backBtn = document.getElementById('btn-back-showroom');
if (backBtn) {
  backBtn.addEventListener('click', () => raceMode.stopRace());
}

// ══════════════════════════════════════════════════════════
// TEAM SELECTOR
// ══════════════════════════════════════════════════════════
setProgress(80, 'CONFIGURING TEAMS...');

initTeamSelector((team) => {
  changeLivery(team.hexColor);
});

// ══════════════════════════════════════════════════════════
// FIA DASHBOARD (Phase 3)
// ══════════════════════════════════════════════════════════
setProgress(85, 'STARTING FIA VALIDATOR...');

initDashboard(
  (params, result) => {
    // Wing angle → rear wing visual tilt
    const rearWingGroup = carGroup.getObjectByName('REAR_WING');
    if (rearWingGroup && rearWingGroup.children[0]) {
      const targetRot = THREE.MathUtils.degToRad(params.wingAngle * 0.6 - 5);
      gsap.to(rearWingGroup.children[0].rotation, {
        x: targetRot,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  },
  () => {
    // onStartRace callback — transition to race mode
    raceMode.startRace();
  }
);

// ══════════════════════════════════════════════════════════
// X-RAY CONTROLS
// ══════════════════════════════════════════════════════════
setProgress(90, 'CALIBRATING X-RAY...');

initXRayControls({
  camera,
  controls,
  bodyGroup,
  components,
  activateGlow,
  deactivateAllGlows,
});

// ══════════════════════════════════════════════════════════
// LOADING COMPLETE — Cinematic entry
// ══════════════════════════════════════════════════════════
setProgress(100, 'READY');

setTimeout(() => {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => { loadingScreen.style.display = 'none'; }, 800);

  gsap.from(camera.position, {
    x: -8, y: 6, z: 3,
    duration: 2.2,
    ease: 'power3.out',
    onUpdate: () => controls.update(),
  });
}, 600);

// ══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ══════════════════════════════════════════════════════════
let lastTime = performance.now();
let idleRotation = false;
let lastInteract = Date.now();

renderer.domElement.addEventListener('pointerdown', () => {
  lastInteract = Date.now();
  idleRotation = false;
  controls.autoRotate = false;
});

// deltaTime computed manually via performance.now() above

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  // Race mode update
  if (raceMode.isRacing) {
    raceMode.update(deltaTime);
  } else {
    // Showroom idle rotation
    if (!idleRotation && Date.now() - lastInteract > 8000) {
      idleRotation = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    }
    controls.update();
  }

  renderer.render(scene, camera);
}
animate();

// ══════════════════════════════════════════════════════════
// RESIZE
// ══════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ── Dev helpers ─────────────────────────────────────────
if (import.meta.env.DEV) {
  window.__F1 = { scene, camera, controls, carGroup, bodyGroup, components, changeLivery, raceMode };
  console.log('%c F1 2026 Showroom + Race', 'font-size:18px;color:#00f0ff;font-weight:bold');
}
