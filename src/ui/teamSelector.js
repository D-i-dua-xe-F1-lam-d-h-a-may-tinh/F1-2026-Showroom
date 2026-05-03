/**
 * Team Selector — Color swatch panel for team livery changes
 * ============================================================
 */

import gsap from 'gsap';
import * as THREE from 'three';

const TEAMS = [
  { name: 'Ferrari', hex: '#e10600', rgb: [0.88, 0.02, 0] },
  { name: 'Mercedes', hex: '#00d2be', rgb: [0, 0.82, 0.75] },
  { name: 'Red Bull', hex: '#3671c6', rgb: [0.21, 0.44, 0.78] },
  { name: 'McLaren', hex: '#ff8000', rgb: [1, 0.5, 0] },
  { name: 'Alpine', hex: '#0093cc', rgb: [0, 0.58, 0.8] },
  { name: 'Aston Martin', hex: '#006f62', rgb: [0, 0.44, 0.38] },
  { name: 'Haas', hex: '#b6babd', rgb: [0.71, 0.73, 0.74] },
  { name: 'Williams', hex: '#1e5bc6', rgb: [0.12, 0.36, 0.78] },
  { name: 'Sauber', hex: '#52e252', rgb: [0.32, 0.89, 0.32] },
  { name: 'RB', hex: '#6692ff', rgb: [0.4, 0.57, 1] },
];

/**
 * Initialize the team selector UI.
 * @param {THREE.Mesh[]} bodyMeshes — meshes to recolor
 * @param {THREE.Mesh} ringMesh — platform ring (color sync)
 * @param {Function} [onTeamChange] — callback(team)
 */
export function initTeamSelector(bodyMeshes, ringMesh, onTeamChange) {
  const container = document.getElementById('team-list');
  if (!container) return;

  container.innerHTML = '';

  TEAMS.forEach((team, index) => {
    const li = document.createElement('li');
    li.className = `team-item${index === 0 ? ' active' : ''}`;
    li.dataset.hex = team.hex;
    li.innerHTML = `
      <span class="team-swatch" style="background:${team.hex}"></span>
      <span class="team-name">${team.name}</span>
    `;

    li.addEventListener('click', () => {
      // Update active state
      container.querySelectorAll('.team-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');

      // Animate body color change
      const target = new THREE.Color(team.hex);
      bodyMeshes.forEach(mesh => {
        if (!mesh.material || !mesh.material.color) return;
        gsap.to(mesh.material.color, {
          r: target.r, g: target.g, b: target.b,
          duration: 0.8,
          ease: 'power2.inOut',
        });
      });

      // Sync ring color
      if (ringMesh && ringMesh.material) {
        gsap.to(ringMesh.material.color, {
          r: target.r, g: target.g, b: target.b,
          duration: 0.8,
          ease: 'power2.inOut',
        });
      }

      if (onTeamChange) onTeamChange(team);
    });

    container.appendChild(li);
  });
}
