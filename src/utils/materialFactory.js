/**
 * Material Factory — Shared PBR materials for the F1 Garage Showroom
 * ===================================================================
 */

import * as THREE from 'three';

/**
 * Create body/livery material — glossy metallic paint.
 */
export function createBodyMaterial(hexColor = 0x1e3a6e, envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hexColor),
    metalness: 0.9,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMap,
    envMapIntensity: 1.2,
  });
}

/**
 * Create carbon fiber material — dark with anisotropic sheen.
 */
export function createCarbonMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    metalness: 0.05,
    roughness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMap,
    envMapIntensity: 1.0,
  });
}

/**
 * Create engine metal material — machined aluminium look.
 */
export function createEngineMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x8a8a8a,
    metalness: 0.95,
    roughness: 0.18,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
    emissive: new THREE.Color(0x884400),
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 1.0,
  });
}

/**
 * Create battery material — blue metallic.
 */
export function createBatteryMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0055cc,
    metalness: 0.5,
    roughness: 0.3,
    clearcoat: 0.4,
    emissive: new THREE.Color(0x001166),
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 0.8,
  });
}

/**
 * Create radiator/cooling material — copper/bronze look.
 */
export function createRadiatorMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xb87333,
    metalness: 0.85,
    roughness: 0.25,
    clearcoat: 0.3,
    emissive: new THREE.Color(0x331100),
    emissiveIntensity: 0,
    envMap,
    envMapIntensity: 0.9,
  });
}
