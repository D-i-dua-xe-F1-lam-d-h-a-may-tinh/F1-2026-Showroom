/**
 * Camera Controller — Sci-Fi Showroom
 * =====================================
 * Xe đặt tại tâm (0, 0.05, 0)
 * Tất cả vị trí kiểm tra tính từ tâm.
 */

import gsap from 'gsap';

const CAR_X = 0;
const CAR_Y = 0.05;
const CAR_Z = 0;

// Vị trí động cơ (world space) — phía sau xe (Z-)
const ENGINE_WORLD = { x: 0, y: 0.35, z: -0.8 };
const BATTERY_WORLD = { x: 0, y: 0.25, z: 0.1 };
const RADIATOR_WORLD = { x: 0.25, y: 0.3, z: -0.5 };

// Camera mặc định
const DEFAULT_POSITION = { x: 5, y: 2.5, z: 7 };
const DEFAULT_TARGET   = { x: 0, y: 0.6, z: 0 };

/**
 * Bay camera mượt mà bằng GSAP.
 */
export function flyToPosition(camera, controls, targetPos, lookAt, duration = 1.5, onComplete) {
  controls.enabled = false;

  const tl = gsap.timeline({
    onComplete: () => {
      controls.target.set(lookAt.x, lookAt.y, lookAt.z);
      controls.update();
      controls.enabled = true;
      if (onComplete) onComplete();
    },
  });

  tl.to(camera.position, {
    x: targetPos.x, y: targetPos.y, z: targetPos.z,
    duration, ease: 'power3.inOut',
  }, 0);

  tl.to(controls.target, {
    x: lookAt.x, y: lookAt.y, z: lookAt.z,
    duration, ease: 'power3.inOut',
    onUpdate: () => controls.update(),
  }, 0);

  return tl;
}

/**
 * Reset camera về vị trí mặc định.
 */
export function resetCamera(camera, controls, duration = 1.2) {
  return flyToPosition(camera, controls, DEFAULT_POSITION, DEFAULT_TARGET, duration);
}

/**
 * Vị trí kiểm tra linh kiện — tính từ tâm xe.
 */
export const inspectionPositions = {
  engine: {
    camera: { x: ENGINE_WORLD.x + 1.5, y: ENGINE_WORLD.y + 0.8, z: ENGINE_WORLD.z - 1.2 },
    target: { x: ENGINE_WORLD.x, y: ENGINE_WORLD.y, z: ENGINE_WORLD.z },
  },
  battery: {
    camera: { x: BATTERY_WORLD.x - 1.5, y: BATTERY_WORLD.y + 0.8, z: BATTERY_WORLD.z + 1.5 },
    target: { x: BATTERY_WORLD.x, y: BATTERY_WORLD.y, z: BATTERY_WORLD.z },
  },
  radiator: {
    camera: { x: RADIATOR_WORLD.x + 1.5, y: RADIATOR_WORLD.y + 0.6, z: RADIATOR_WORLD.z - 1.2 },
    target: { x: RADIATOR_WORLD.x, y: RADIATOR_WORLD.y, z: RADIATOR_WORLD.z },
  },
};
