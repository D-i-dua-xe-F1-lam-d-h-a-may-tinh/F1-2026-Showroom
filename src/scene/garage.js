/**
 * Garage Module — Tải mô hình Sci-Fi Garage
 * =============================================
 * Tải sci-fi_garage.glb — garage phong cách khoa học viễn tưởng
 * với đèn neon, tường kim loại, và ánh sáng holographic.
 * 
 * Gara đặt tại tâm (0, 0, 0), tự động scale vừa scene.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

function createLoader() {
  const loader = new GLTFLoader();
  try {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
  } catch (e) {
    console.warn('[Garage] Draco không khả dụng');
  }
  return loader;
}

function loadModel(url, onProgress) {
  const loader = createLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (err) => {
        console.warn(`[Garage] Tải thất bại ${url}:`, err);
        resolve(null);
      }
    );
  });
}

/**
 * Áp dụng material sci-fi cho gara.
 * Bật emissive cho các panel đèn, nhận bóng trên sàn/tường.
 */
function applySciFiMaterials(model, envMap) {
  model.traverse((child) => {
    if (!child.isMesh) return;

    child.receiveShadow = true;
    child.castShadow = true;

    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        mat.envMap = envMap;
        mat.envMapIntensity = 0.5;

        // Tăng cường phát sáng cho các bề mặt đèn/LED/neon
        const name = (child.name || '').toLowerCase();
        if (name.includes('light') || name.includes('neon') || name.includes('glow') ||
            name.includes('screen') || name.includes('display') || name.includes('led') ||
            name.includes('emissive') || name.includes('lamp')) {
          mat.emissive = mat.emissive || new THREE.Color(0x00d2ff);
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, 1.5);
        }
      });
    }
  });
}

/**
 * Tải mô hình Sci-Fi Garage.
 * 
 * ★ Sử dụng sci-fi_garage.glb thay vì garage.glb
 * ★ Tự động detect kích thước và scale phù hợp
 * 
 * @param {THREE.Texture} envMap
 * @param {Function} onProgress
 * @returns {Promise<THREE.Group>}
 */
export async function loadGarage(envMap, onProgress = () => {}) {
  const garageGroup = new THREE.Group();
  garageGroup.name = 'SCIFI_GARAGE_GROUP';

  // ── Tải model sci-fi garage ──
  onProgress('Đang tải Sci-Fi Garage...', 0);
  const garageModel = await loadModel('/models/sci-fi_garage.glb', (p) => {
    onProgress('Đang tải Sci-Fi Garage...', p * 0.8);
  });

  if (garageModel) {
    applySciFiMaterials(garageModel, envMap);

    // Đo kích thước model gốc
    const box = new THREE.Box3().setFromObject(garageModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log(`[Garage] Sci-Fi Garage kích thước gốc: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}m`);
    console.log(`[Garage] Tâm gốc: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);

    // ★ Tự động scale: Nhắm tới chiều rộng ~20m cho showroom thoáng
    const TARGET_WIDTH = 20;
    const maxHorizontal = Math.max(size.x, size.z);
    const scale = TARGET_WIDTH / maxHorizontal;
    garageModel.scale.setScalar(scale);

    // Căn giữa tại tâm (0, 0, 0) và đáy chạm sàn y=0
    const newBox = new THREE.Box3().setFromObject(garageModel);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    garageModel.position.x -= newCenter.x;
    garageModel.position.z -= newCenter.z;
    garageModel.position.y -= newBox.min.y; // Đáy chạm sàn

    const finalSize = newBox.getSize(new THREE.Vector3());
    console.log(`[Garage] Sau scale (×${scale.toFixed(3)}): ${finalSize.x.toFixed(1)} × ${finalSize.y.toFixed(1)} × ${finalSize.z.toFixed(1)}m`);

    garageGroup.add(garageModel);
  } else {
    console.warn('[Garage] ⚠️ Không tải được sci-fi_garage.glb, tạo placeholder');
    // Fallback: tạo phòng hộp đơn giản
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.6,
      metalness: 0.4,
      envMap,
    });
    const floorGeo = new THREE.BoxGeometry(20, 0.1, 20);
    const floorMesh = new THREE.Mesh(floorGeo, wallMat);
    floorMesh.position.y = -0.05;
    floorMesh.receiveShadow = true;
    garageGroup.add(floorMesh);
  }

  onProgress('Sci-Fi Garage đã sẵn sàng!', 1);
  return garageGroup;
}
