/**
 * Race Mode — Phase 5 (Final)
 * =============================
 * 1. cleanupModel() — remove junk geometry at origin
 * 2. Car rotation fix — align nose to Three.js +Z
 * 3. Chase camera via carGroup.matrixWorld (local offsets)
 * 4. WASD controls with physics-based steering
 * 5. Speed effects: FOV increase + camera shake
 * 6. V6 Audio: procedural oscillator with dynamic pitch
 * 7. X-Ray kill on race entry via carApi.setRaceMode(true)
 * 8. Cannon.js barriers from track.barrierData[]
 * 9. RPM / ERS / Brake HUD updates
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import gsap from 'gsap';
import { buildTrack, TRACK_CONFIG } from './track.js';

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const CAR_MASS   = 798;
const GRAVITY    = -9.81;
const TIMESTEP   = 1 / 60;
const CAR_HALF_W = 0.9;
const CAR_HALF_H = 0.35;
const CAR_HALF_L = 1.7;   // 3.4m / 2 (FIA wheelbase)

// Chase camera (car-local offsets)
const CHASE_LOCAL = new THREE.Vector3(0, 3.5, -10);
const LOOK_LOCAL  = new THREE.Vector3(0, 0.5,  8);

// Drive tuning
const MAX_SPEED    = 0.004;
const ACCEL        = 0.000025;
const BRAKE_FORCE  = 0.00008;
const DRAG         = 0.000005;
const STEER_SPEED  = 0.0008;
const STEER_RETURN = 0.0005;
const MAX_STEER    = 0.012;

// Speed effects
const BASE_FOV     = 40;
const MAX_FOV      = 58;
const SHAKE_MAX    = 0.12;

// Audio
const V6_BASE_FREQ   = 110;   // Hz — idle
const V6_MAX_FREQ    = 520;   // Hz — max RPM
const V6_VOLUME      = 0.15;

// ═══════════════════════════════════════
// CLEANUP MODEL — remove junk geometry
// ═══════════════════════════════════════
/**
 * Scans the car group and removes/hides unnamed placeholder
 * meshes sitting at origin (0,0,0) that create visual artifacts.
 */
function cleanupModel(carGroup) {
  const toRemove = [];
  carGroup.traverse((child) => {
    if (!child.isMesh) return;
    // Detect junk: no meaningful name + at origin + very small or no geometry
    const isAtOrigin = child.position.length() < 0.01;
    const hasNoName = !child.name || child.name === '' || child.name === 'Placeholder';
    const isSmall = child.geometry &&
      child.geometry.boundingSphere &&
      child.geometry.boundingSphere.radius < 0.02;

    if (isAtOrigin && hasNoName && isSmall) {
      toRemove.push(child);
    }
  });

  toRemove.forEach(mesh => {
    mesh.visible = false;
    mesh.geometry?.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
      else mesh.material.dispose();
    }
    mesh.parent?.remove(mesh);
  });

  if (toRemove.length > 0) {
    console.log(`[Cleanup] Removed ${toRemove.length} junk meshes from car model`);
  }
}

// ═══════════════════════════════════════
// V6 AUDIO ENGINE
// ═══════════════════════════════════════
class V6AudioEngine {
  constructor() {
    this.ctx = null;
    this.oscillator1 = null;
    this.oscillator2 = null;
    this.gainNode = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Primary V6 tone — sawtooth for harmonic richness
      this.oscillator1 = this.ctx.createOscillator();
      this.oscillator1.type = 'sawtooth';
      this.oscillator1.frequency.value = V6_BASE_FREQ;

      // Secondary harmonic — square wave at 2x for turbo whine
      this.oscillator2 = this.ctx.createOscillator();
      this.oscillator2.type = 'square';
      this.oscillator2.frequency.value = V6_BASE_FREQ * 2;

      // Gain (volume)
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0;

      // Secondary gain (quieter)
      const gain2 = this.ctx.createGain();
      gain2.gain.value = 0.3;

      // Low-pass filter to tame harshness
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 2;

      // Connect: osc1 + osc2 → filter → gain → output
      this.oscillator1.connect(filter);
      this.oscillator2.connect(gain2);
      gain2.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.oscillator1.start();
      this.oscillator2.start();
      this.started = true;
      console.log('[Audio] V6 engine started');
    } catch (e) {
      console.warn('[Audio] Failed to create AudioContext:', e.message);
    }
  }

  /** Update pitch and volume based on speed ratio (0→1) */
  update(speedRatio) {
    if (!this.started || !this.ctx) return;

    const freq = V6_BASE_FREQ + (V6_MAX_FREQ - V6_BASE_FREQ) * speedRatio;
    this.oscillator1.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.oscillator2.frequency.setTargetAtTime(freq * 2.01, this.ctx.currentTime, 0.05);

    // Volume ramps up with speed
    const vol = V6_VOLUME * (0.3 + speedRatio * 0.7);
    this.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  stop() {
    if (!this.started) return;
    try {
      this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => {
        this.oscillator1?.stop();
        this.oscillator2?.stop();
        this.ctx?.close();
        this.started = false;
      }, 500);
    } catch { /* ignore */ }
  }
}

// ═══════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════
/**
 * @param {THREE.Scene} scene
 * @param {THREE.PerspectiveCamera} camera
 * @param {OrbitControls} controls
 * @param {THREE.Group} carGroup
 * @param {{ setRaceMode?: Function }} carApi
 */
export function initRaceMode(scene, camera, controls, carGroup, carApi) {
  let isRacing = false;
  let raceTrack = null;
  let physicsWorld = null;
  let carBody = null;
  let barrierBodies = [];
  let trackProgress = 0;
  let speed = 0;
  let steerOffset = 0;
  let lapCount = 0;
  let showroomElements = [];
  let ersEnergy = 1.0;  // 0→1 (100%)

  // Camera smoothing
  const _camPos = new THREE.Vector3(5, 3, 7);
  const _camLook = new THREE.Vector3(0, 0.4, 0);

  // Audio
  const audio = new V6AudioEngine();

  // Controls hint auto-hide timer
  let hintTimer = null;

  // ── WASD Input ──
  const keys = { w: false, a: false, s: false, d: false };
  function onKeyDown(e) {
    if (!isRacing) return;
    const k = e.key.toLowerCase();
    if (k in keys) {
      keys[k] = true;
      // Hide controls hint on first keypress
      const hint = document.getElementById('race-controls-hint');
      if (hint && !hint.classList.contains('fade-out')) {
        hint.classList.add('fade-out');
      }
    }
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ── Run cleanup on car model ──
  cleanupModel(carGroup);

  // ═══════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════
  let barrierMat = null;

  function initPhysics() {
    physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, GRAVITY, 0),
    });
    physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
    physicsWorld.solver.iterations = 10;

    const tyreM = new CANNON.Material('tyre');
    const asphaltM = new CANNON.Material('asphalt');
    barrierMat = new CANNON.Material('barrier');
    const carM = new CANNON.Material('car');

    // Tyre↔Asphalt: HIGH friction
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(tyreM, asphaltM, {
      friction: 1.2, restitution: 0.02,
    }));
    // Car↔Barrier: LOW bounce
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(carM, barrierMat, {
      friction: 0.3, restitution: 0.12,
    }));
    // HIGH friction contact for tight corners (car↔asphalt direct)
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(carM, asphaltM, {
      friction: 1.8, restitution: 0.01,
    }));

    // Ground
    const ground = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: asphaltM,
    });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(ground);

    // Car body — 3.4m hitbox
    carBody = new CANNON.Body({
      mass: CAR_MASS,
      shape: new CANNON.Box(new CANNON.Vec3(CAR_HALF_W, CAR_HALF_H, CAR_HALF_L)),
      position: new CANNON.Vec3(0, 0.5, 0),
      material: carM,
      linearDamping: 0.4,
      angularDamping: 0.95,
    });
    physicsWorld.addBody(carBody);

    // Collision → slow down
    carBody.addEventListener('collide', (e) => {
      const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (impact > 1.5) {
        speed *= 0.2;
        steerOffset *= 0.5;
      }
    });
  }

  function buildBarrierBodies(barrierData) {
    barrierBodies = [];
    barrierData.forEach(({ position, angle }) => {
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(0.35, 0.6, 1.5)),
        position: new CANNON.Vec3(position.x, position.y, position.z),
        material: barrierMat,
      });
      body.quaternion.setFromEuler(0, angle, 0);
      physicsWorld.addBody(body);
      barrierBodies.push(body);
    });
    console.log(`[Physics] ${barrierBodies.length} barrier bodies`);
  }

  // ═══════════════════════════════════════
  // BUILD TRACK
  // ═══════════════════════════════════════
  function buildRaceTrack() {
    const data = buildTrack();
    raceTrack = data;
    data.trackGroup.visible = false;
    scene.add(data.trackGroup);
    console.log(`[Race] Track: ${data.totalLength.toFixed(0)}m`);
    return data;
  }

  // ═══════════════════════════════════════
  // TRANSITION: SHOWROOM → RACE
  // ═══════════════════════════════════════
  function transitionToRace() {
    if (!raceTrack) return;
    isRacing = true;
    controls.enabled = false;

    // ── Fix X-Ray: force solid ──
    if (carApi?.setRaceMode) carApi.setRaceMode(true);

    // ── Fix rotation: align nose to +Z for Three.js ──
    // (Only needed if model faces wrong direction)
    // carGroup.rotation.set(0, Math.PI, 0);

    // Hide showroom
    showroomElements = [];
    scene.traverse(c => {
      if (c.name === 'FLOOR' || c.name === 'CONTACT_SHADOW') {
        showroomElements.push(c);
      }
    });
    raceTrack.trackGroup.visible = true;
    showroomElements.forEach(e => { e.visible = false; });
    scene.fog = null;

    // Place car at start
    const sp = raceTrack.startPosition;
    const sd = raceTrack.startDirection;
    carGroup.position.copy(sp);
    carGroup.lookAt(sp.clone().add(sd.clone().multiplyScalar(5)));

    // Sync physics
    if (carBody) {
      carBody.position.set(sp.x, sp.y, sp.z);
      carBody.velocity.setZero();
      carBody.angularVelocity.setZero();
      const q = new THREE.Quaternion();
      carGroup.getWorldQuaternion(q);
      carBody.quaternion.set(q.x, q.y, q.z, q.w);
    }

    // Build barriers
    if (raceTrack.barrierData && barrierMat) {
      buildBarrierBodies(raceTrack.barrierData);
    }

    // Reset state
    trackProgress = 0.03;  // Match track.js startT
    speed = 0;
    steerOffset = 0;
    lapCount = 0;
    ersEnergy = 1.0;
    _camPos.copy(camera.position);
    _camLook.copy(carGroup.position);

    // Start audio
    audio.start();

    // Show controls hint briefly
    const hint = document.getElementById('race-controls-hint');
    if (hint) {
      hint.classList.remove('fade-out');
      hintTimer = setTimeout(() => hint.classList.add('fade-out'), 6000);
    }

    // Camera fly-in
    carGroup.updateMatrixWorld(true);
    const chasePos = getChasePos();
    gsap.to(camera.position, {
      x: chasePos.x, y: chasePos.y, z: chasePos.z,
      duration: 2.5, ease: 'power3.inOut',
      onUpdate: () => camera.lookAt(carGroup.position),
      onComplete: () => {
        updateLapDisplay();
        console.log('[Race] GO! Use WASD to drive.');
      },
    });

    // UI: show race HUD, hide showroom panels
    document.getElementById('race-hud')?.classList.remove('hidden');
    document.getElementById('xray-controls')?.classList.add('hidden');
    document.getElementById('team-panel')?.classList.add('race-hidden');
    document.getElementById('dashboard-panel')?.classList.add('race-hidden');
    document.getElementById('telemetry-hud')?.classList.add('race-hidden');

    // Ensure back button works
    const backBtn = document.getElementById('btn-back-showroom');
    if (backBtn) {
      backBtn.onclick = () => transitionToShowroom();
    }
  }

  // ═══════════════════════════════════════
  // TRANSITION: RACE → SHOWROOM
  // ═══════════════════════════════════════
  function transitionToShowroom() {
    isRacing = false;
    keys.w = keys.a = keys.s = keys.d = false;

    // Stop audio
    audio.stop();

    if (raceTrack) raceTrack.trackGroup.visible = false;
    showroomElements.forEach(e => { e.visible = true; });
    scene.fog = new THREE.FogExp2(0x080b14, 0.012);

    carGroup.position.set(0, 0, 0);
    carGroup.rotation.set(0, 0, 0);

    // Remove barriers
    barrierBodies.forEach(b => physicsWorld.removeBody(b));
    barrierBodies = [];

    // Restore X-Ray capability
    if (carApi?.setRaceMode) carApi.setRaceMode(false);

    // Reset FOV
    camera.fov = BASE_FOV;
    camera.updateProjectionMatrix();

    if (hintTimer) clearTimeout(hintTimer);

    gsap.to(camera.position, {
      x: 5, y: 3, z: 7,
      duration: 2.0, ease: 'power3.inOut',
      onComplete: () => {
        controls.target.set(0, 0.4, 0);
        controls.enabled = true;
        controls.update();
      },
    });

    // UI: restore showroom
    document.getElementById('race-hud')?.classList.add('hidden');
    document.getElementById('xray-controls')?.classList.remove('hidden');
    document.getElementById('team-panel')?.classList.remove('race-hidden');
    document.getElementById('dashboard-panel')?.classList.remove('race-hidden');
    document.getElementById('telemetry-hud')?.classList.remove('race-hidden');
  }

  // ═══════════════════════════════════════
  // LOCAL-MATRIX CHASE CAMERA
  // ═══════════════════════════════════════
  function getChasePos() {
    const p = CHASE_LOCAL.clone();
    carGroup.localToWorld(p);
    return p;
  }
  function getLookTarget() {
    const p = LOOK_LOCAL.clone();
    carGroup.localToWorld(p);
    return p;
  }

  // ═══════════════════════════════════════
  // UPDATE LOOP
  // ═══════════════════════════════════════
  function update(dt) {
    if (!isRacing || !raceTrack) return;

    const curve = raceTrack.curve;
    const trackWidth = TRACK_CONFIG.width;
    const speedRatio = speed / MAX_SPEED;

    // ── Physics step ──
    if (physicsWorld) physicsWorld.step(TIMESTEP, dt);

    // ══════════ WASD CONTROLS ══════════
    if (keys.w) {
      speed = Math.min(speed + ACCEL, MAX_SPEED);
      // Deplete ERS when accelerating hard
      if (speedRatio > 0.6) ersEnergy = Math.max(ersEnergy - 0.0003, 0);
    } else {
      speed = Math.max(speed - DRAG, 0);
    }

    if (keys.s) {
      speed = Math.max(speed - BRAKE_FORCE, 0);
      // Regenerate ERS when braking (kinetic recovery)
      ersEnergy = Math.min(ersEnergy + 0.0008, 1.0);
    }

    if (keys.a) {
      steerOffset = Math.max(steerOffset - STEER_SPEED, -MAX_STEER);
    } else if (keys.d) {
      steerOffset = Math.min(steerOffset + STEER_SPEED, MAX_STEER);
    } else {
      if (steerOffset > 0) steerOffset = Math.max(steerOffset - STEER_RETURN, 0);
      else if (steerOffset < 0) steerOffset = Math.min(steerOffset + STEER_RETURN, 0);
    }

    // ── Track progress ──
    trackProgress += speed;
    if (trackProgress >= 1) {
      trackProgress -= 1;
      lapCount++;
      updateLapDisplay();
    }

    const t = trackProgress % 1;
    const centerPos = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // ── Steering lateral offset ──
    const lateralOffset = steerOffset * (trackWidth / 2) / MAX_STEER * 0.8;
    const carPos = centerPos.clone().add(normal.clone().multiplyScalar(lateralOffset));
    carPos.y += 0.3;

    // ── Clamp to track width ──
    const maxLateral = (trackWidth / 2) - 1.2;
    const actualLateral = carPos.clone().sub(centerPos).dot(normal);
    if (Math.abs(actualLateral) > maxLateral) {
      const clamped = Math.sign(actualLateral) * maxLateral;
      carPos.copy(centerPos).add(normal.clone().multiplyScalar(clamped));
      carPos.y = centerPos.y + 0.3;
      steerOffset *= 0.7;
      speed *= 0.95;
    }

    // ── Smooth position ──
    carGroup.position.lerp(carPos, 0.12);

    // ── Face direction ──
    const lookT = (t + 0.005) % 1;
    const lookTarget = curve.getPoint(lookT);
    lookTarget.y = carGroup.position.y;
    const lookNorm = new THREE.Vector3(
      -curve.getTangent(lookT).z, 0, curve.getTangent(lookT).x
    ).normalize();
    lookTarget.add(lookNorm.clone().multiplyScalar(lateralOffset * 0.5));
    carGroup.lookAt(lookTarget);

    // ── Update world matrix ──
    carGroup.updateMatrixWorld(true);

    // ── Sync physics body ──
    if (carBody) {
      carBody.position.set(carGroup.position.x, carGroup.position.y, carGroup.position.z);
      const q = new THREE.Quaternion();
      carGroup.getWorldQuaternion(q);
      carBody.quaternion.set(q.x, q.y, q.z, q.w);
    }

    // ── Collision response ──
    if (carBody) {
      const v = carBody.velocity;
      if (v.length() > 0.5) {
        carGroup.position.x += v.x * dt * 0.25;
        carGroup.position.z += v.z * dt * 0.25;
      }
    }

    // ══════════ CHASE CAMERA (matrixWorld) ══════════
    const desiredPos = getChasePos();
    const desiredLook = getLookTarget();
    _camPos.lerp(desiredPos, 0.04);
    _camLook.lerp(desiredLook, 0.06);
    camera.position.copy(_camPos);
    camera.lookAt(_camLook);

    // ══════════ SPEED EFFECTS ══════════
    // FOV increases with speed
    const targetFOV = BASE_FOV + (MAX_FOV - BASE_FOV) * speedRatio;
    camera.fov += (targetFOV - camera.fov) * 0.05;
    camera.updateProjectionMatrix();

    // Camera shake at high speed
    if (speedRatio > 0.5) {
      const shakeIntensity = (speedRatio - 0.5) * 2 * SHAKE_MAX;
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
    }

    // ══════════ AUDIO ══════════
    audio.update(speedRatio);

    // ══════════ HUD UPDATES ══════════
    const kmh = Math.round(speed * raceTrack.totalLength * 60 * 3.6);
    const gear = kmh < 80 ? 1 : kmh < 140 ? 2 : kmh < 190 ? 3 :
                 kmh < 240 ? 4 : kmh < 280 ? 5 : kmh < 310 ? 6 :
                 kmh < 330 ? 7 : 8;
    const rpm = Math.round(4000 + speedRatio * 11000); // 4000-15000 RPM

    // Speed
    const spEl = document.getElementById('race-speed');
    if (spEl) spEl.textContent = kmh;

    // Gear
    const grEl = document.getElementById('race-gear');
    if (grEl) grEl.textContent = gear;

    // RPM
    const rpmEl = document.getElementById('race-rpm');
    if (rpmEl) rpmEl.textContent = rpm.toLocaleString();
    const rpmBar = document.getElementById('race-rpm-bar');
    if (rpmBar) {
      const rpmPct = Math.min(speedRatio * 100, 100);
      rpmBar.style.width = `${rpmPct}%`;
      // Red zone above 12000 RPM
      rpmBar.style.background = rpm > 12000
        ? 'linear-gradient(90deg, #00f0ff, #ff0000)'
        : 'linear-gradient(90deg, #00f0ff, #00ff88)';
    }

    // Throttle
    const thEl = document.getElementById('race-throttle');
    if (thEl) thEl.style.width = `${Math.min(speedRatio * 100, 100)}%`;

    // Brake
    const brEl = document.getElementById('race-brake');
    if (brEl) brEl.style.width = keys.s ? '100%' : '0%';

    // ERS
    const ersEl = document.getElementById('race-ers-fill');
    if (ersEl) {
      ersEl.style.width = `${ersEnergy * 100}%`;
      ersEl.style.background = ersEnergy < 0.2
        ? '#ff3300'
        : ersEnergy < 0.5
          ? '#ffaa00'
          : '#00ff88';
    }
    const ersPct = document.getElementById('race-ers-pct');
    if (ersPct) ersPct.textContent = `${Math.round(ersEnergy * 100)}%`;
  }

  function updateLapDisplay() {
    const el = document.getElementById('race-lap');
    if (el) el.textContent = `${lapCount}/3`;
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  initPhysics();
  buildRaceTrack();

  return {
    startRace: transitionToRace,
    stopRace: transitionToShowroom,
    update,
    get isRacing() { return isRacing; },
  };
}
