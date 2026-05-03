/**
 * Lighting Module — Ánh sáng Sci-Fi Showroom
 * =============================================
 * Đèn neon xanh cyan, tím, spotlight rọi xe,
 * ambient tối cho bầu không khí tương lai.
 * 
 * Xe đặt tại tâm (0, 0.05, 0)
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Xe ở tâm
const BAY_X = 0;
const BAY_Z = 0;

export function createLighting(scene) {
  RectAreaLightUniformsLib.init();

  const NEON_CYAN = 0x00d2ff;
  const NEON_PURPLE = 0x8b5cf6;
  const COOL_WHITE = 0xe0e8ff;

  // ── 1. KEY LIGHT — Spotlight rọi xuống xe từ trên ──
  const keyLight = new THREE.SpotLight(COOL_WHITE, 800);
  keyLight.position.set(BAY_X, 8, BAY_Z);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.5;
  keyLight.decay = 1.0;
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 20;
  keyLight.target.position.set(BAY_X, 0, BAY_Z);
  scene.add(keyLight);
  scene.add(keyLight.target);

  // ── 2. NEON FILL TRÁI — Ánh neon xanh cyan ──
  const neonLeft = new THREE.SpotLight(NEON_CYAN, 200);
  neonLeft.position.set(BAY_X - 6, 4, BAY_Z + 3);
  neonLeft.angle = Math.PI / 3;
  neonLeft.penumbra = 0.9;
  neonLeft.decay = 1.0;
  neonLeft.target.position.set(BAY_X, 0.5, BAY_Z);
  scene.add(neonLeft);
  scene.add(neonLeft.target);

  // ── 3. NEON FILL PHẢI — Ánh neon tím ──
  const neonRight = new THREE.SpotLight(NEON_PURPLE, 200);
  neonRight.position.set(BAY_X + 6, 4, BAY_Z - 3);
  neonRight.angle = Math.PI / 3;
  neonRight.penumbra = 0.9;
  neonRight.decay = 1.0;
  neonRight.target.position.set(BAY_X, 0.5, BAY_Z);
  scene.add(neonRight);
  scene.add(neonRight.target);

  // ── 4. RIM LIGHT — Viền sáng phía sau xe ──
  const rimLight = new THREE.SpotLight(NEON_CYAN, 350);
  rimLight.position.set(BAY_X, 5, BAY_Z - 7);
  rimLight.angle = Math.PI / 5;
  rimLight.penumbra = 0.5;
  rimLight.decay = 1.0;
  rimLight.target.position.set(BAY_X, 0.5, BAY_Z);
  scene.add(rimLight);
  scene.add(rimLight.target);

  // ── 5. FRONT FILL — Chiếu sáng nhẹ phía trước ──
  const frontFill = new THREE.SpotLight(COOL_WHITE, 200);
  frontFill.position.set(BAY_X, 4, BAY_Z + 8);
  frontFill.angle = Math.PI / 3;
  frontFill.penumbra = 0.8;
  frontFill.decay = 1.2;
  frontFill.target.position.set(BAY_X, 0.3, BAY_Z);
  scene.add(frontFill);
  scene.add(frontFill.target);

  // ── 6. AMBIENT — Tối vừa phải cho bầu không khí sci-fi nhưng vẫn thấy xe rõ ──
  const ambient = new THREE.AmbientLight(0x2a2a50, 3.0);
  scene.add(ambient);

  // ── 7. HEMISPHERE — Trên sáng nhẹ, dưới tối ──
  const hemi = new THREE.HemisphereLight(0x3040a0, 0x101020, 1.5);
  scene.add(hemi);

  // ── 8. NEON STRIP LIGHTS (RectAreaLight) — Dải neon trần ──
  // Dải cyan chính — panel lớn chiếu xuống xe
  const rectCyan = new THREE.RectAreaLight(NEON_CYAN, 15, 10, 2);
  rectCyan.position.set(BAY_X, 6, BAY_Z);
  rectCyan.lookAt(BAY_X, 0, BAY_Z);
  scene.add(rectCyan);

  // Dải tím hai bên
  const rectPurpleL = new THREE.RectAreaLight(NEON_PURPLE, 8, 4, 1);
  rectPurpleL.position.set(BAY_X - 5, 5, BAY_Z);
  rectPurpleL.lookAt(BAY_X - 5, 0, BAY_Z);
  scene.add(rectPurpleL);

  const rectPurpleR = new THREE.RectAreaLight(NEON_PURPLE, 8, 4, 1);
  rectPurpleR.position.set(BAY_X + 5, 5, BAY_Z);
  rectPurpleR.lookAt(BAY_X + 5, 0, BAY_Z);
  scene.add(rectPurpleR);

  // ── 9. NEON TUBE MESHES — Ống đèn neon hiển thị ──
  const cyanTubeMat = new THREE.MeshBasicMaterial({ color: NEON_CYAN });
  const purpleTubeMat = new THREE.MeshBasicMaterial({ color: NEON_PURPLE });

  // Ống neon xanh trần
  for (let z = -4; z <= 4; z += 4) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.03, 0.08),
      cyanTubeMat.clone()
    );
    tube.position.set(BAY_X, 5.8, z);
    scene.add(tube);
  }

  // Ống neon tím bên
  for (let z = -3; z <= 3; z += 6) {
    const tubeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 3),
      purpleTubeMat.clone()
    );
    tubeL.position.set(BAY_X - 5, 5, z);
    scene.add(tubeL);

    const tubeR = tubeL.clone();
    tubeR.position.set(BAY_X + 5, 5, z);
    scene.add(tubeR);
  }

  // Point lights cho phát sáng neon tổng thể
  [
    [NEON_CYAN, 8, BAY_X, 6, BAY_Z],
    [NEON_PURPLE, 5, BAY_X - 5, 4, BAY_Z + 3],
    [NEON_PURPLE, 5, BAY_X + 5, 4, BAY_Z - 3],
    [0x00ffaa, 3, BAY_X - 3, 3, BAY_Z - 5],
    [0xff0066, 2, BAY_X + 3, 3, BAY_Z + 5],
  ].forEach(([c, i, x, y, z]) => {
    const pt = new THREE.PointLight(c, i, 20, 1.2);
    pt.position.set(x, y, z);
    scene.add(pt);
  });

  return { keyLight, neonLeft, neonRight, rimLight };
}
