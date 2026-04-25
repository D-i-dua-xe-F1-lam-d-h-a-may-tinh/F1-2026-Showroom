/**
 * F1 Car Module — Phase 2 Upgrade
 * =================================
 * MeshPhysicalMaterial with:
 *   metalness: 0.9, roughness: 0.05,
 *   clearcoat: 1.0, clearcoatRoughness: 0.02
 *   + HDR envMap injection
 *
 * changeLivery(hexColor) — GSAP color transition
 *
 * GROUP NAMING (for GLB replacement):
 *   CAR_ASSEMBLY > Body_Mesh > [MONOCOQUE, NOSE_CONE, ENGINE_COVER, ...]
 *                > WHEEL_FL/FR/RL/RR
 *                > INTERNALS > [ICE_V6, ENERGY_STORE, MGU_K]
 *
 * GLB SWAP GUIDE:
 *   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
 *   loader.load('/car-body.glb', gltf => {
 *     gltf.scene.traverse(child => {
 *       if (child.isMesh) {
 *         child.material = bodyMaterial.clone();  // apply livery
 *         bodyGroup.add(child.clone());
 *       }
 *     });
 *   });
 */

import * as THREE from 'three';
import gsap from 'gsap';

// ─────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────

/** Primary body material — FIA livery ready */
export function createBodyMaterial(hexColor = 0x1e3a6e, envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hexColor),
    metalness: 0.9,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMap,
    envMapIntensity: 1.2,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });
}

function createCarbonFiberMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,                      // Near-black — real CF base
    metalness: 0.05,                       // Dielectric composite (not metal)
    roughness: 0.35,                       // Lacquered CF is moderately smooth
    clearcoat: 1.0,                        // Full clearcoat — all F1 CF is lacquered
    clearcoatRoughness: 0.05,              // Mirror-like clear layer
    envMap,
    envMapIntensity: 1.0,                  // Strong reflections through clearcoat
    anisotropy: 0.8,                       // Directional reflection (fiber weave)
    anisotropyRotation: Math.PI / 4,       // 45° twill weave pattern
    specularIntensity: 0.6,
    specularColor: new THREE.Color(0x222222),
  });
}

function createMetalMaterial(color = 0x555555) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.95,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  });
}

function createTyreMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.92,
    metalness: 0.0,
  });
}

// ─────────────────────────────────────────────
// CAR BUILDER
// ─────────────────────────────────────────────

export function createCarAssembly(envMap = null) {
  const carGroup = new THREE.Group();
  carGroup.name = 'CAR_ASSEMBLY';

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body_Mesh';

  // Shared livery material — all body panels reference this
  const bodyMat = createBodyMaterial(0x1e3a6e, envMap);
  const carbonMat = createCarbonFiberMaterial(envMap);
  const metalMat = createMetalMaterial();

  // ══════════════════════════════════════════
  // 1. MONOCOQUE (Survival cell)
  // ══════════════════════════════════════════
  const mono = new THREE.Group();
  mono.name = 'MONOCOQUE';

  // Main tub (tapered box using ExtrudeGeometry for chamfers)
  const tubShape = new THREE.Shape();
  tubShape.moveTo(-0.42, 0);
  tubShape.lineTo(-0.32, 0.38);
  tubShape.lineTo(0.32, 0.38);
  tubShape.lineTo(0.42, 0);
  tubShape.closePath();

  const tub = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tubShape, {
      depth: 2.4, bevelEnabled: true,
      bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4,
    }),
    bodyMat
  );
  tub.position.set(0, 0.1, -0.5);
  tub.castShadow = true;
  mono.add(tub);

  // Cockpit surround
  const cockpitSurroundGeo = new THREE.BoxGeometry(0.7, 0.06, 0.8);
  const cockpitSurround = new THREE.Mesh(cockpitSurroundGeo, bodyMat);
  cockpitSurround.position.set(0, 0.51, 0.3);
  mono.add(cockpitSurround);

  // Cockpit opening (dark)
  const cockpitGeo = new THREE.BoxGeometry(0.48, 0.22, 0.65);
  const cockpit = new THREE.Mesh(
    cockpitGeo,
    new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.95 })
  );
  cockpit.position.set(0, 0.5, 0.35);
  mono.add(cockpit);

  // Driver helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0.4, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05,
    })
  );
  helmet.position.set(0, 0.58, 0.36);
  mono.add(helmet);

  bodyGroup.add(mono);

  // ══════════════════════════════════════════
  // 2. NOSE CONE
  // ══════════════════════════════════════════
  const nose = new THREE.Group();
  nose.name = 'NOSE_CONE';

  const nosePoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.14, 0.4),
    new THREE.Vector2(0.22, 0.9),
    new THREE.Vector2(0.28, 1.4),
    new THREE.Vector2(0.32, 2.0),
    new THREE.Vector2(0.04, 2.4),
    new THREE.Vector2(0, 2.4),
  ];
  const noseGeom = new THREE.LatheGeometry(nosePoints, 20);
  const noseMesh = new THREE.Mesh(noseGeom, bodyMat);
  noseMesh.rotation.x = Math.PI / 2;
  noseMesh.position.set(0, 0.18, 2.8);
  noseMesh.scale.y = 0.48;
  noseMesh.castShadow = true;
  nose.add(noseMesh);

  // Nose tip step
  const noseTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.55),
    bodyMat
  );
  noseTip.position.set(0, 0.09, 4.8);
  nose.add(noseTip);

  bodyGroup.add(nose);

  // ══════════════════════════════════════════
  // 3. ENGINE COVER
  // ══════════════════════════════════════════
  const engCover = new THREE.Group();
  engCover.name = 'ENGINE_COVER';

  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(-0.36, 0);
  cowlShape.lineTo(-0.26, 0.48);
  cowlShape.lineTo(0.26, 0.48);
  cowlShape.lineTo(0.36, 0);
  cowlShape.closePath();

  const cowl = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cowlShape, {
      depth: 2.1, bevelEnabled: true,
      bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4,
    }),
    bodyMat
  );
  cowl.position.set(0, 0.12, -2.5);
  cowl.castShadow = true;
  engCover.add(cowl);

  // Air intake (T-cam area)
  const intake = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.32, 0.38),
    carbonMat
  );
  intake.position.set(0, 0.68, -0.22);
  engCover.add(intake);

  // Shark fin
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0, 0.38);
  finShape.lineTo(1.6, 0.33);
  finShape.lineTo(1.9, 0);
  finShape.closePath();
  const fin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(finShape, { depth: 0.012, bevelEnabled: false }),
    bodyMat
  );
  fin.rotation.y = Math.PI / 2;
  fin.position.set(0.006, 0.62, -0.55);
  engCover.add(fin);

  bodyGroup.add(engCover);

  // ══════════════════════════════════════════
  // 4. SIDEPODS
  // ══════════════════════════════════════════
  function makeSidepod(side) {
    const g = new THREE.Group();
    g.name = side > 0 ? 'SIDEPOD_RIGHT' : 'SIDEPOD_LEFT';

    const podShape = new THREE.Shape();
    podShape.moveTo(0, 0);
    podShape.lineTo(0, 0.28);
    podShape.lineTo(0.58, 0.32);
    podShape.lineTo(0.62, 0);
    podShape.closePath();

    const pod = new THREE.Mesh(
      new THREE.ExtrudeGeometry(podShape, {
        depth: 1.7, bevelEnabled: true,
        bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2,
      }),
      bodyMat
    );
    pod.position.set(side * 0.38, 0.08, -0.65);
    pod.scale.x = side;
    pod.castShadow = true;
    g.add(pod);

    // Inlet
    const inlet = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.2, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.95 })
    );
    inlet.position.set(side * 0.52, 0.32, 0.85);
    g.add(inlet);

    return g;
  }
  bodyGroup.add(makeSidepod(-1));
  bodyGroup.add(makeSidepod(1));

  // ══════════════════════════════════════════
  // 5. FRONT WING
  // ══════════════════════════════════════════
  const fw = new THREE.Group();
  fw.name = 'FRONT_WING';

  const fwMain = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.02, 0.38),
    bodyMat
  );
  fwMain.position.set(0, 0.06, 4.62);
  fwMain.castShadow = true;
  fw.add(fwMain);

  [0.04, 0.08, 0.12].forEach((yOff, i) => {
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(1.75 - i * 0.05, 0.012, 0.18 - i * 0.02),
      bodyMat
    );
    flap.position.set(0, 0.06 + yOff, 4.44 - i * 0.05);
    flap.rotation.x = -0.12 - i * 0.08;
    fw.add(flap);
  });

  // Endplates
  [-0.92, 0.92].forEach(x => {
    const ep = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.14, 0.42),
      bodyMat
    );
    ep.position.set(x, 0.09, 4.6);
    ep.castShadow = true;
    fw.add(ep);
  });

  bodyGroup.add(fw);

  // ══════════════════════════════════════════
  // 6. REAR WING
  // ══════════════════════════════════════════
  const rw = new THREE.Group();
  rw.name = 'REAR_WING';

  const rwMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.016, 0.26),
    bodyMat
  );
  rwMain.position.set(0, 1.02, -3.92);
  rwMain.rotation.x = 0.18;
  rwMain.castShadow = true;
  rw.add(rwMain);

  const rwFlap = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.013, 0.15),
    bodyMat
  );
  rwFlap.position.set(0, 1.08, -3.87);
  rwFlap.rotation.x = 0.32;
  rw.add(rwFlap);

  // Endplates
  [-0.47, 0.47].forEach(x => {
    const epShape = new THREE.Shape();
    epShape.moveTo(0, 0);
    epShape.lineTo(0, 0.62);
    epShape.lineTo(0.38, 0.58);
    epShape.lineTo(0.48, 0);
    epShape.closePath();
    const ep = new THREE.Mesh(
      new THREE.ExtrudeGeometry(epShape, { depth: 0.013, bevelEnabled: false }),
      bodyMat
    );
    ep.position.set(x, 0.44, -4.12);
    ep.castShadow = true;
    rw.add(ep);
  });

  // Pylons
  [-0.2, 0.2].forEach(x => {
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.52, 0.03),
      carbonMat
    );
    pylon.position.set(x, 0.66, -3.97);
    rw.add(pylon);
  });

  // Beam wing
  const beamWing = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.01, 0.1),
    carbonMat
  );
  beamWing.position.set(0, 0.5, -3.93);
  rw.add(beamWing);

  bodyGroup.add(rw);

  // ══════════════════════════════════════════
  // 7. FLOOR / UNDERBODY
  // ══════════════════════════════════════════
  const floorBody = new THREE.Group();
  floorBody.name = 'FLOOR_BODY';

  const bodyFloor = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.025, 4.6),
    carbonMat
  );
  bodyFloor.position.set(0, 0.035, 0.5);
  bodyFloor.castShadow = true;
  floorBody.add(bodyFloor);

  // Outer floor edges
  [-0.74, 0.74].forEach(x => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 4.3), carbonMat);
    edge.position.set(x, 0.055, 0.5);
    floorBody.add(edge);
  });

  // Diffuser
  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.18, 0.55),
    carbonMat
  );
  diffuser.position.set(0, 0.1, -4.05);
  diffuser.rotation.x = 0.28;
  floorBody.add(diffuser);

  // FIA Skid plank (wood — gold strip)
  const plank = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.007, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xc8920e, roughness: 0.6 })
  );
  plank.position.set(0, 0.012, 0.5);
  floorBody.add(plank);

  bodyGroup.add(floorBody);

  // ══════════════════════════════════════════
  // 8. HALO
  // ══════════════════════════════════════════
  const halo = new THREE.Group();
  halo.name = 'HALO';

  const haloMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a, metalness: 0.8, roughness: 0.2, clearcoat: 0.5,
  });

  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.026, 10, 28, Math.PI),
    haloMat
  );
  haloRing.position.set(0, 0.62, 0.22);
  haloRing.rotation.y = Math.PI;
  haloRing.rotation.x = Math.PI / 2;
  halo.add(haloRing);

  const haloCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.52, 8),
    haloMat
  );
  haloCenter.position.set(0, 0.6, 0.88);
  haloCenter.rotation.x = Math.PI / 2 - 0.28;
  halo.add(haloCenter);

  bodyGroup.add(halo);

  // ══════════════════════════════════════════
  // 9. WHEELS
  // ══════════════════════════════════════════
  const tyreMat = createTyreMaterial();
  const rimMat = createMetalMaterial(0x222222);

  function makeWheel(name, x, y, z) {
    const g = new THREE.Group();
    g.name = name;

    // Tyre
    const tyre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.27, 28),
      tyreMat
    );
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    g.add(tyre);

    // Rim
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.28, 20),
      rimMat
    );
    rim.rotation.z = Math.PI / 2;
    g.add(rim);

    // Rim spokes
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.275, 0.035, 0.035),
        rimMat
      );
      spoke.rotation.x = (s / 5) * Math.PI * 2;
      spoke.position.y = 0;
      rim.add(spoke);
    }

    // Tyre red stripe (Pirelli)
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.009, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4 })
    );
    stripe.rotation.y = Math.PI / 2;
    stripe.position.x = 0.1;
    g.add(stripe);

    g.position.set(x, y, z);
    return g;
  }

  const wheelDefs = {
    WHEEL_FL: [-0.74, 0.34, 3.25],
    WHEEL_FR: [0.74, 0.34, 3.25],
    WHEEL_RL: [-0.7, 0.34, -3.22],
    WHEEL_RR: [0.7, 0.34, -3.22],
  };
  Object.entries(wheelDefs).forEach(([name, pos]) => carGroup.add(makeWheel(name, ...pos)));

  // ══════════════════════════════════════════
  // 10. SUSPENSION ARMS
  // ══════════════════════════════════════════
  const suspMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
  function makeArm(from, to) {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const dir = t.clone().sub(f);
    const len = dir.length();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, len, 6), suspMat);
    arm.position.copy(f.clone().add(t).multiplyScalar(0.5));
    arm.lookAt(t);
    arm.rotateX(Math.PI / 2);
    return arm;
  }

  const arms = [
    // Front
    [[-0.38, 0.26, 2.85], [-0.74, 0.34, 3.25]],
    [[-0.34, 0.2, 2.2], [-0.74, 0.34, 3.25]],
    [[0.38, 0.26, 2.85], [0.74, 0.34, 3.25]],
    [[0.34, 0.2, 2.2], [0.74, 0.34, 3.25]],
    // Rear
    [[-0.34, 0.2, -2.45], [-0.7, 0.34, -3.22]],
    [[-0.3, 0.15, -1.85], [-0.7, 0.34, -3.22]],
    [[0.34, 0.2, -2.45], [0.7, 0.34, -3.22]],
    [[0.3, 0.15, -1.85], [0.7, 0.34, -3.22]],
  ];
  arms.forEach(([f, t]) => carGroup.add(makeArm(f, t)));

  // ══════════════════════════════════════════
  // FINAL ASSEMBLY
  // ══════════════════════════════════════════
  carGroup.add(bodyGroup);

  // ══════════════════════════════════════════
  // 11. TAIL LIGHTS (Emissive glow — visible in race)
  // ══════════════════════════════════════════
  const tailLightMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.95,
  });

  // Main LED strip
  const tailStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.035, 0.02),
    tailLightMat
  );
  tailStrip.position.set(0, 0.52, -4.42);
  tailStrip.name = 'TAIL_LIGHT_STRIP';
  bodyGroup.add(tailStrip);

  // Individual LED dots
  for (let i = 0; i < 7; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    dot.position.set(-0.27 + i * 0.09, 0.52, -4.44);
    dot.name = 'TAIL_LED';
    bodyGroup.add(dot);
  }

  // Tail light glow (larger, semi-transparent)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 0.3,
  });
  const tailGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.12),
    glowMat
  );
  tailGlow.position.set(0, 0.52, -4.46);
  tailGlow.name = 'TAIL_GLOW';
  bodyGroup.add(tailGlow);

  // ══════════════════════════════════════════
  // 12. STEERING WHEEL DISPLAY (Emissive screen)
  // ══════════════════════════════════════════
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.85,
  });
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.06, 0.005),
    screenMat
  );
  screen.position.set(0, 0.48, 0.65);
  screen.rotation.x = -0.4;
  screen.name = 'STEERING_DISPLAY';
  bodyGroup.add(screen);

  // Steering wheel rim
  const wheelRimMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a, metalness: 0.6, roughness: 0.3, clearcoat: 0.8,
  });
  const steeringRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.012, 8, 20, Math.PI * 1.4),
    wheelRimMat
  );
  steeringRim.position.set(0, 0.46, 0.66);
  steeringRim.rotation.x = -0.4;
  steeringRim.rotation.z = Math.PI * 0.15;
  steeringRim.name = 'STEERING_WHEEL';
  bodyGroup.add(steeringRim);

  /**
   * Smoothly change the car livery color using GSAP.
   * @param {string|number} hexColor — e.g. '#dc0000' or 0xdc0000
   * @param {number} duration — seconds
   */
  function changeLivery(hexColor, duration = 0.9) {
    const target = new THREE.Color(hexColor);

    bodyGroup.traverse((child) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (!mat || mat.type !== 'MeshPhysicalMaterial') return;

      // Only update materials that are clearly "livery" (not carbon black)
      const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      const targetLum = target.r * 0.299 + target.g * 0.587 + target.b * 0.114;
      if (mat.roughness > 0.5 && mat.metalness < 0.5) return; // Skip carbon

      gsap.to(mat.color, {
        r: target.r,
        g: target.g,
        b: target.b,
        duration,
        ease: 'power2.inOut',
      });
    });
  }

  /**
   * Force race-ready state: kill all X-ray effects, restore full opacity.
   * Called when transitioning to race mode.
   * @param {boolean} isActive — true = race mode ON (full opacity, no xray)
   */
  function setRaceMode(isActive) {
    if (isActive) {
      // Force ALL body meshes to full opacity — kill X-ray
      bodyGroup.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.depthWrite = true;
        child.material.needsUpdate = true;
      });

      // Also reset internal components opacity
      carGroup.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        if (child.material.transparent && child.material.opacity < 1.0) {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.needsUpdate = true;
        }
      });

      console.log('[Car] Race mode ON — X-ray disabled, full opacity');
    }
    // When isActive = false (returning to showroom), the X-ray system
    // will reset via xrayControls.js setMode('normal')
  }

  return { carGroup, bodyGroup, bodyMaterial: bodyMat, changeLivery, setRaceMode };
}
