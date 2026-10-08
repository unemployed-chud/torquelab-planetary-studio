/** Planetary gear kinematics using Willis' relation.
 * Ns(ws - wc) + Nr(wr - wc) = 0
 * Positive angular velocities indicate CCW rotation.
 */
export const PRESETS = Object.freeze([
  { id: 'balanced', name: 'Balanced', sub: 'Smooth all-rounder', sun: 24, planet: 24 },
  { id: 'torque', name: 'High torque', sub: 'Maximum reduction', sun: 18, planet: 27 },
  { id: 'compact', name: 'Compact', sub: 'Fast response', sun: 30, planet: 18 },
]);

export const MODES = Object.freeze([
  {id:'ring-fixed', label:'Ring fixed', input:'Sun', fixed:'Ring', output:'Carrier'},
  {id:'sun-fixed', label:'Sun fixed', input:'Ring', fixed:'Sun', output:'Carrier'},
  {id:'carrier-fixed', label:'Carrier fixed', input:'Sun', fixed:'Carrier', output:'Ring'},
]);

export function computeKinematics({ sun = 24, planet = 24, rpm = 900, mode = 'ring-fixed' } = {}) {
  if (!Number.isInteger(sun) || !Number.isInteger(planet) || sun <= 0 || planet <= 0) {
    throw new RangeError('Gear tooth counts must be positive integers.');
  }
  if (!Number.isFinite(rpm)) throw new RangeError('Input RPM must be finite.');
  const ring = sun + 2 * planet;
  let ws, wr, wc;
  switch (mode) {
    case 'ring-fixed': ws = rpm; wr = 0; wc = (sun * ws) / (sun + ring); break;
    case 'sun-fixed': ws = 0; wr = rpm; wc = (ring * wr) / (sun + ring); break;
    case 'carrier-fixed': wc = 0; ws = rpm; wr = -(sun * ws) / ring; break;
    default: throw new RangeError(`Unknown mode: ${mode}`);
  }
  const wp = wc - (sun / planet) * (ws - wc);
  const output = mode === 'carrier-fixed' ? wr : wc;
  const ratio = Math.abs(output) < 1e-9 ? Infinity : Math.abs(rpm / output);
  const assemblyPossible = (sun + ring) % 3 === 0;
  return { sun, planet, ring, rpm, mode, ws, wr, wc, wp, output, ratio, reverse: output < 0, assemblyPossible,
    residual: sun*(ws-wc) + ring*(wr-wc)};
}
export const formatRPM = x => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(x);
