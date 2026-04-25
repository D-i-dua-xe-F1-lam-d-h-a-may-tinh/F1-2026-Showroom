/**
 * Track Builder — Rewrite v3
 * ============================
 * Traced from the reference image (Hungarian-GP-style circuit).
 *
 * KEY CHANGES:
 *   - Accurate CatmullRomCurve3 control points from reference image
 *   - Returns barrierPositions[] for Cannon.js static wall bodies
 *   - Proper asphalt texture with center line
 *   - Red/white kerbs at tight corners
 *   - Concrete barriers with TecPro styling
 *   - Track width = 10m (realistic)
 */

import * as THREE from 'three';

export const TRACK_CONFIG = {
  width: 10,          // meters — FIA minimum 12m, but scale for visual
  segments: 800,      // curve subdivisions
  kerbWidth: 1.0,     // meters
  barrierHeight: 1.1, // meters
  barrierInset: 0.8,  // distance from track edge to barrier face
};

/**
 * Control points traced from the reference image.
 * The image shows a circuit with:
 *   - Long main straight at bottom (pit lane)
 *   - Turns climbing uphill on the left
 *   - Tight S-curves at the top
 *   - Descending section on the right
 *   - Counter-clockwise direction
 *
 * Coordinate space: X=right, Y=height(elevation), Z=forward(up in image)
 */
function getTrackControlPoints() {
  return [
    // ── START/FINISH STRAIGHT (bottom of image, left→right) ──
    new THREE.Vector3(-40, 0,  -55),
    new THREE.Vector3(-20, 0,  -55),
    new THREE.Vector3(  0, 0,  -55),
    new THREE.Vector3( 20, 0,  -55),
    new THREE.Vector3( 35, 0,  -55),

    // ── T1: Sharp RIGHT uphill ──
    new THREE.Vector3( 45, 0.5, -52),
    new THREE.Vector3( 50, 1.0, -46),
    new THREE.Vector3( 50, 1.5, -38),

    // ── T2-T3: Right-Left chicane ──
    new THREE.Vector3( 46, 2.0, -30),
    new THREE.Vector3( 40, 2.5, -24),
    new THREE.Vector3( 35, 3.0, -20),
    new THREE.Vector3( 38, 3.3, -14),

    // ── T4: Sweeping LEFT uphill ──
    new THREE.Vector3( 42, 3.8, -6),
    new THREE.Vector3( 40, 4.2,  2),
    new THREE.Vector3( 34, 4.5,  8),

    // ── T5-T6: Tight S at top ──
    new THREE.Vector3( 26, 4.8, 14),
    new THREE.Vector3( 18, 4.8, 18),
    new THREE.Vector3( 10, 4.5, 20),
    new THREE.Vector3(  2, 4.2, 18),
    new THREE.Vector3( -5, 3.8, 14),

    // ── T7-T8: Descending right-left ──
    new THREE.Vector3(-12, 3.2,  8),
    new THREE.Vector3(-20, 2.6,  2),
    new THREE.Vector3(-26, 2.0, -4),
    new THREE.Vector3(-30, 1.5,-10),

    // ── T9-T10: Sweeping left, back downhill ──
    new THREE.Vector3(-35, 1.0,-18),
    new THREE.Vector3(-38, 0.6,-26),
    new THREE.Vector3(-42, 0.3,-34),

    // ── T11: Final chicane before straight ──
    new THREE.Vector3(-48, 0.1,-42),
    new THREE.Vector3(-50, 0,  -48),
    new THREE.Vector3(-48, 0,  -52),
  ];
}

// ═══════════════════════════════════════
// PROCEDURAL TEXTURES
// ═══════════════════════════════════════

function createAsphaltMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 512, 512);

  // Grain noise
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const b = 20 + Math.random() * 30;
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Center dashed white line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 25]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  // Edge lines (continuous)
  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#cccccc';
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(30, 512); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(482, 0); ctx.lineTo(482, 512); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 60);

  return new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.82, metalness: 0.0, side: THREE.DoubleSide,
  });
}

function createKerbMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const stripe = 32;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#cc0000' : '#ffffff';
    ctx.fillRect(0, i * stripe, 64, stripe);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, side: THREE.DoubleSide });
}

function createBarrierMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  // TecPro-style: gray base with red/white stripe at top
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 10, 128, 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

// ═══════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════

/**
 * @returns {{
 *   trackGroup: THREE.Group,
 *   curve: THREE.CatmullRomCurve3,
 *   startPosition: THREE.Vector3,
 *   startDirection: THREE.Vector3,
 *   totalLength: number,
 *   barrierData: Array<{position: THREE.Vector3, angle: number, side: string}>
 * }}
 */
export function buildTrack() {
  const trackGroup = new THREE.Group();
  trackGroup.name = 'RACE_TRACK';

  const { width, segments, kerbWidth, barrierHeight, barrierInset } = TRACK_CONFIG;
  const controlPoints = getTrackControlPoints();
  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);

  // ═══════════════════════════════════════
  // 1. TRACK SURFACE
  // ═══════════════════════════════════════
  const trackShape = new THREE.Shape();
  trackShape.moveTo(-width / 2, 0);
  trackShape.lineTo( width / 2, 0);
  trackShape.lineTo( width / 2, -0.12);
  trackShape.lineTo(-width / 2, -0.12);
  trackShape.closePath();

  const trackGeo = new THREE.ExtrudeGeometry(trackShape, {
    steps: segments, bevelEnabled: false, extrudePath: curve,
  });
  const trackMesh = new THREE.Mesh(trackGeo, createAsphaltMaterial());
  trackMesh.receiveShadow = true;
  trackMesh.name = 'TRACK_SURFACE';
  trackGroup.add(trackMesh);

  // ═══════════════════════════════════════
  // 2. BARRIERS — Visual + Physics data
  // ═══════════════════════════════════════
  const barrierMat = createBarrierMaterial();
  const barrierData = []; // Exported for Cannon.js
  const numBarrierSegments = 200;

  for (let i = 0; i < numBarrierSegments; i++) {
    const t = i / numBarrierSegments;
    const pos = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    const barrierOffset = width / 2 + barrierInset;

    // Left barrier (visual)
    const leftPos = pos.clone().add(normal.clone().multiplyScalar(barrierOffset));
    const leftBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, barrierHeight, 2.8),
      barrierMat
    );
    leftBarrier.position.copy(leftPos);
    leftBarrier.position.y = pos.y + barrierHeight / 2;
    leftBarrier.rotation.y = angle;
    leftBarrier.castShadow = true;
    trackGroup.add(leftBarrier);

    // Right barrier (visual)
    const rightPos = pos.clone().sub(normal.clone().multiplyScalar(barrierOffset));
    const rightBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, barrierHeight, 2.8),
      barrierMat
    );
    rightBarrier.position.copy(rightPos);
    rightBarrier.position.y = pos.y + barrierHeight / 2;
    rightBarrier.rotation.y = angle;
    rightBarrier.castShadow = true;
    trackGroup.add(rightBarrier);

    // Store data for Cannon.js bodies
    barrierData.push(
      { position: leftBarrier.position.clone(), angle, side: 'left' },
      { position: rightBarrier.position.clone(), angle, side: 'right' },
    );
  }

  // ═══════════════════════════════════════
  // 3. KERBS at tight corners
  // ═══════════════════════════════════════
  const kerbMat = createKerbMaterial();
  const kerbGeo = new THREE.PlaneGeometry(kerbWidth, 3.5);

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const t2 = (i + 2) / segments;

    const p0 = curve.getPoint(t0 % 1);
    const p1 = curve.getPoint(t1 % 1);
    const p2 = curve.getPoint(t2 % 1);

    const d1 = p1.clone().sub(p0).normalize();
    const d2 = p2.clone().sub(p1).normalize();
    const curvature = 1 - d1.dot(d2);

    if (curvature > 0.006) {
      // Only place one kerb per ~12 segments
      if (i % 12 !== 0) continue;

      const t = t0;
      const pos = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Inner kerb
      const inner = new THREE.Mesh(kerbGeo.clone(), kerbMat);
      inner.position.copy(pos).add(normal.clone().multiplyScalar(width / 2 + 0.15));
      inner.position.y = pos.y + 0.02;
      inner.lookAt(pos.clone().add(tangent));
      inner.rotation.x = -Math.PI / 2;
      inner.receiveShadow = true;
      trackGroup.add(inner);

      // Outer kerb
      const outer = new THREE.Mesh(kerbGeo.clone(), kerbMat);
      outer.position.copy(pos).sub(normal.clone().multiplyScalar(width / 2 + 0.15));
      outer.position.y = pos.y + 0.02;
      outer.lookAt(pos.clone().add(tangent));
      outer.rotation.x = -Math.PI / 2;
      outer.receiveShadow = true;
      trackGroup.add(outer);
    }
  }

  // ═══════════════════════════════════════
  // 4. START/FINISH LINE
  // ═══════════════════════════════════════
  const sfCanvas = document.createElement('canvas');
  sfCanvas.width = 256; sfCanvas.height = 64;
  const sfCtx = sfCanvas.getContext('2d');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 16; c++) {
      sfCtx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111';
      sfCtx.fillRect(c * 16, r * 16, 16, 16);
    }
  }
  const sfLine = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 2),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(sfCanvas),
      roughness: 0.5, side: THREE.DoubleSide,
      transparent: true, polygonOffset: true, polygonOffsetFactor: -1,
    })
  );
  const sfPos = curve.getPoint(0);
  const sfTan = curve.getTangent(0);
  sfLine.position.copy(sfPos);
  sfLine.position.y = sfPos.y + 0.03;
  sfLine.lookAt(sfPos.clone().add(sfTan));
  sfLine.rotation.x = -Math.PI / 2;
  trackGroup.add(sfLine);

  // ═══════════════════════════════════════
  // 5. GROUND + GRASS
  // ═══════════════════════════════════════
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256; grassCanvas.height = 256;
  const gCtx = grassCanvas.getContext('2d');
  gCtx.fillStyle = '#2d6a1e';
  gCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const gx = Math.random() * 256, gy = Math.random() * 256;
    gCtx.fillStyle = `rgb(${30 + Math.random()*30},${80 + Math.random()*40},${15 + Math.random()*20})`;
    gCtx.fillRect(gx, gy, 1, 2 + Math.random() * 3);
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(20, 20);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 250),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;
  ground.receiveShadow = true;
  trackGroup.add(ground);

  // ═══════════════════════════════════════
  // 6. GRANDSTANDS
  // ═══════════════════════════════════════
  const standMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.5, metalness: 0.3 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.8 });

  // Place stands at strategic points
  const standPositions = [
    { t: 0.06, offset: -30, rot: 0,    w: 30, h: 8, d: 6 },  // Main straight (far from spawn)
    { t: 0.20, offset:  22, rot: 0.4,  w: 15, h: 6, d: 4 },  // T1-T2
    { t: 0.50, offset: -20, rot: 1.2,  w: 12, h: 5, d: 4 },  // Top section
    { t: 0.75, offset:  22, rot: 2.8,  w: 14, h: 6, d: 4 },  // Descending
  ];

  standPositions.forEach(sp => {
    const pos = curve.getPoint(sp.t);
    const tangent = curve.getTangent(sp.t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const standPos = pos.clone().add(normal.clone().multiplyScalar(sp.offset));

    const stand = new THREE.Mesh(new THREE.BoxGeometry(sp.w, sp.h, sp.d), standMat);
    stand.position.copy(standPos);
    stand.position.y = pos.y + sp.h / 2;
    stand.rotation.y = sp.rot;
    stand.castShadow = true; stand.receiveShadow = true;
    trackGroup.add(stand);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(sp.w + 1, 0.3, sp.d + 2), roofMat);
    roof.position.copy(standPos);
    roof.position.y = pos.y + sp.h + 0.15;
    roof.rotation.y = sp.rot;
    trackGroup.add(roof);

    // Seat rows (colored blocks)
    for (let row = 0; row < 3; row++) {
      const seats = new THREE.Mesh(
        new THREE.BoxGeometry(sp.w - 1, 0.3, sp.d * 0.25),
        seatMat
      );
      seats.position.copy(standPos);
      seats.position.y = pos.y + 1.5 + row * 2;
      seats.rotation.y = sp.rot;
      trackGroup.add(seats);
    }
  });

  // ═══════════════════════════════════════
  // 7. TREES along track
  // ═══════════════════════════════════════
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
  const treeLeafMats = [
    new THREE.MeshStandardMaterial({ color: 0x2d8a1e, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x3a9e28, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.8 }),
  ];

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const radius = 55 + Math.random() * 35;  // Keep trees far from track
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius - 20;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), treeTrunkMat);
    trunk.position.set(tx, 1.5, tz);
    trackGroup.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.5 + Math.random() * 1, 8, 8),
      treeLeafMats[i % 3]
    );
    crown.position.set(tx, 4 + Math.random() * 1.5, tz);
    crown.castShadow = true;
    trackGroup.add(crown);
  }

  // ═══════════════════════════════════════
  // 8. TRACK LIGHTING
  // ═══════════════════════════════════════
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const pos = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 14, 6),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 })
    );
    const polePos = pos.clone().add(normal.clone().multiplyScalar(width / 2 + 4));
    pole.position.copy(polePos);
    pole.position.y = pos.y + 7;
    trackGroup.add(pole);

    const light = new THREE.PointLight(0xfff5e0, 40, 30, 1.5);
    light.position.copy(polePos);
    light.position.y = pos.y + 14.5;
    trackGroup.add(light);
  }

  // ═══════════════════════════════════════
  // START DATA — spawn at t=0.03 to clear start/finish barriers
  // ═══════════════════════════════════════
  const startT = 0.03;
  const startPosition = curve.getPoint(startT);
  startPosition.y += 0.4;
  const startDirection = curve.getTangent(startT).normalize();

  return {
    trackGroup,
    curve,
    startPosition,
    startDirection,
    totalLength: curve.getLength(),
    barrierData,  // For Cannon.js collision bodies
  };
}
