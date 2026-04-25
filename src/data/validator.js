/**
 * FIA 2026 Regulations Constants
 * ================================
 * Single source of truth for all FIA regulation limits.
 * Used by VehicleValidator and the UI.
 */
export const FIA_2026_REGULATIONS = {
  battery: {
    maxMJ: 4.0,          // Maximum Energy Store deployment per lap
    unitLabel: 'MJ',
    errorCode: 'ERR_BAT_001',
    description: 'Energy Store exceeds FIA maximum deployment limit',
  },
  mguk: {
    maxKW: 350,          // Maximum MGU-K output power
    unitLabel: 'kW',
    errorCode: 'ERR_MGK_002',
    description: 'MGU-K power output exceeds FIA maximum limit',
  },
  ice: {
    maxKW: 400,          // Internal Combustion Engine max output
    maxRPM: 15000,
    errorCode: 'ERR_ICE_003',
    description: 'ICE output exceeds homologated specification',
  },
  fuel: {
    maxKgPerHour: 100,   // Fuel flow limit
    errorCode: 'ERR_FUEL_004',
    description: 'Fuel flow rate exceeds FIA limit',
  },
  wing: {
    minAngle: 1,
    maxAngle: 30,        // Degrees
    errorCode: 'ERR_AERO_005',
    description: 'Wing angle outside permitted range',
  },
};

/**
 * VehicleValidator Class
 * ======================
 * Real-time FIA compliance checker and performance calculator.
 *
 * Usage:
 *   const validator = new VehicleValidator();
 *   const result = validator.validate({ battery: 3.5, mguk: 320, wingAngle: 12 });
 *   console.log(result.compliant, result.errors, result.performance);
 */
export class VehicleValidator {
  constructor() {
    this.listeners = [];
    this.lastResult = null;
  }

  /**
   * Validate vehicle configuration against FIA regs
   * @param {{ battery: number, mguk: number, wingAngle: number }} params
   * @returns {{ compliant: boolean, errors: Array, warnings: Array, performance: Object }}
   */
  validate({ battery, mguk, wingAngle = 12 }) {
    const R = FIA_2026_REGULATIONS;
    const errors = [];
    const warnings = [];

    // ── Battery check ──
    if (battery > R.battery.maxMJ) {
      errors.push({
        code: R.battery.errorCode,
        message: `Battery ${battery.toFixed(1)} MJ > ${R.battery.maxMJ} MJ`,
        severity: 'CRITICAL',
        exceeded: battery - R.battery.maxMJ,
      });
    } else if (battery > R.battery.maxMJ * 0.9) {
      warnings.push({
        code: 'WARN_BAT_001',
        message: `Battery at ${((battery / R.battery.maxMJ) * 100).toFixed(0)}% of FIA limit`,
        severity: 'WARNING',
      });
    }

    // ── MGU-K check ──
    if (mguk > R.mguk.maxKW) {
      errors.push({
        code: R.mguk.errorCode,
        message: `MGU-K ${mguk} kW > ${R.mguk.maxKW} kW`,
        severity: 'CRITICAL',
        exceeded: mguk - R.mguk.maxKW,
      });
    } else if (mguk > R.mguk.maxKW * 0.9) {
      warnings.push({
        code: 'WARN_MGK_001',
        message: `MGU-K at ${((mguk / R.mguk.maxKW) * 100).toFixed(0)}% of FIA limit`,
        severity: 'WARNING',
      });
    }

    // ── Wing angle check ──
    if (wingAngle < R.wing.minAngle || wingAngle > R.wing.maxAngle) {
      errors.push({
        code: R.wing.errorCode,
        message: `Wing angle ${wingAngle}° outside [${R.wing.minAngle}°–${R.wing.maxAngle}°]`,
        severity: 'CRITICAL',
      });
    }

    // ── Performance calculations ──
    const performance = this._calculatePerformance({ battery, mguk, wingAngle });

    const result = {
      compliant: errors.length === 0,
      errors,
      warnings,
      performance,
      timestamp: Date.now(),
    };

    this.lastResult = result;
    this._notify(result);
    return result;
  }

  /**
   * Calculate estimated performance metrics
   * Based on simplified F1 2026 physics model
   * @private
   */
  _calculatePerformance({ battery, mguk, wingAngle }) {
    const R = FIA_2026_REGULATIONS;

    // Total power: ICE base + MGU-K contribution
    const icePowerKW = R.ice.maxKW;
    const mgukContribution = Math.min(mguk, R.mguk.maxKW);
    const totalPowerKW = icePowerKW + mgukContribution;

    // ERS deployment as % of battery
    const ersDeploymentPct = Math.min((battery / R.battery.maxMJ) * 100, 100);

    // Aerodynamic downforce: higher wing angle = more downforce
    // Approx: F1 car generates ~2500N at 300km/h at neutral; wing adds up to ~4000N extra
    const downforceN = Math.round(2500 + wingAngle * 133);

    // Drag coefficient effect on top speed
    // Higher wing = more drag = lower top speed
    // Base top speed ~350km/h at min wing, ~290 at max wing
    const dragFactor = 1 - (wingAngle - 1) / 29 * 0.17;
    const basePowerFactor = Math.min(totalPowerKW / 750, 1.0);
    const estimatedTopSpeed = Math.round(350 * dragFactor * (0.85 + basePowerFactor * 0.15));

    // Acceleration G-force (0-100 km/h)
    // F1 2026 with full ERS: ~5.5G peak
    // Formula: higher MGU-K = faster acceleration, wing angle reduces grip limit
    const gripFactor = 1 + (wingAngle - 1) / 29 * 0.3;
    const powerFactor = totalPowerKW / 750;
    const accelerationGForce = parseFloat((2.5 + powerFactor * 3.0 * gripFactor).toFixed(2));

    // ICE overheat risk: high power + high battery drain together
    const overheatRisk = battery > 3.5 && mguk > 300;

    // Fuel flow (simplified)
    const fuelFlowKgH = Math.round(60 + (totalPowerKW / 750) * 40);

    return {
      totalPowerKW,
      estimatedTopSpeed,
      accelerationGForce,
      downforceN,
      ersDeploymentPct,
      fuelFlowKgH,
      overheatRisk,
    };
  }

  /**
   * Subscribe to validation results
   * @param {Function} fn - callback(result)
   */
  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  _notify(result) {
    this.listeners.forEach(fn => fn(result));
  }
}
