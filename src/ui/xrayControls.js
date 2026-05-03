/**
 * X-Ray Controls — Chế độ kiểm tra động cơ
 * ==========================================
 * ★ FIX: Camera bay chính xác tới vị trí động cơ
 * ★ FIX: controls.target cập nhật đúng tâm linh kiện
 * 
 * Body opacity tween + GSAP camera fly-to.
 * Engine group ẩn ở chế độ normal, hiện khi X-ray.
 */

import gsap from 'gsap';
import * as THREE from 'three';
import { flyToPosition, resetCamera, inspectionPositions } from '../utils/cameraController.js';

/**
 * Khởi tạo điều khiển X-Ray.
 * 
 * @param {Object} opts
 * @param {THREE.PerspectiveCamera} opts.camera
 * @param {OrbitControls} opts.controls
 * @param {THREE.Mesh[]} opts.bodyMeshes — các mesh thân xe
 * @param {Object} opts.components — { engine, battery, radiator }
 * @param {THREE.Group} opts.engineGroup — nhóm chứa tất cả linh kiện động cơ
 * @param {THREE.Group} opts.carGroup — nhóm xe (để tính world position)
 * @param {Function} opts.onModeChange — callback khi đổi chế độ
 */
export function initXRayControls({ camera, controls, bodyMeshes, components, engineGroup, carGroup, onModeChange }) {
  const buttons = document.querySelectorAll('.xray-btn');
  const infoPanel = document.getElementById('component-info');
  const infoName = document.getElementById('component-name');
  const infoDesc = document.getElementById('component-desc');
  let currentMode = 'normal';

  // ── Hiện/ẩn nhóm động cơ ──
  function setEngineVisible(visible) {
    if (engineGroup) {
      engineGroup.visible = visible;
    }
  }

  // ── Animate opacity thân xe ──
  function setBodyOpacity(opacity, duration = 0.7) {
    bodyMeshes.forEach(mesh => {
      if (!mesh.material) return;
      gsap.to(mesh.material, {
        opacity,
        duration,
        ease: 'power2.inOut',
        onStart: () => {
          mesh.material.transparent = true;
          mesh.material.depthWrite = opacity > 0.5;
        },
        onComplete: () => {
          if (opacity >= 1.0) {
            mesh.material.transparent = false;
            mesh.material.depthWrite = true;
          }
        },
      });
    });
  }

  // ── Bật phát sáng linh kiện ──
  function activateGlow(key) {
    const comp = components[key];
    if (!comp || !comp.mesh) return;

    comp.mesh.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (child.material.emissive) {
        gsap.to(child.material, {
          emissiveIntensity: 0.4,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    });
  }

  // ── Tắt phát sáng tất cả ──
  function deactivateAllGlows() {
    Object.values(components).forEach(comp => {
      if (!comp || !comp.mesh) return;
      comp.mesh.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        if (child.material.emissive) {
          gsap.to(child.material, {
            emissiveIntensity: 0,
            duration: 0.4,
          });
        }
      });
    });
  }

  // ── Hiển thị thông tin linh kiện ──
  function showInfo(key) {
    const comp = components[key];
    if (!comp || !infoPanel) return;
    if (infoName) infoName.textContent = comp.name;
    if (infoDesc) infoDesc.textContent = comp.description;
    infoPanel.classList.remove('hidden');
  }

  function hideInfo() {
    infoPanel?.classList.add('hidden');
  }

  /**
   * ★ FIX: Bay camera tới linh kiện cụ thể
   * Sử dụng inspectionPositions đã tính chính xác trong cameraController.js
   * controls.target sẽ cập nhật đúng tâm linh kiện sau khi bay xong
   */
  function flyToComponent(key) {
    const pos = inspectionPositions[key];
    if (!pos) {
      console.warn(`[XRay] Không tìm thấy vị trí kiểm tra cho: ${key}`);
      return;
    }

    console.log(`[XRay] 🎯 Bay camera tới ${key}:`);
    console.log(`  Camera → (${pos.camera.x.toFixed(2)}, ${pos.camera.y.toFixed(2)}, ${pos.camera.z.toFixed(2)})`);
    console.log(`  Target → (${pos.target.x.toFixed(2)}, ${pos.target.y.toFixed(2)}, ${pos.target.z.toFixed(2)})`);

    flyToPosition(camera, controls, pos.camera, pos.target, 1.5, () => {
      console.log(`[XRay] ✅ Camera đã bay tới ${key}, controls.target đã cập nhật`);
    });
  }

  // ── Đặt chế độ xem ──
  function setMode(mode) {
    currentMode = mode;
    buttons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    deactivateAllGlows();
    hideInfo();

    switch (mode) {
      case 'normal':
        // ★ Ẩn động cơ, khôi phục opacity thân xe
        setEngineVisible(false);
        setBodyOpacity(1.0);
        resetCamera(camera, controls);
        break;

      case 'xray':
        // ★ Hiện tất cả linh kiện, thân xe bán trong suốt
        setEngineVisible(true);
        setBodyOpacity(0.15);
        resetCamera(camera, controls, 0.8);
        break;

      case 'engine':
        // ★ FIX: Zoom chính xác vào động cơ V6
        setEngineVisible(true);
        setBodyOpacity(0.2);
        activateGlow('engine');
        showInfo('engine');
        flyToComponent('engine');
        break;

      case 'battery':
        setEngineVisible(true);
        setBodyOpacity(0.2);
        activateGlow('battery');
        showInfo('battery');
        flyToComponent('battery');
        break;

      case 'radiator':
        setEngineVisible(true);
        setBodyOpacity(0.25);
        activateGlow('radiator');
        showInfo('radiator');
        flyToComponent('radiator');
        break;
    }

    if (onModeChange) onModeChange(mode);
  }

  // Gắn sự kiện click cho các nút
  buttons.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Trạng thái ban đầu — ẩn động cơ
  setMode('normal');

  return { setMode, getCurrentMode: () => currentMode };
}
