/**
 * Internal Powertrain Components — Phase 2
 * ==========================================
 * ICE_V6, ENERGY_STORE, MGU_K
 * Each has: MeshPhysicalMaterial + pulsing emissive glow
 * World-coordinate camera targets for X-Ray fly-to
 */

import * as THREE from 'three';
import gsap from 'gsap';

export const componentInfo = {
  engine: {
    name: 'V6 Internal Combustion Engine',
    description:
      'Động cơ V6 1.6L Turbo, công suất ≈400kW (544 mã lực). Theo FIA 2026, ICE vận hành cùng MGU-K (không còn MGU-H). Giới hạn tốc độ 15,000 RPM. Suất tiêu thụ nhiên liệu ≤100 kg/h.',
  },
  battery: {
    name: 'Energy Store (Battery Pack)',
    description:
      'Bộ pin Lithium-ion, dung lượng tối đa 4.0 MJ theo FIA 2026 — tăng 300% so với thế hệ 2022. Cung cấp điện cho MGU-K trong chế độ Boost và nạp lại khi phanh tái sinh.',
  },
  mguk: {
    name: 'MGU-K — Motor Generator Unit (Kinetic)',
    description:
      'Công suất tối đa 350kW (FIA 2026) — tăng gấp 3 so với 120kW hiện tại. Thu hồi năng lượng khi phanh và hỗ trợ tăng tốc. Hoạt động trên trục bánh sau.',
  },
};

let _glowTweens = {};

/**
 * Create all internal powertrain placeholders
 * @param {THREE.Texture} envMap — from PMREMGenerator
 */
export function createInternalComponents(envMap = null) {
  const internalsGroup = new THREE.Group();
  internalsGroup.name = 'INTERNALS';

  const components = {};

  // ══════════════════════════════════════════
  // 1. V6 ICE
  // ══════════════════════════════════════════
  const iceGroup = new THREE.Group();
  iceGroup.name = 'ICE_V6';

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0x7a7a7a, metalness: 0.9, roughness: 0.2,
    clearcoat: 0.6, clearcoatRoughness: 0.15,
    emissive: new THREE.Color(0x884400), emissiveIntensity: 0,
    envMap, envMapIntensity: 0.8,
  });

  // Engine block
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.75), iceMat);
  block.position.set(0, 0.36, -1.3);
  block.castShadow = true;
  iceGroup.add(block);

  // V6 cylinder banks (3+3)
  const cylMat = iceMat.clone();
  cylMat.color.set(0x888888);
  for (let i = 0; i < 3; i++) {
    [-0.13, 0.13].forEach((sx, si) => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.32, 10), cylMat);
      cyl.position.set(sx, 0.58, -1.06 - i * 0.23);
      cyl.rotation.z = si === 0 ? -0.3 : 0.3;
      iceGroup.add(cyl);
    });
  }

  // Turbocharger
  const turboMat = new THREE.MeshPhysicalMaterial({
    color: 0x999999, metalness: 0.95, roughness: 0.1,
    emissive: new THREE.Color(0x441100), emissiveIntensity: 0,
    envMap, envMapIntensity: 1.0,
  });
  const turbo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.17, 14), turboMat);
  turbo.position.set(0, 0.3, -1.9);
  turbo.rotation.x = Math.PI / 2;
  iceGroup.add(turbo);

  // Exhaust pipes
  const exhMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.45 });
  [-0.14, 0.14].forEach(sx => {
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.032, 0.9, 8), exhMat);
    exh.position.set(sx, 0.24, -2.25);
    exh.rotation.x = Math.PI / 2 + 0.2;
    iceGroup.add(exh);
  });

  components.engine = {
    group: iceGroup,
    materials: [iceMat, cylMat, turboMat],
    emissiveColor: new THREE.Color(0xff6600),
    cameraTarget: new THREE.Vector3(0, 0.4, -1.3),
    cameraPosition: new THREE.Vector3(1.8, 1.4, -0.6),
  };
  internalsGroup.add(iceGroup);

  // ══════════════════════════════════════════
  // 2. ENERGY STORE (Battery) — FIX #4: Premium Upgrade
  // ══════════════════════════════════════════
  const battGroup = new THREE.Group();
  battGroup.name = 'ENERGY_STORE';

  // Primary battery housing — metallic with high reflectivity
  const battMat = new THREE.MeshStandardMaterial({
    color: 0x1a3366,
    metalness: 1.0,
    roughness: 0.2,
    emissive: new THREE.Color(0x003366),
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 1.2,
  });

  // Main housing — taller, more substantial
  const battBox = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.18, 1.0), battMat);
  battBox.position.set(0, 0.12, -0.22);
  battBox.castShadow = true;
  battGroup.add(battBox);

  // Top cover plate — polished aluminum look
  const coverMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.95,
    roughness: 0.1,
    envMap,
    envMapIntensity: 1.0,
  });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.98), coverMat);
  cover.position.set(0, 0.22, -0.22);
  battGroup.add(cover);

  // ── Cell grid — taller, with cyan emissive ──
  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x002255,
    metalness: 1.0,
    roughness: 0.2,
    emissive: new THREE.Color(0x00aaff),   // Cyan emissive
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 0.8,
  });

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(0.072, 0.10, 0.16),
        cellMat.clone()
      );
      cell.position.set(-0.24 + col * 0.095, 0.28, -0.52 + row * 0.26);
      cell.castShadow = true;
      battGroup.add(cell);
    }
  }

  // ── Conductor strips between cell rows (copper/orange) ──
  const conductorMat = new THREE.MeshStandardMaterial({
    color: 0xcc6600,
    metalness: 0.9,
    roughness: 0.15,
    emissive: new THREE.Color(0xff6600),   // Orange emissive
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 0.8,
  });

  for (let row = 0; row < 2; row++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.008, 0.04),
      conductorMat.clone()
    );
    strip.position.set(0, 0.34, -0.39 + row * 0.26);
    battGroup.add(strip);
  }

  // ── HV connectors — bright orange with emissive glow ──
  const connMat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: new THREE.Color(0xff4400),
    emissiveIntensity: 0.5,
    metalness: 0.7,
    roughness: 0.2,
  });
  [-0.32, 0.32].forEach(sx => {
    const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), connMat);
    conn.position.set(sx, 0.28, -0.22);
    battGroup.add(conn);
  });

  // ── Status LED indicators on battery ──
  const ledMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), ledMat.clone());
    led.position.set(-0.15 + i * 0.1, 0.235, 0.26);
    battGroup.add(led);
  }

  // HV cable (TubeGeometry spline)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.32, 0.28, -0.22),
    new THREE.Vector3(0.52, 0.38, -0.55),
    new THREE.Vector3(0.42, 0.40, -1.05),
    new THREE.Vector3(0.18, 0.35, -1.32),
  ]);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cableCurve, 24, 0.015, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0xff6000,
      roughness: 0.4,
      emissive: new THREE.Color(0x662200),
      emissiveIntensity: 0.2,
    })
  );
  battGroup.add(cable);

  // Collect ALL battery materials for glow system
  const allBattMats = [battMat, cellMat, conductorMat];
  // Also collect cloned materials from cells
  battGroup.traverse(child => {
    if (child.isMesh && child.material && child.material !== battMat &&
        child.material !== coverMat && child.material !== connMat &&
        child.material !== ledMat && !allBattMats.includes(child.material)) {
      allBattMats.push(child.material);
    }
  });

  components.battery = {
    group: battGroup,
    materials: allBattMats,
    emissiveColor: new THREE.Color(0x00ccff),    // Bright cyan glow
    cameraTarget: new THREE.Vector3(0, 0.22, -0.22),
    cameraPosition: new THREE.Vector3(1.4, 1.1, 0.6),
  };
  internalsGroup.add(battGroup);

  // ══════════════════════════════════════════
  // 3. MGU-K
  // ══════════════════════════════════════════
  const mgukGroup = new THREE.Group();
  mgukGroup.name = 'MGU_K';

  const mgukMat = new THREE.MeshPhysicalMaterial({
    color: 0x00aa55, metalness: 0.8, roughness: 0.18,
    clearcoat: 0.7, emissive: new THREE.Color(0x003311), emissiveIntensity: 0,
    envMap, envMapIntensity: 0.9,
  });

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.22, 18), mgukMat);
  motor.position.set(0, 0.2, -2.82);
  motor.rotation.z = Math.PI / 2;
  motor.castShadow = true;
  mgukGroup.add(motor);

  // Cooling fins
  for (let i = 0; i < 10; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.24, 0.24), mgukMat.clone());
    fin.position.set(-0.1 + i * 0.022, 0.2, -2.82);
    mgukGroup.add(fin);
  }

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.95, roughness: 0.1 })
  );
  shaft.position.set(0, 0.2, -2.82);
  shaft.rotation.z = Math.PI / 2;
  mgukGroup.add(shaft);

  // Electrical connectors
  const elecMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.4 });
  [0.33, 0.07].forEach(y => {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.065, 8), elecMat);
    e.position.set(0, y, -2.82);
    mgukGroup.add(e);
  });

  components.mguk = {
    group: mgukGroup,
    materials: [mgukMat],
    emissiveColor: new THREE.Color(0x00ff88),
    cameraTarget: new THREE.Vector3(0, 0.2, -2.82),
    cameraPosition: new THREE.Vector3(1.0, 0.9, -2.15),
  };
  internalsGroup.add(mgukGroup);

  // ══════════════════════════════════════════
  // GLOW CONTROLS
  // ══════════════════════════════════════════

  /**
   * Activate pulsing emissive glow on a component.
   * Battery gets extra-strong pulsing for "active electronics" feel.
   * @param {string} key — 'engine' | 'battery' | 'mguk'
   */
  function activateGlow(key) {
    const comp = components[key];
    if (!comp) return;

    // Stop any existing tween
    if (_glowTweens[key]) _glowTweens[key].kill();

    comp.materials.forEach(mat => {
      mat.emissive.copy(comp.emissiveColor);
    });

    // Battery gets STRONGER pulsing (FIX #4)
    const isBattery = key === 'battery';
    const peakIntensity = isBattery ? 2.5 : 1.8;
    const pulseMin = isBattery ? 1.0 : 0.6;
    const pulseMax = isBattery ? 1.8 : 1.2;
    const pulseDuration = isBattery ? 0.8 : 1.2;

    // Initial flash
    const obj = { intensity: 0 };
    _glowTweens[key] = gsap.to(obj, {
      intensity: peakIntensity,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        comp.materials.forEach(mat => {
          mat.emissiveIntensity = obj.intensity;
        });
      },
      onComplete: () => {
        // Continuous rhythmic pulse
        _glowTweens[key] = gsap.fromTo(obj,
          { intensity: pulseMin },
          {
            intensity: pulseMax,
            duration: pulseDuration,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
              comp.materials.forEach(mat => {
                mat.emissiveIntensity = obj.intensity;
              });
            },
          }
        );
      },
    });
  }

  /** Remove all glows */
  function deactivateAllGlows() {
    Object.keys(_glowTweens).forEach(key => {
      if (_glowTweens[key]) _glowTweens[key].kill();
    });
    _glowTweens = {};

    Object.values(components).forEach(comp => {
      comp.materials.forEach(mat => {
        gsap.to(mat, { emissiveIntensity: 0, duration: 0.4 });
      });
    });
  }

  return { internalsGroup, components, activateGlow, deactivateAllGlows };
}
