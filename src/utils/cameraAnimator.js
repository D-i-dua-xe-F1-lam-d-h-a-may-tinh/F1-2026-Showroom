/**
 * Camera Animator — Phase 2
 * ==========================
 * GSAP fly-to with world-coordinate targets
 */
import gsap from 'gsap';

export function flyToPosition(camera, controls, targetPos, lookAtTarget, duration = 1.5, onComplete) {
  controls.enabled = false;
  const tl = gsap.timeline({
    onComplete: () => {
      controls.target.copy(lookAtTarget);
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
    x: lookAtTarget.x, y: lookAtTarget.y, z: lookAtTarget.z,
    duration, ease: 'power3.inOut',
    onUpdate: () => controls.update(),
  }, 0);
  return tl;
}

export function resetCamera(camera, controls, duration = 1.2) {
  return flyToPosition(
    camera, controls,
    { x: 5, y: 3, z: 7 },
    { x: 0, y: 0.4, z: 0 },
    duration
  );
}
