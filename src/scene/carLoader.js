/**
 * Car Loader — Tải xe F1 + linh kiện động cơ
 * ===============================================
 * Tải thân xe (.glb), động cơ V6 (.fbx),
 * pin (.glb), tản nhiệt (.glb).
 *
 * ★ FIX: Động cơ V6 thu nhỏ gọn bên trong khoang máy
 * Sử dụng hằng số ENGINE_SCALE_FACTOR và ENGINE_RELATIVE_POS
 * để dễ tinh chỉnh.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  createBodyMaterial,
  createCarbonMaterial,
  createEngineMaterial,
  createBatteryMaterial,
  createRadiatorMaterial,
} from '../utils/materialFactory.js';

// ═══════════════════════════════════════════════════════════
// HẰNG SỐ KÍCH THƯỚC & VỊ TRÍ ĐỘNG CƠ (dễ tinh chỉnh)
// Tất cả tọa độ là LOCAL SPACE của CAR_GROUP
// ═══════════════════════════════════════════════════════════

// Tỷ lệ động cơ so với chiều dài xe (5% thay vì 15%)
const ENGINE_SCALE_FACTOR = 0.05;

// Vị trí động cơ tương đối so với tâm xe (local space)
// X=0: chính giữa, Y=30% chiều cao xe, Z=-15% chiều dài (phía sau)
const ENGINE_RELATIVE_POS = { x: 0, yFactor: 0.30, zFactor: -0.15 };

// Vị trí pin tương đối
const BATTERY_RELATIVE_POS = { x: 0, yFactor: 0.22, zFactor: 0.02 };

// Vị trí tản nhiệt tương đối
const RADIATOR_RELATIVE_POS = { xFactor: 0.12, yFactor: 0.28, zFactor: -0.10 };

function createGLTFLoader() {
  const loader = new GLTFLoader();
  try {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
  } catch (e) {
    console.warn('[CarLoader] Draco không khả dụng');
  }
  return loader;
}

/**
 * Tải thân xe F1 từ GLB.
 */
async function loadCarBody(envMap, onProgress) {
  const loader = createGLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      '/models/ModelF1.glb',
      (gltf) => {
        const model = gltf.scene;

        // Giữ nguyên scale gốc từ Blender
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Căn giữa ngang và đặt bánh xe chạm sàn
        model.position.sub(center);
        model.position.y += size.y / 2;

        console.log(`[CarLoader] Kích thước xe (gốc): ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}m`);

        // Gán material
        const bodyMaterial = createBodyMaterial(0xe10600, envMap); // Ferrari Red mặc định
        const carbonMaterial = createCarbonMaterial(envMap);
        const bodyMeshes = [];

        model.traverse((child) => {
          if (!child.isMesh) return;
          const name = child.name || '';
          child.castShadow = true;
          child.receiveShadow = true;

          if (name.includes('Bodywork') || name.includes('MCL39') || name.includes('MONOCOQUE')) {
            child.material = bodyMaterial;
            bodyMeshes.push(child);
          } else if (name.includes('FRONT_WING') || name.includes('FrontWing')) {
            child.material = bodyMaterial.clone();
            bodyMeshes.push(child);
          } else if (name.includes('REAR_WING') || name.includes('RearWing')) {
            child.material = bodyMaterial.clone();
            bodyMeshes.push(child);
          } else {
            child.material = carbonMaterial.clone();
            bodyMeshes.push(child);
          }
        });

        resolve({ model, bodyMaterial, bodyMeshes, carSize: size });
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (err) => {
        console.warn('[CarLoader] Tải thân xe thất bại:', err);
        resolve(null);
      }
    );
  });
}

/**
 * Tải động cơ V6 từ FBX.
 * ★ FIX: Thu nhỏ đáng kể (ENGINE_SCALE_FACTOR = 5% thay vì 15%)
 * để động cơ nằm gọn trong khoang máy.
 */
async function loadV6Engine(envMap, carSize) {
  const loader = new FBXLoader();
  
  // ★ Kích thước mục tiêu = 5% chiều dài xe (thay vì 15%)
  const targetEngineSize = carSize ? carSize.z * ENGINE_SCALE_FACTOR : 0.25;

  return new Promise((resolve) => {
    loader.load(
      '/models/V6.fbx',
      (fbx) => {
        const engineMat = createEngineMaterial(envMap);

        // FBX xuất ở đơn vị cm → chuyển sang mét
        fbx.scale.setScalar(0.01);

        // Đo kích thước sau khi chuyển đơn vị
        const box = new THREE.Box3().setFromObject(fbx);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        fbx.position.sub(center); // Căn giữa

        // ★ Scale động cơ nhỏ gọn vừa khoang máy
        const maxDim = Math.max(size.x, size.y, size.z);
        const engineScale = targetEngineSize / maxDim;
        fbx.scale.multiplyScalar(engineScale);

        // Gán material cho tất cả mesh
        fbx.traverse((child) => {
          if (child.isMesh) {
            child.material = engineMat.clone();
            child.castShadow = true;
          }
        });

        // Log kích thước cuối cùng để debug
        const finalBox = new THREE.Box3().setFromObject(fbx);
        const finalSize = finalBox.getSize(new THREE.Vector3());
        console.log(`[CarLoader] V6 Engine: ${finalSize.x.toFixed(3)} × ${finalSize.y.toFixed(3)} × ${finalSize.z.toFixed(3)}m (target: ${targetEngineSize.toFixed(3)}m, scale: ${ENGINE_SCALE_FACTOR})`);
        
        resolve({ mesh: fbx, material: engineMat, size: finalSize });
      },
      undefined,
      (err) => {
        console.warn('[CarLoader] Tải động cơ V6 thất bại:', err);
        resolve(null);
      }
    );
  });
}

/**
 * Tải component GLB (Pin, Tản nhiệt, v.v.).
 */
async function loadGLBComponent(url, materialFn, envMap, targetSize = 0.25) {
  const loader = createGLTFLoader();

  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const mat = materialFn(envMap);

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = mat.clone();
            child.castShadow = true;
          }
        });

        // Căn giữa
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);

        // Scale theo kích thước mục tiêu
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          model.scale.multiplyScalar(targetSize / maxDim);
        }

        resolve({ mesh: model, material: mat, size });
      },
      undefined,
      (err) => {
        console.warn(`[CarLoader] Tải component thất bại (${url}):`, err);
        resolve(null);
      }
    );
  });
}

/**
 * Tải và lắp ráp toàn bộ xe + linh kiện.
 * 
 * ★ FIX: Động cơ V6 được thu nhỏ và đặt chính xác
 * trong khoang máy phía sau xe.
 */
export async function loadCar(envMap, onProgress = () => {}) {
  const carGroup = new THREE.Group();
  carGroup.name = 'CAR_GROUP';

  const engineGroup = new THREE.Group();
  engineGroup.name = 'ENGINE_GROUP';
  // ★ Động cơ ẩn mặc định — chỉ hiện khi bật X-ray
  engineGroup.visible = false;

  let bodyMaterial = null;
  let bodyMeshes = [];
  const components = {};
  let carSize = new THREE.Vector3(2, 1, 5); // Giá trị mặc định

  // ── 1. Tải thân xe ──
  onProgress('Đang tải thân xe F1...', 0);
  const carResult = await loadCarBody(envMap, (p) => {
    onProgress('Đang tải thân xe F1...', p * 0.4);
  });

  if (carResult) {
    carGroup.add(carResult.model);
    bodyMaterial = carResult.bodyMaterial;
    bodyMeshes = carResult.bodyMeshes;
    carSize = carResult.carSize;
    console.log('[CarLoader] ✅ Thân xe lắp ráp xong');
  } else {
    // Fallback: xe placeholder
    console.warn('[CarLoader] ⚠️ Dùng xe placeholder');
    bodyMaterial = createBodyMaterial(0xe10600, envMap);
    const placeholderGeo = new THREE.BoxGeometry(4, 0.5, 1.5);
    const placeholder = new THREE.Mesh(placeholderGeo, bodyMaterial);
    placeholder.position.y = 0.5;
    placeholder.castShadow = true;
    carGroup.add(placeholder);
    bodyMeshes.push(placeholder);
  }

  // ── 2. Tải Động cơ V6 (★ ĐÃ SỬA: thu nhỏ gọn trong khoang máy) ──
  onProgress('Đang tải động cơ V6...', 0.4);
  const v6 = await loadV6Engine(envMap, carSize);
  if (v6) {
    // ★ VỊ TRÍ ĐỘNG CƠ: Đặt gọn trong khoang máy phía sau xe
    // Sử dụng hằng số ENGINE_RELATIVE_POS để dễ tinh chỉnh
    const enginePos = new THREE.Vector3(
      ENGINE_RELATIVE_POS.x,
      carSize.y * ENGINE_RELATIVE_POS.yFactor,
      carSize.z * ENGINE_RELATIVE_POS.zFactor
    );
    v6.mesh.position.copy(enginePos);
    v6.mesh.name = 'V6_ENGINE';
    engineGroup.add(v6.mesh);

    components.engine = {
      mesh: v6.mesh,
      material: v6.material,
      name: 'V6 Turbo Engine',
      description: 'Động cơ V6 Turbo Hybrid — 400kW output, 15,000 RPM max',
      // ★ Lưu vị trí local để camera zoom chính xác
      localPosition: enginePos.clone(),
    };

    console.log(`[CarLoader] ✅ V6 đặt tại local(${enginePos.x.toFixed(2)}, ${enginePos.y.toFixed(2)}, ${enginePos.z.toFixed(2)})`);
  }

  // ── 3. Tải Pin (scale nhỏ gọn) ──
  onProgress('Đang tải bộ pin...', 0.6);
  const batteryTargetSize = carSize.z * 0.04; // 4% chiều dài xe
  const battery = await loadGLBComponent('/models/Battery.glb', createBatteryMaterial, envMap, batteryTargetSize);
  if (battery) {
    const battPos = new THREE.Vector3(
      BATTERY_RELATIVE_POS.x,
      carSize.y * BATTERY_RELATIVE_POS.yFactor,
      carSize.z * BATTERY_RELATIVE_POS.zFactor
    );
    battery.mesh.position.copy(battPos);
    battery.mesh.name = 'BATTERY_PACK';
    engineGroup.add(battery.mesh);
    components.battery = {
      mesh: battery.mesh,
      material: battery.material,
      name: 'Energy Store (Battery)',
      description: 'Pin năng lượng 4.0 MJ — cung cấp năng lượng cho MGU-K',
      localPosition: battPos.clone(),
    };
  }

  // ── 4. Tải Tản nhiệt ──
  // ★ Lưu ý: Đặt file tannhiet.glb vào public/models/ để bật lại tính năng này
  onProgress('Đang tải hệ thống tản nhiệt...', 0.8);
  const RADIATOR_MODEL_PATH = '/models/tannhiet.glb';
  try {
    // Kiểm tra file tồn tại trước khi tải (tránh lỗi 404)
    const checkResp = await fetch(RADIATOR_MODEL_PATH, { method: 'HEAD' });
    if (checkResp.ok) {
      const radiatorTargetSize = carSize.z * 0.04; // 4% chiều dài xe
      const radiator = await loadGLBComponent(RADIATOR_MODEL_PATH, createRadiatorMaterial, envMap, radiatorTargetSize);
      if (radiator) {
        const radPos = new THREE.Vector3(
          carSize.x * RADIATOR_RELATIVE_POS.xFactor,
          carSize.y * RADIATOR_RELATIVE_POS.yFactor,
          carSize.z * RADIATOR_RELATIVE_POS.zFactor
        );
        radiator.mesh.position.copy(radPos);
        radiator.mesh.name = 'RADIATOR';
        engineGroup.add(radiator.mesh);
        components.radiator = {
          mesh: radiator.mesh,
          material: radiator.material,
          name: 'Tản nhiệt (Radiator)',
          description: 'Hệ thống tản nhiệt — giữ nhiệt độ động cơ ổn định ở 110°C',
          localPosition: radPos.clone(),
        };
      }
    } else {
      console.info('[CarLoader] ℹ️ Bỏ qua tản nhiệt — file tannhiet.glb chưa có trong public/models/');
    }
  } catch {
    console.info('[CarLoader] ℹ️ Bỏ qua tản nhiệt — file tannhiet.glb chưa có trong public/models/');
  }

  carGroup.add(engineGroup);
  onProgress('Xe lắp ráp xong!', 1);

  return { carGroup, bodyMaterial, bodyMeshes, engineGroup, components, carSize };
}
