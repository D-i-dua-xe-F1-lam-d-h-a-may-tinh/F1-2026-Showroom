/**
 * Platform Module — Garage display platform
 * ==============================================
 * Transparent rotating platform that sits inside the 
 * garage bay markings. The car sits on this and can rotate.
 */

import * as THREE from 'three';

/**
 * Create the rotating display platform.
 * Sized to fit within the garage bay markings (~5.5m square).
 * @param {THREE.Texture} envMap
 * @returns {{ platformGroup: THREE.Group, platformMesh: THREE.Mesh, ring: THREE.Mesh }}
 */
export function createPlatform(envMap) {
  const platformGroup = new THREE.Group();
  platformGroup.name = 'PLATFORM_GROUP';

  // ── Main platform — low profile disc that fits inside bay markings ──
  // Left bay is ~2.53m wide, so radius ~1.2m
  const RADIUS = 1.2;
  const geo = new THREE.CylinderGeometry(RADIUS, RADIUS + 0.1, 0.06, 64);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x3a3a42,
    metalness: 0.5,
    roughness: 0.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    envMap,
    envMapIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
  });
  const platformMesh = new THREE.Mesh(geo, mat);
  platformMesh.receiveShadow = true;
  platformMesh.castShadow = false;
  platformMesh.position.y = 0.01;
  platformMesh.name = 'PLATFORM_DISC';
  platformGroup.add(platformMesh);

  // ── Platform edge ring — red accent ──
  const ringGeo = new THREE.TorusGeometry(RADIUS + 0.05, 0.025, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe10600,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = 'PLATFORM_RING';
  platformGroup.add(ring);

  // ── Inner ring — subtle accent ──
  const innerRingGeo = new THREE.TorusGeometry(RADIUS * 0.7, 0.015, 12, 64);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xe10600,
    transparent: true,
    opacity: 0.2,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.04;
  platformGroup.add(innerRing);

  // ── Platform surface detail lines (radial) ──
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const lineGeo = new THREE.BoxGeometry(0.008, 0.001, RADIUS * 0.8);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x555566,
      transparent: true,
      opacity: 0.2,
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(
      Math.cos(angle) * RADIUS * 0.5,
      0.042,
      Math.sin(angle) * RADIUS * 0.5
    );
    line.rotation.y = angle;
    platformGroup.add(line);
  }

  return { platformGroup, platformMesh, ring };
}

/**
 * Update platform rotation (call in animation loop).
 * @param {THREE.Group} platformGroup
 * @param {number} deltaTime — seconds
 * @param {number} rpm — revolutions per minute (default: ~8.6 for 7s/rev)
 */
export function updatePlatform(platformGroup, deltaTime, rpm = 8.57) {
  const radiansPerSecond = (rpm / 60) * Math.PI * 2;
  platformGroup.rotation.y += radiansPerSecond * deltaTime;
}
