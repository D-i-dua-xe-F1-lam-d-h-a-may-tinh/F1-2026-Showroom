/**
 * F1 Showroom — Điểm khởi tạo chính
 * ============================================
 * Showroom phong cách khoa học viễn tưởng
 * ★ FIX: BoundingBox tự động tính Y — không lún sàn
 * ★ FIX: Xoay xe bằng wrapper Group — không bị OrbitControls ghi đè
 * ★ NEW: Auto-rotation trong animate loop
 * ★ NEW: Showroom SpotLight chiếu từ trên xuống
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

import './styles/main.css';

import { createEnvironment } from './scene/environment.js';
import { createLighting } from './scene/lighting.js';
import { loadGarage } from './scene/garage.js';
import { loadCar } from './scene/carLoader.js';
import { createPlatform } from './scene/platform.js';
import { initTeamSelector } from './ui/teamSelector.js';
import { initXRayControls } from './ui/xrayControls.js';
import { flyToPosition } from './utils/cameraController.js';

// ══════════════════════════════════════════════════════════
// CONFIG — Tất cả hằng số điều chỉnh tập trung ở đây
// ══════════════════════════════════════════════════════════
const CONFIG = {
  // ── Vị trí xe (hằng số CAR_X, CAR_Y, CAR_Z) ──
  car: {
    CAR_X: 0,             // Ngang (trái/phải) — tâm platform
    CAR_Z: 0,             // ★ FIX: Centered on platform (was 1.5)
    FLOOR_Y: 0.04,        // ★ FIX: Platform top surface = position.y(0.01) + height(0.06)/2 = 0.04
    INITIAL_ROT_Y: Math.PI / 6,  // Góc xoay ban đầu: 30° chéo
  },

  // ── Auto-rotation (xoay tự động) ──
  autoRotate: {
    enabled: true,         // true = bật xoay tự động
    speed: 0.15,           // Tốc độ xoay (rad/s) — 0.15 ≈ 8.6°/s ≈ 42s/vòng
    pauseOnInteract: true, // Tạm dừng khi người dùng tương tác
    resumeDelay: 3000,     // Chờ 3s sau khi ngừng tương tác → tiếp tục xoay
  },

  // ── Đèn SpotLight Showroom (key light from above) ──
  showroomSpot: {
    color: 0xeef6ff,       // Cool white — slightly warm
    intensity: 1200,       // ★ FIX: Boosted from 600 for clear car visibility
    distance: 30,          // Khoảng cách chiếu tối đa
    angle: Math.PI / 4,    // ★ Wider cone (~45°) to cover whole car
    penumbra: 0.5,         // Viền mềm
    decay: 1.0,            // Suy giảm
    posY: 10,              // Chiều cao đèn (m)
    castShadow: true,
    shadowMapSize: 2048,
    shadowBias: -0.0003,
  },

  // ── Camera ──
  camera: {
    startPos: { x: 5, y: 2.5, z: 7 },
    introFrom: { x: 12, y: 5, z: 15 },
    orbitTarget: { x: 0, y: 0.6, z: 0 },
    minDistance: 2,
    maxDistance: 25,
  },
};

// ══════════════════════════════════════════════════════════
// LOADING SCREEN
// ══════════════════════════════════════════════════════════
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingLabel = document.getElementById('loading-label');

function setProgress(pct, label) {
  if (loadingBar) loadingBar.style.width = `${pct}%`;
  if (label && loadingLabel) loadingLabel.textContent = label;
}

// ══════════════════════════════════════════════════════════
// RENDERER
// ══════════════════════════════════════════════════════════
setProgress(5, 'INITIALIZING RENDERER...');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap deprecated từ Three.js r184+
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('canvas-container').appendChild(renderer.domElement);

// ══════════════════════════════════════════════════════════
// SCENE & CAMERA
// ══════════════════════════════════════════════════════════
setProgress(10, 'BUILDING SCENE...');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(
  CONFIG.camera.startPos.x,
  CONFIG.camera.startPos.y,
  CONFIG.camera.startPos.z
);

// ══════════════════════════════════════════════════════════
// ORBIT CONTROLS — Xoay camera quanh xe
// ★ LƯU Ý: OrbitControls xoay CAMERA, không xoay model.
//   Nếu đặt rotation trên carGroup → sẽ bị "nhìn không đúng"
//   → Giải pháp: dùng carPivot (THREE.Group) bọc ngoài carGroup
// ══════════════════════════════════════════════════════════
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(
  CONFIG.camera.orbitTarget.x,
  CONFIG.camera.orbitTarget.y,
  CONFIG.camera.orbitTarget.z
);
controls.minDistance = CONFIG.camera.minDistance;
controls.maxDistance = CONFIG.camera.maxDistance;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minPolarAngle = 0.1;
controls.autoRotate = false; // Dùng auto-rotate riêng (bên dưới) thay vì của OrbitControls

// ══════════════════════════════════════════════════════════
// ENVIRONMENT
// ══════════════════════════════════════════════════════════
setProgress(15, 'GENERATING ENVIRONMENT...');
const { envMap } = createEnvironment(scene, renderer);

// ══════════════════════════════════════════════════════════
// LIGHTING
// ══════════════════════════════════════════════════════════
setProgress(20, 'CONFIGURING LIGHTS...');
createLighting(scene);

// ══════════════════════════════════════════════════════════
// PLATFORM — Circular display platform for the car
// ══════════════════════════════════════════════════════════
setProgress(25, 'CREATING PLATFORM...');
const { platformGroup, platformMesh } = createPlatform(envMap);
scene.add(platformGroup);
console.log('[Main] ✅ Platform created');

// ══════════════════════════════════════════════════════════
// GARAGE
// ══════════════════════════════════════════════════════════
setProgress(30, 'LOADING GARAGE...');
let garageGroup = null;
try {
  garageGroup = await loadGarage(envMap, (label, pct) => {
    setProgress(30 + pct * 15, label);
  });
  scene.add(garageGroup);
  console.log('[Main] ✅ Garage loaded');
} catch (err) {
  console.warn('[Main] ⚠️ Garage load failed:', err);
}

// ══════════════════════════════════════════════════════════
// F1 CAR — Tải, sửa lún, xoay, đổ bóng
// ══════════════════════════════════════════════════════════
setProgress(50, 'LOADING F1 CAR...');

// ★ carPivot = Group bọc ngoài để xoay xe
//   → OrbitControls xoay camera, carPivot xoay model
//   → Hai hệ xoay độc lập, không xung đột
const carPivot = new THREE.Group();
carPivot.name = 'CAR_PIVOT';
scene.add(carPivot);

let carGroup = null;
let bodyMeshes = [];
let components = {};
let engineGroup = null;
let carSize = new THREE.Vector3(2, 1, 5);

// Alias cho dễ đọc
const CAR_X = CONFIG.car.CAR_X;
const CAR_Z = CONFIG.car.CAR_Z;
const FLOOR_Y = CONFIG.car.FLOOR_Y;

try {
  const car = await loadCar(envMap, (label, pct) => {
    setProgress(50 + pct * 30, label);
  });

  carGroup = car.carGroup;
  carSize = car.carSize || carSize;

  // ══════════════════════════════════════════════════════
  // ★ BƯỚC 1: Đặt xe tạm tại gốc để đo BoundingBox chính xác
  // ══════════════════════════════════════════════════════
  carGroup.position.set(0, 0, 0);
  carPivot.add(carGroup);

  // ══════════════════════════════════════════════════════
  // ★ BƯỚC 2: Tính BoundingBox → căn giữa X/Z + đặt đáy lên mặt platform
  //   Platform top surface = FLOOR_Y (0.04)
  //   Thuật toán:
  //   1. Đo box bao quanh toàn bộ xe
  //   2. centerX/centerZ = tâm ngang xe → dịch để pivot = tâm platform
  //   3. offsetY = FLOOR_Y - box.min.y → đáy xe chạm mặt platform
  // ══════════════════════════════════════════════════════
  const box = new THREE.Box3().setFromObject(carGroup);
  const boxCenter = box.getCenter(new THREE.Vector3());

  // ★ FIX centering: Dịch xe để tâm bounding box trùng tâm platform (CAR_X, CAR_Z)
  carGroup.position.x = CAR_X - boxCenter.x;
  carGroup.position.z = CAR_Z - boxCenter.z;

  // ★ FIX sinking: Đặt đáy xe (box.min.y) chính xác lên mặt platform (FLOOR_Y)
  const offsetY = FLOOR_Y - box.min.y;
  carGroup.position.y = offsetY;

  const finalBox = new THREE.Box3().setFromObject(carGroup);
  const finalCenter = finalBox.getCenter(new THREE.Vector3());
  console.log(`[Main] 📐 BoundingBox: min.y=${box.min.y.toFixed(4)}, center=(${boxCenter.x.toFixed(3)}, ${boxCenter.z.toFixed(3)})`);
  console.log(`[Main] 📐 Offset: Y=${offsetY.toFixed(4)}, X=${carGroup.position.x.toFixed(4)}, Z=${carGroup.position.z.toFixed(4)}`);
  console.log(`[Main] 📐 Final: bottom=${finalBox.min.y.toFixed(4)} (target=${FLOOR_Y}), center=(${finalCenter.x.toFixed(3)}, ${finalCenter.z.toFixed(3)})`);

  // ══════════════════════════════════════════════════════
  // ★ BƯỚC 3: Xoay xe bằng carPivot
  //   Vì sao dùng carPivot thay vì carGroup.rotation.y?
  //   - carGroup.rotation có thể bị carLoader nội bộ đặt lại
  //   - OrbitControls + camera target có thể gây xung đột
  //   - carPivot bọc ngoài → xoay luôn hoạt động
  // ══════════════════════════════════════════════════════
  carPivot.rotation.y = CONFIG.car.INITIAL_ROT_Y;

  console.log(`[Main] 🔄 Rotation: ${(CONFIG.car.INITIAL_ROT_Y * 180 / Math.PI).toFixed(1)}° (trên carPivot)`);

  // ══════════════════════════════════════════════════════
  // ★ BƯỚC 4: Bật đổ bóng cho tất cả mesh
  // ══════════════════════════════════════════════════════
  carGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  bodyMeshes = car.bodyMeshes;
  components = car.components;
  engineGroup = car.engineGroup;

  console.log(`[Main] ✅ Car: pos=(${CAR_X}, ${carGroup.position.y.toFixed(3)}, ${CAR_Z}) | rot=${(carPivot.rotation.y * 180 / Math.PI).toFixed(1)}°`);

} catch (err) {
  console.warn('[Main] ⚠️ Car load failed:', err);
}

// ══════════════════════════════════════════════════════════
// SHOWROOM SPOTLIGHT — Main key light from above
// ══════════════════════════════════════════════════════════
const SC = CONFIG.showroomSpot;

const showroomSpot = new THREE.SpotLight(
  SC.color, SC.intensity, SC.distance, SC.angle, SC.penumbra, SC.decay
);
showroomSpot.position.set(CAR_X, SC.posY, CAR_Z);
showroomSpot.name = 'SHOWROOM_SPOTLIGHT';
showroomSpot.target.position.set(CAR_X, 0, CAR_Z);
showroomSpot.castShadow = SC.castShadow;
showroomSpot.shadow.mapSize.set(SC.shadowMapSize, SC.shadowMapSize);
showroomSpot.shadow.bias = SC.shadowBias;
showroomSpot.shadow.camera.near = 0.5;
showroomSpot.shadow.camera.far = SC.distance;
scene.add(showroomSpot);
scene.add(showroomSpot.target);

// ══════════════════════════════════════════════════════════
// ★ FILL LIGHT — Soft warm light from front-left to reduce harsh shadows
// ══════════════════════════════════════════════════════════
const fillLight = new THREE.SpotLight(0xfff0e0, 400, 25, Math.PI / 3, 0.9, 1.2);
fillLight.position.set(CAR_X - 5, 6, CAR_Z + 5);
fillLight.target.position.set(CAR_X, 0.5, CAR_Z);
fillLight.name = 'FILL_LIGHT';
scene.add(fillLight);
scene.add(fillLight.target);

// ══════════════════════════════════════════════════════════
// ★ RIM LIGHT — Cool backlight for edge separation
// ══════════════════════════════════════════════════════════
const rimSpot = new THREE.SpotLight(0x80c0ff, 500, 25, Math.PI / 5, 0.4, 1.0);
rimSpot.position.set(CAR_X + 3, 7, CAR_Z - 6);
rimSpot.target.position.set(CAR_X, 0.5, CAR_Z);
rimSpot.castShadow = true;
rimSpot.shadow.mapSize.set(1024, 1024);
rimSpot.shadow.bias = -0.0003;
rimSpot.name = 'RIM_LIGHT';
scene.add(rimSpot);
scene.add(rimSpot.target);

// ══════════════════════════════════════════════════════════
// ★ GROUND BOUNCE — Subtle upward fill simulating floor reflection
// ══════════════════════════════════════════════════════════
const bounceLight = new THREE.PointLight(0x1a2a40, 3, 12, 1.5);
bounceLight.position.set(CAR_X, 0.1, CAR_Z);
bounceLight.name = 'BOUNCE_LIGHT';
scene.add(bounceLight);

console.log(`[Main] 💡 Lighting: key=${SC.intensity}cd, fill=400cd, rim=500cd`);

// ══════════════════════════════════════════════════════════
// TEAM SELECTOR
// ══════════════════════════════════════════════════════════
setProgress(85, 'CONFIGURING TEAMS...');
initTeamSelector(bodyMeshes, null, (team) => {
  console.log(`[Main] 🏎️ Team: ${team.name}`);
});

// ══════════════════════════════════════════════════════════
// X-RAY CONTROLS
// ══════════════════════════════════════════════════════════
setProgress(90, 'CALIBRATING X-RAY...');
initXRayControls({
  camera, controls, bodyMeshes, components, engineGroup, carGroup,
  onModeChange: (mode) => console.log(`[Main] 🔬 Mode: ${mode}`),
});

// Hide rotate button (dùng auto-rotate riêng)
const rotateBtn = document.getElementById('rotate-btn');
if (rotateBtn) rotateBtn.style.display = 'none';

// ══════════════════════════════════════════════════════════
// RAYCASTER — Click vào engine mesh để zoom
// ══════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
  if (!engineGroup || !engineGroup.visible) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  engineGroup.traverse((c) => { if (c.isMesh) meshes.push(c); });

  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length > 0) {
    const pt = hits[0].point;
    flyToPosition(camera, controls,
      { x: pt.x + 1.5, y: pt.y + 0.8, z: pt.z + 1.5 },
      { x: pt.x, y: pt.y, z: pt.z }, 1.2
    );
  }
});

// ══════════════════════════════════════════════════════════
// AUTO-ROTATION — Xoay xe tự động trong animate loop
// ══════════════════════════════════════════════════════════
let autoRotateActive = CONFIG.autoRotate.enabled;
let lastInteractTime = 0;

// Tạm dừng khi người dùng tương tác (chuột/touch)
if (CONFIG.autoRotate.pauseOnInteract) {
  const pauseEvents = ['mousedown', 'touchstart', 'wheel'];
  pauseEvents.forEach(evt => {
    renderer.domElement.addEventListener(evt, () => {
      autoRotateActive = false;
      lastInteractTime = performance.now();
    });
  });

  const resumeEvents = ['mouseup', 'touchend'];
  resumeEvents.forEach(evt => {
    renderer.domElement.addEventListener(evt, () => {
      lastInteractTime = performance.now();
    });
  });
}

// ══════════════════════════════════════════════════════════
// CINEMATIC INTRO
// ══════════════════════════════════════════════════════════
setProgress(100, 'READY');

setTimeout(() => {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => { loadingScreen.style.display = 'none'; }, 800);

  // Camera sweep: bay vào từ xa
  gsap.from(camera.position, {
    x: CONFIG.camera.introFrom.x,
    y: CONFIG.camera.introFrom.y,
    z: CONFIG.camera.introFrom.z,
    duration: 3,
    ease: 'power3.out',
    onUpdate: () => controls.update(),
  });
}, 600);

// ══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ══════════════════════════════════════════════════════════
const timer = new THREE.Timer();
timer.connect(document); // Xử lý Page Visibility — tránh delta spike khi chuyển tab

function animate(timestamp) {
  requestAnimationFrame(animate);

  timer.update(timestamp);
  const delta = timer.getDelta();

  // ★ AUTO-ROTATION: Xoay carPivot mỗi frame
  if (CONFIG.autoRotate.enabled) {
    // Tự động resume sau khi ngừng tương tác
    if (!autoRotateActive && CONFIG.autoRotate.pauseOnInteract) {
      const elapsed = performance.now() - lastInteractTime;
      if (elapsed > CONFIG.autoRotate.resumeDelay) {
        autoRotateActive = true;
      }
    }

    if (autoRotateActive && carPivot) {
      carPivot.rotation.y += CONFIG.autoRotate.speed * delta;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// ══════════════════════════════════════════════════════════
// RESIZE
// ══════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ══════════════════════════════════════════════════════════
// DEBUG
// ══════════════════════════════════════════════════════════
window.__GARAGE = {
  scene, camera, controls, renderer,
  carGroup, carPivot, garageGroup, bodyMeshes,
  components, engineGroup, raycaster,
  CONFIG, carSize, showroomSpot,
};

console.log('%c🚀 F1 SHOWROOM', 'font-size:18px;color:#00d2ff;font-weight:bold');
console.log('%cwindow.__GARAGE for debug', 'color:#888');
console.log('%cAuto-rotate: ' + (CONFIG.autoRotate.enabled ? 'ON' : 'OFF'), 'color:#0f0');
