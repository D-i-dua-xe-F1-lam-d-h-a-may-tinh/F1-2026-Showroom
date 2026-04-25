/**
 * Team Selector — Phase 2
 */
import { teams } from '../data/teams.js';

export function initTeamSelector(onTeamSelect) {
  const listEl = document.getElementById('team-list');
  if (!listEl) return teams[0];

  teams.forEach((team, i) => {
    const li = document.createElement('li');
    li.className = 'team-item' + (i === 0 ? ' active' : '');
    li.dataset.teamId = team.id;
    li.style.setProperty('--team-color', team.hexColor);

    li.innerHTML = `
      <span class="team-color-dot" style="background:${team.hexColor};--dot-color:${team.hexColor};"></span>
      <span class="team-name">${team.name}</span>
    `;

    li.addEventListener('click', () => {
      listEl.querySelectorAll('.team-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      onTeamSelect(team);
    });

    listEl.appendChild(li);
  });

  return teams[0];
}
