/**
 * GLB Model Loader — Phase 2
 * ============================
 * Loads .glb files with automatic FIA wheelbase correction.
 *
 * Wheelbase fix: scale = 3.4 / 6.47 ≈ 0.5254
 * Centers the pivot at the geometric center of the 3.4m wheelbase.
 *
 * Expected mesh names in GLB:
 *   MCL39_Bodywork   — Main body shell (receives livery material)
 *   Engine_V6_Core   — ICE V6 powertrain
 *   Battery_Pack     — Energy Store
 *   FRONT_WING       — Front wing assembly
 *   REAR_WING        — Rear wing assembly
 *   MGU_K            — Motor Generator Unit (if present)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// FIA 2026 Wheelbase
const FIA_WHEELBASE = 3.4;     // meters (FIA max 3,400mm)
const MODEL_WHEELBASE = 6.47;  // meters (original CAD measurement)
const SCALE_FACTOR = FIA_WHEELBASE / MODEL_WHEELBASE; // ≈ 0.5254

/**
 * Create the livery-ready MeshPhysicalMaterial for bodywork.
 * clearcoat: 1.0, roughness: 0.35, anisotropy: 0.8 for carbon-fiber look.
 */
export function createGLBBodyMaterial(hexColor = 0x1e3a6e, envMap = null) {
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

export function createGLBCarbonMaterial(envMap = null) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    metalness: 0.05,
    roughness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMap,
    envMapIntensity: 1.0,
    anisotropy: 0.8,
    anisotropyRotation: Math.PI / 4,
  });
}

/**
 * Load a GLB model, auto-correct wheelbase, center pivot, assign materials.
 *
 * @param {string} url — Path to .glb file (e.g. '/models/f1-car.glb')
 * @param {THREE.Texture} envMap — HDR environment map
 * @param {Function} onProgress — Progress callback (0–1)
 * @returns {Promise<{
 *   carGroup: THREE.Group,
 *   bodyGroup: THREE.Group,
 *   meshMap: Record<string, THREE.Mesh>,
 *   bodyMaterial: THREE.MeshPhysicalMaterial
 * }>}
 */
export async function loadGLBModel(url, envMap = null, onProgress = null) {
  const loader = new GLTFLoader();

  // Optional: Draco decoder for compressed GLB
  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
  } catch (e) {
    console.warn('[GLBLoader] Draco decoder not available, proceeding without compression support');
  }

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // ── Step 1: Apply wheelbase correction scale ──
        model.scale.setScalar(SCALE_FACTOR);
        console.log(`[GLBLoader] Wheelbase correction: ${MODEL_WHEELBASE}m → ${FIA_WHEELBASE}m (scale: ${SCALE_FACTOR.toFixed(4)})`);

        // ── Step 2: Center pivot at geometric center ──
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Offset so pivot is at center of wheelbase, on ground plane
        model.position.sub(center);
        model.position.y += size.y / 2; // Lift so bottom touches Y=0

        console.log(`[GLBLoader] Model size after scale: ${size.x.toFixed(2)}m × ${size.y.toFixed(2)}m × ${size.z.toFixed(2)}m`);

        // ── Step 3: Wrap in groups ──
        const carGroup = new THREE.Group();
        carGroup.name = 'CAR_ASSEMBLY_GLB';

        const bodyGroup = new THREE.Group();
        bodyGroup.name = 'Body_Mesh';

        // ── Step 4: Material assignment & mesh mapping ──
        const bodyMaterial = createGLBBodyMaterial(0x1e3a6e, envMap);
        const carbonMaterial = createGLBCarbonMaterial(envMap);
        const meshMap = {};

        model.traverse((child) => {
          if (!child.isMesh) return;

          const name = child.name || '';
          meshMap[name] = child;

          // Assign materials based on mesh name
          if (name.includes('Bodywork') || name.includes('MCL39') || name.includes('MONOCOQUE')) {
            child.material = bodyMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
            bodyGroup.add(child.clone());
          } else if (name.includes('FRONT_WING') || name.includes('FrontWing')) {
            child.material = bodyMaterial.clone();
            child.castShadow = true;
            bodyGroup.add(child.clone());
          } else if (name.includes('REAR_WING') || name.includes('RearWing')) {
            child.material = bodyMaterial.clone();
            child.castShadow = true;
            bodyGroup.add(child.clone());
          } else if (name.includes('Engine') || name.includes('ICE') || name.includes('V6')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x7a7a7a,
              metalness: 0.9,
              roughness: 0.2,
              clearcoat: 0.6,
              emissive: new THREE.Color(0x884400),
              emissiveIntensity: 0,
              envMap,
            });
            child.castShadow = true;
          } else if (name.includes('Battery') || name.includes('Energy')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x0055cc,
              metalness: 0.5,
              roughness: 0.3,
              clearcoat: 0.4,
              emissive: new THREE.Color(0x001166),
              emissiveIntensity: 0,
              envMap,
            });
          } else if (name.includes('MGU') || name.includes('Motor')) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0x00aa55,
              metalness: 0.8,
              roughness: 0.18,
              clearcoat: 0.7,
              emissive: new THREE.Color(0x003311),
              emissiveIntensity: 0,
              envMap,
            });
          } else {
            // Default: carbon fiber for unlabeled parts
            child.material = carbonMaterial.clone();
            child.castShadow = true;
            bodyGroup.add(child.clone());
          }
        });

        carGroup.add(model);

        console.log(`[GLBLoader] Loaded meshes:`, Object.keys(meshMap));

        resolve({
          carGroup,
          bodyGroup,
          meshMap,
          bodyMaterial,
          scaleFactor: SCALE_FACTOR,
        });
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (error) => {
        console.error('[GLBLoader] Failed to load:', error);
        reject(error);
      }
    );
  });
}

/**
 * Utility: Check if a GLB file exists at the given path.
 * Verifies both HTTP status AND content-type (to avoid Vite's HTML 404 fallback).
 */
export async function checkGLBExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    // GLB files should be binary — not text/html
    return !contentType.includes('text/html');
  } catch {
    return false;
  }
}
