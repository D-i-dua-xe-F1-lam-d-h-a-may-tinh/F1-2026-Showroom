/**
 * Environment Module — Môi trường Sci-Fi Showroom
 * ==================================================
 * Sàn phản chiếu tối, HDR neon reflections, 
 * contact shadow dưới xe, bầu không khí tương lai.
 */

import * as THREE from 'three';

/**
 * Tạo HDR environment phong cách Sci-Fi.
 * Đèn neon xanh/tím, tường kim loại tối, phản chiếu mạnh.
 */
export function createHDREnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  // Nền tối — không gian vũ trụ / hangar
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(50, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a0a1a, side: THREE.BackSide })
  ));

  // Tấm đèn neon trần — phản chiếu xanh cyan trên thân xe
  const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide });
  const neonPurple = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide });

  // Dải neon trần chính
  const mainStrip = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.8), neonCyan);
  mainStrip.position.set(0, 28, 0);
  mainStrip.rotation.x = Math.PI / 2;
  envScene.add(mainStrip);

  // Dải neon tím hai bên
  for (let i = -1; i <= 1; i += 2) {
    const sideStrip = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.5), neonPurple.clone());
    sideStrip.position.set(i * 10, 26, 0);
    sideStrip.rotation.x = Math.PI / 2;
    envScene.add(sideStrip);
  }

  // Tường kim loại phản chiếu — tối với ánh neon
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e, side: THREE.DoubleSide });

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), wallMat);
  leftWall.position.set(-22, 6, 0);
  leftWall.rotation.y = Math.PI / 2;
  envScene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), wallMat.clone());
  rightWall.position.set(22, 6, 0);
  rightWall.rotation.y = -Math.PI / 2;
  envScene.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), wallMat.clone());
  backWall.position.set(0, 6, -20);
  envScene.add(backWall);

  // Sàn phản chiếu — tối nhưng bóng loáng
  const floorRefl = new THREE.Mesh(
    new THREE.PlaneGeometry(35, 35),
    new THREE.MeshBasicMaterial({ color: 0x0d0d1a, side: THREE.DoubleSide })
  );
  floorRefl.position.y = -2;
  floorRefl.rotation.x = Math.PI / 2;
  envScene.add(floorRefl);

  // Đèn neon cho phản chiếu phức tạp
  [
    [0x00d2ff, 5, 0, 28, 0],     // Neon xanh trần
    [0x8b5cf6, 3, 10, 22, 5],    // Neon tím phải
    [0x8b5cf6, 3, -10, 22, -5],  // Neon tím trái
    [0x00ffaa, 2, -18, 8, -12],  // Neon xanh lá accent
    [0xff0066, 1.5, 12, 6, -18], // Neon hồng accent
  ].forEach(([c, i, x, y, z]) => {
    const l = new THREE.PointLight(c, i, 60);
    l.position.set(x, y, z);
    envScene.add(l);
  });

  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return envMap;
}

/**
 * Xây dựng môi trường Sci-Fi showroom.
 */
export function createEnvironment(scene, renderer) {
  // Nền tối tương lai
  scene.background = new THREE.Color(0x06080f);

  // Sương mù nhẹ cho chiều sâu
  scene.fog = new THREE.FogExp2(0x06080f, 0.015);

  // HDR Environment
  const envMap = createHDREnvironment(renderer);
  scene.environment = envMap;

  // ── Sàn chính — Bê tông tối bóng loáng ──
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x121218,
    metalness: 0.3,
    roughness: 0.2,
    envMap,
    envMapIntensity: 0.6,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  floor.name = 'FLOOR';
  scene.add(floor);

  // ── Vùng bóng tiếp xúc dưới xe ──
  const cShadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
  );
  cShadow.rotation.x = -Math.PI / 2;
  cShadow.position.set(0, 0.003, 0); // Xe ở tâm (0, 0, 0)
  cShadow.name = 'CONTACT_SHADOW';
  scene.add(cShadow);

  // ── Vạch neon sàn trang trí ──
  const neonLineMat = new THREE.MeshBasicMaterial({
    color: 0x00d2ff,
    transparent: true,
    opacity: 0.3,
  });

  // Vạch dọc hai bên xe
  for (let i = -1; i <= 1; i += 2) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.005, 12),
      neonLineMat.clone()
    );
    line.position.set(i * 3, 0.002, 0);
    scene.add(line);
  }

  // Vạch ngang trước/sau xe
  for (let z = -5; z <= 5; z += 10) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.005, 0.02),
      neonLineMat.clone()
    );
    line.position.set(0, 0.002, z);
    scene.add(line);
  }

  return { envMap };
}
