/**
 * X-Ray Controls — Phase 2
 * =========================
 * Body opacity tween + GSAP camera fly-to
 * Pulsing emissive glow via components.js activateGlow()
 */
import gsap from 'gsap';
import { flyToPosition, resetCamera } from '../utils/cameraAnimator.js';
import { componentInfo } from '../scene/components.js';

export function initXRayControls({ camera, controls, bodyGroup, components, activateGlow, deactivateAllGlows }) {
  const buttons = document.querySelectorAll('.xray-btn');
  const compInfoEl = document.getElementById('component-info');
  const compNameEl = document.getElementById('component-name');
  const compDescEl = document.getElementById('component-desc');

  // Collect all body meshes
  const bodyMeshes = [];
  bodyGroup.traverse(child => {
    if (child.isMesh) bodyMeshes.push(child);
  });

  function setBodyOpacity(opacity, duration = 0.7) {
    bodyMeshes.forEach(mesh => {
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

  function showInfo(key) {
    const info = componentInfo[key];
    if (!info || !compInfoEl) return;
    compNameEl.textContent = info.name;
    compDescEl.textContent = info.description;
    compInfoEl.classList.remove('hidden');
  }

  function hideInfo() {
    compInfoEl?.classList.add('hidden');
  }

  function setMode(mode) {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    deactivateAllGlows();
    hideInfo();

    switch (mode) {
      case 'normal':
        setBodyOpacity(1.0);
        resetCamera(camera, controls);
        break;

      case 'xray':
        setBodyOpacity(0.15);
        resetCamera(camera, controls, 0.8);
        break;

      case 'engine':
        setBodyOpacity(0.1);
        activateGlow('engine');
        showInfo('engine');
        flyToPosition(camera, controls,
          components.engine.cameraPosition,
          components.engine.cameraTarget, 1.5);
        break;

      case 'battery':
        setBodyOpacity(0.1);
        activateGlow('battery');
        showInfo('battery');
        flyToPosition(camera, controls,
          components.battery.cameraPosition,
          components.battery.cameraTarget, 1.5);
        break;

      case 'mguk':
        setBodyOpacity(0.1);
        activateGlow('mguk');
        showInfo('mguk');
        flyToPosition(camera, controls,
          components.mguk.cameraPosition,
          components.mguk.cameraTarget, 1.5);
        break;
    }
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  setMode('normal');
}
