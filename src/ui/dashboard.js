/**
 * FIA Dashboard — Phase 3 (Race-Ready)
 * ======================================
 * VehicleValidator + FIA article codes + START RACE lock.
 *
 * Violation articles:
 *   - Energy Store >4.0MJ → "Article 5.1.2"
 *   - MGU-K >350kW → "Article 5.2.1"
 *
 * START RACE button is DISABLED when FIA violations exist.
 */
import gsap from 'gsap';
import { VehicleValidator, FIA_2026_REGULATIONS } from '../data/validator.js';

export function initDashboard(onParamsChange, onStartRace) {
  const validator = new VehicleValidator();

  // DOM refs
  const battSlider = document.getElementById('battery-slider');
  const mgukSlider = document.getElementById('mguk-slider');
  const wingSlider = document.getElementById('wing-slider');
  const battValueEl = document.getElementById('battery-value');
  const mgukValueEl = document.getElementById('mguk-value');
  const wingValueEl = document.getElementById('wing-value');
  const battBar = document.getElementById('battery-bar');
  const mgukBar = document.getElementById('mguk-bar');
  const fiaStatus = document.getElementById('fia-status');
  const errorCodesEl = document.getElementById('error-codes');
  const warningOverlay = document.getElementById('fia-warning-overlay');
  const warningMsg = document.getElementById('warning-message');
  const warningCodes = document.getElementById('warning-codes');
  const startRaceBtn = document.getElementById('btn-start-race');

  // Telemetry HUD refs
  const telSpeed = document.getElementById('tel-speed');
  const telGforce = document.getElementById('tel-gforce');
  const telPower = document.getElementById('tel-power');
  const telDownforce = document.getElementById('tel-downforce');
  const ersPct = document.getElementById('ers-pct');
  const ersBarFill = document.getElementById('ers-bar-fill');
  const iceOverheat = document.getElementById('ice-overheat');
  const iceStatusText = document.getElementById('ice-status-text');

  let warningTimeout = null;
  let currentCompliant = true;

  function getParams() {
    return {
      battery: parseFloat(battSlider.value),
      mguk: parseInt(mgukSlider.value),
      wingAngle: parseInt(wingSlider.value),
    };
  }

  function updateDisplay() {
    const params = getParams();
    const { battery, mguk, wingAngle } = params;

    // Value displays
    battValueEl.innerHTML = `${battery.toFixed(1)}<small>MJ</small>`;
    mgukValueEl.innerHTML = `${mguk}<small>kW</small>`;
    wingValueEl.innerHTML = `${wingAngle}<small>°</small>`;

    // Limit bars
    const battPct = Math.min((battery / 5) * 100, 100);
    const mgukPct = Math.min((mguk / 500) * 100, 100);
    if (battBar) gsap.to(battBar, { width: `${battPct}%`, duration: 0.3, ease: 'power1.out' });
    if (mgukBar) gsap.to(mgukBar, { width: `${mgukPct}%`, duration: 0.3, ease: 'power1.out' });

    const battBreached = battery > FIA_2026_REGULATIONS.battery.maxMJ;
    const mgukBreached = mguk > FIA_2026_REGULATIONS.mguk.maxKW;

    if (battBar) battBar.style.background = battBreached ? 'var(--warning-red)' : 'linear-gradient(90deg, #00f0ff, #0088cc)';
    if (mgukBar) mgukBar.style.background = mgukBreached ? 'var(--warning-red)' : 'linear-gradient(90deg, #00f0ff, #0088cc)';
    if (battValueEl) battValueEl.classList.toggle('warning', battBreached);
    if (mgukValueEl) mgukValueEl.classList.toggle('warning', mgukBreached);

    // Slider color change on violation
    if (battSlider) battSlider.classList.toggle('slider-violation', battBreached);
    if (mgukSlider) mgukSlider.classList.toggle('slider-violation', mgukBreached);

    // Run validator
    const result = validator.validate(params);
    currentCompliant = result.compliant;

    // ── FIA status + Article codes ──
    if (!result.compliant) {
      if (fiaStatus) {
        fiaStatus.className = 'fia-status violation';
        fiaStatus.innerHTML = '<span class="fia-status-icon">🚫</span><span class="fia-status-text">FIA VIOLATION</span>';
      }

      // Error codes with FIA article references
      if (errorCodesEl) {
        errorCodesEl.classList.remove('hidden');
        errorCodesEl.innerHTML = result.errors.map(e => {
          // Map error codes to FIA articles
          let article = '';
          if (e.code === 'ERR_BAT_001') article = 'Article 5.1.2';
          else if (e.code === 'ERR_MGK_002') article = 'Article 5.2.1';
          else if (e.code === 'ERR_AERO_005') article = 'Article 3.10.2';

          return `<div class="error-code-item">
            <span class="ec-code">${e.code}</span>
            <span class="ec-article">${article}</span>
            <span class="ec-msg">${e.message}</span>
          </div>`;
        }).join('');
      }

      // Warning overlay with TECHNICAL VIOLATION
      const articleList = result.errors.map(e => {
        if (e.code === 'ERR_BAT_001') return 'Article 5.1.2';
        if (e.code === 'ERR_MGK_002') return 'Article 5.2.1';
        return e.code;
      }).join(' / ');

      if (warningMsg) warningMsg.textContent = `TECHNICAL VIOLATION: ${articleList}`;
      if (warningCodes) {
        warningCodes.innerHTML = result.errors.map(e =>
          `<span class="warn-code-badge">${e.code}</span>`
        ).join(' ');
      }

      if (warningOverlay) {
        warningOverlay.classList.remove('hidden');
        warningOverlay.classList.add('visible');
        clearTimeout(warningTimeout);
        warningTimeout = setTimeout(() => {
          warningOverlay.classList.remove('visible');
          warningOverlay.classList.add('hidden');
        }, 3500);
      }

      // ── LOCK START RACE BUTTON ──
      if (startRaceBtn) {
        startRaceBtn.disabled = true;
        startRaceBtn.classList.add('disabled');
        startRaceBtn.title = 'Fix FIA violations to enable race';
      }

    } else {
      if (fiaStatus) {
        fiaStatus.className = result.warnings.length > 0 ? 'fia-status warning' : 'fia-status compliant';
        fiaStatus.innerHTML = result.warnings.length > 0
          ? '<span class="fia-status-icon">⚠️</span><span class="fia-status-text">FIA WARNING</span>'
          : '<span class="fia-status-icon">✅</span><span class="fia-status-text">FIA COMPLIANT</span>';
      }
      if (errorCodesEl) errorCodesEl.classList.add('hidden');
      if (warningOverlay) {
        warningOverlay.classList.remove('visible');
        warningOverlay.classList.add('hidden');
      }

      // ── UNLOCK START RACE BUTTON ──
      if (startRaceBtn) {
        startRaceBtn.disabled = false;
        startRaceBtn.classList.remove('disabled');
        startRaceBtn.title = 'Start test race on the circuit';
      }
    }

    // ── Telemetry HUD ──
    const perf = result.performance;

    if (telSpeed) {
      gsap.to({ val: parseFloat(telSpeed.dataset.val || 0) }, {
        val: perf.estimatedTopSpeed,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function () {
          const v = Math.round(this.targets()[0].val);
          telSpeed.dataset.val = v;
          telSpeed.innerHTML = `${v}<small>km/h</small>`;
        },
      });
    }
    if (telGforce) telGforce.innerHTML = `${perf.accelerationGForce}<small>G</small>`;
    if (telPower) telPower.innerHTML = `${perf.totalPowerKW}<small>kW</small>`;
    if (telDownforce) telDownforce.innerHTML = `${perf.downforceN.toLocaleString()}<small>N</small>`;

    // ERS bar
    if (ersPct && ersBarFill) {
      const ers = Math.round(perf.ersDeploymentPct);
      ersPct.textContent = `${ers}%`;
      gsap.to(ersBarFill, { width: `${ers}%`, duration: 0.4, ease: 'power2.out' });
      ersBarFill.style.background = ers > 90
        ? 'var(--warning-red)' : ers > 75
        ? '#ffaa00' : 'linear-gradient(90deg, #00f0ff, #00ff88)';
    }

    // ICE overheat
    if (iceOverheat && iceStatusText) {
      if (perf.overheatRisk) {
        iceOverheat.classList.add('active', 'danger');
        iceStatusText.textContent = 'OVERHEAT RISK';
        iceStatusText.style.color = 'var(--warning-red)';
      } else {
        iceOverheat.classList.remove('active', 'danger');
        iceStatusText.textContent = 'NOMINAL';
        iceStatusText.style.color = 'var(--success-green)';
      }
    }

    // Notify external systems
    if (onParamsChange) onParamsChange(params, result);
  }

  // ── Event listeners ──
  if (battSlider) battSlider.addEventListener('input', updateDisplay);
  if (mgukSlider) mgukSlider.addEventListener('input', updateDisplay);
  if (wingSlider) wingSlider.addEventListener('input', updateDisplay);

  // ── START RACE button ──
  if (startRaceBtn) {
    startRaceBtn.addEventListener('click', () => {
      if (currentCompliant && onStartRace) {
        onStartRace();
      }
    });
  }

  updateDisplay();

  return { validator };
}
