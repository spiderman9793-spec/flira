/**
 * Flame physics & partial-gravity bounding engine for the 0 g - 1 g gap.
 *
 * Design rule:
 * - Every output is a dimensionless index or an explicitly calibrated quantity.
 * - spreadRateMmS() returns null unless a measured anchor rate & environment are supplied.
 * - Intermediate gravity (0 < g < 1) returns a Monte Carlo 10th-90th percentile bracket
 *   and explicitly states that PSI has no empirical partial-g data (LUCI/FM2 have not flown).
 */

export const P0_PSI = 14.7;
export const O2_REF = 21.0;
export const P_H2O_PSI = 0.3;

export interface Environment {
  gravity_g: number;
  pressure_psi: number;
  o2_pct: number;
  flow_cm_s: number;
  efield_kv: number;
  label: string;
}

export function clampEnv(env: Environment): Environment {
  return {
    gravity_g: Math.min(1.0, Math.max(0.0, env.gravity_g)),
    pressure_psi: Math.min(30.0, Math.max(1.0, env.pressure_psi)),
    o2_pct: Math.min(100.0, Math.max(5.0, env.o2_pct)),
    flow_cm_s: Math.min(100.0, Math.max(0.0, env.flow_cm_s)),
    efield_kv: Math.min(20.0, Math.max(0.0, env.efield_kv)),
    label: env.label,
  };
}

export const PRESETS: Record<string, Environment> = {
  'Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)': {
    gravity_g: 0.16,
    pressure_psi: 10.2,
    o2_pct: 30.0,
    flow_cm_s: 8.0,
    efield_kv: 0.0,
    label: 'lunar',
  },
  'ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)': {
    gravity_g: 0.0,
    pressure_psi: 14.7,
    o2_pct: 21.0,
    flow_cm_s: 10.0,
    efield_kv: 0.0,
    label: 'iss',
  },
  'EVA Spacesuit (0g, 4.3 psi, 100% O2)': {
    gravity_g: 0.0,
    pressure_psi: 4.3,
    o2_pct: 100.0,
    flow_cm_s: 3.0,
    efield_kv: 0.0,
    label: 'eva',
  },
  'Mars Habitat (0.38g, 8.2 psi, 34% O2)': {
    gravity_g: 0.38,
    pressure_psi: 8.2,
    o2_pct: 34.0,
    flow_cm_s: 8.0,
    efield_kv: 0.0,
    label: 'mars',
  },
  'ACME CFI-G Chamber (0g, 14.7 psi, 85% O2)': {
    gravity_g: 0.0,
    pressure_psi: 14.7,
    o2_pct: 85.0,
    flow_cm_s: 5.0,
    efield_kv: 0.0,
    label: 'cfi-g',
  },
  'Earth Baseline (1g, 14.7 psi, 21% O2)': {
    gravity_g: 1.0,
    pressure_psi: 14.7,
    o2_pct: 21.0,
    flow_cm_s: 0.0,
    efield_kv: 0.0,
    label: 'earth',
  },
};

export interface ModelParams {
  buoyant_ref_cm_s: number;
  ion_per_kv_cm_s: number;
  peak_velocity_cm_s: number;
  log_width: number;
  base_response: number;
  o2_exponent: number;
  pressure_exponent: number;
  loi_pressure_exponent: number;
  prebreathe_min_per_psi: number;
  prebreathe_floor_psi: number;
}

export const DEFAULT_PARAMS: ModelParams = {
  buoyant_ref_cm_s: 21.0,
  ion_per_kv_cm_s: 2.2,
  peak_velocity_cm_s: 9.0,
  log_width: 0.55,
  base_response: 0.06,
  o2_exponent: 1.5,
  pressure_exponent: 0.35,
  loi_pressure_exponent: 0.2,
  prebreathe_min_per_psi: 9.0,
  prebreathe_floor_psi: 0.5,
};

// Deterministic Mulberry32 PRNG so Monte Carlo bands are reproducible
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniform(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function jitterParams(p: ModelParams, rng: () => number): ModelParams {
  return {
    buoyant_ref_cm_s: uniform(rng, 15.0, 28.0),
    ion_per_kv_cm_s: uniform(rng, 1.6, 3.0),
    peak_velocity_cm_s: uniform(rng, 6.0, 13.0),
    log_width: uniform(rng, 0.4, 0.75),
    base_response: uniform(rng, 0.02, 0.12),
    o2_exponent: uniform(rng, 1.1, 1.9),
    pressure_exponent: uniform(rng, 0.2, 0.5),
    loi_pressure_exponent: uniform(rng, 0.1, 0.3),
    prebreathe_min_per_psi: p.prebreathe_min_per_psi,
    prebreathe_floor_psi: p.prebreathe_floor_psi,
  };
}

export function buoyantVelocity(env: Environment, p: ModelParams = DEFAULT_PARAMS): number {
  const c = clampEnv(env);
  return p.buoyant_ref_cm_s * Math.sqrt(c.gravity_g) * (c.pressure_psi / P0_PSI);
}

export function ionWindVelocity(env: Environment, p: ModelParams = DEFAULT_PARAMS): number {
  return p.ion_per_kv_cm_s * clampEnv(env).efield_kv;
}

export function effectiveVelocity(env: Environment, p: ModelParams = DEFAULT_PARAMS): number {
  const c = clampEnv(env);
  const bodyForce = buoyantVelocity(c, p) + ionWindVelocity(c, p);
  return Math.hypot(c.flow_cm_s, bodyForce);
}

function flowResponse(u: number, p: ModelParams): number {
  const clamped = Math.max(u, 1e-3);
  const z = Math.log(clamped / p.peak_velocity_cm_s);
  const bump = Math.exp(-(z * z) / (2.0 * p.log_width * p.log_width));
  return p.base_response + (1.0 - p.base_response) * bump;
}

export function relativeFlammabilityIndex(
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS
): number {
  const c = clampEnv(env);
  const o2Factor = Math.pow(c.o2_pct / O2_REF, p.o2_exponent);
  const pFactor = Math.pow(c.pressure_psi / P0_PSI, p.pressure_exponent);
  return o2Factor * pFactor * flowResponse(effectiveVelocity(c, p), p);
}

/**
 * Spread rate in mm/s ONLY when a measured anchor is supplied.
 * Returns null otherwise — refuses to fabricate NASA rates.
 */
export function spreadRateMmS(
  env: Environment,
  anchorRateMmS: number | null,
  anchorEnv: Environment | null = null,
  p: ModelParams = DEFAULT_PARAMS
): number | null {
  if (anchorRateMmS === null || anchorEnv === null) return null;
  const ref = relativeFlammabilityIndex(anchorEnv, p);
  if (ref <= 0) return null;
  return (anchorRateMmS * relativeFlammabilityIndex(env, p)) / ref;
}

function percentile(sorted: number[], pct: number): number {
  if (!sorted.length) return 0;
  const idx = (pct / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface BandPoint {
  gravity_g: number;
  median: number;
  p10: number;
  p90: number;
}

export function gravityBand(
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS,
  nDraws = 400,
  seed = 7
): BandPoint[] {
  const c = clampEnv(env);
  const rng = mulberry32(seed);
  const paramSet = Array.from({ length: nDraws }, () => jitterParams(p, rng));
  const out: BandPoint[] = [];

  for (let step = 0; step <= 50; step++) {
    const g = Math.round(step * 0.02 * 100) / 100;
    const envG: Environment = { ...c, gravity_g: g };
    const vals = paramSet.map((pp) => relativeFlammabilityIndex(envG, pp)).sort((a, b) => a - b);
    out.push({
      gravity_g: g,
      median: percentile(vals, 50),
      p10: percentile(vals, 10),
      p90: percentile(vals, 90),
    });
  }
  return out;
}

export interface PartialGravityVerdict {
  gravity_g: number;
  index: number;
  p10: number;
  p90: number;
  index_0g: number;
  index_1g: number;
  bracket_low: number;
  bracket_high: number;
  has_empirical_data: boolean;
  statement: string;
}

export function partialGravityVerdict(
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS,
  nDraws = 400,
  seed = 7
): PartialGravityVerdict {
  const c = clampEnv(env);
  const band = gravityBand(c, p, nDraws, seed);
  const here = band.reduce((best, b) =>
    Math.abs(b.gravity_g - c.gravity_g) < Math.abs(best.gravity_g - c.gravity_g) ? b : best
  );
  const at0g = band[0];
  const at1g = band[band.length - 1];
  const bracketLow = Math.min(...band.map((b) => b.p10));
  const bracketHigh = Math.max(...band.map((b) => b.p90));

  let statement: string;
  let hasData: boolean;
  if (c.gravity_g <= 0.01) {
    statement =
      'At microgravity this is the regime PSI actually measured, so the index is anchored in data. It is still a model output: PSI spread rates were not used to fit it.';
    hasData = true;
  } else if (c.gravity_g >= 0.99) {
    statement =
      'At 1 g this is the regime terrestrial fire standards are written in. The index is the least uncertain point in the model.';
    hasData = true;
  } else {
    statement = `No empirical combustion data exists at ${c.gravity_g.toFixed(
      2
    )} g — PSI contains only 0 g results, and LUCI and FM2 have not flown. The plausible range is bounded by the 0 g and 1 g limits and shaded with the model's own parameter uncertainty. Treat the number as a bracket, not a measurement.`;
    hasData = false;
  }

  return {
    gravity_g: c.gravity_g,
    index: relativeFlammabilityIndex(c, p),
    p10: here.p10,
    p90: here.p90,
    index_0g: at0g.median,
    index_1g: at1g.median,
    bracket_low: bracketLow,
    bracket_high: bracketHigh,
    has_empirical_data: hasData,
    statement,
  };
}

export const MATERIAL_LOI: Record<string, [number, string]> = {
  'PMMA (acrylic)': [17.5, 'literature, 1 atm, 1 g'],
  Cotton: [18.5, 'literature, 1 atm, 1 g'],
  Silicone: [26.0, 'literature, 1 atm, 1 g'],
  Nomex: [28.0, 'literature, 1 atm, 1 g'],
  'SIBAL fabric (cotton/fiberglass)': [30.0, 'literature, 1 atm, 1 g'],
  Kapton: [37.0, 'literature, 1 atm, 1 g'],
  Fiberglass: [55.0, 'literature, 1 atm, 1 g'],
};

export interface FlammabilityMargin {
  material: string;
  loi_at_1atm: number;
  loi_effective: number;
  o2_pct: number;
  margin_pct: number;
  verdict: string;
  severity: 'danger' | 'warn' | 'caution' | 'safe';
  basis: string;
}

export function loiEffective(
  material: string,
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS
): number {
  const [base] = MATERIAL_LOI[material];
  const c = clampEnv(env);
  return base * Math.pow(P0_PSI / c.pressure_psi, p.loi_pressure_exponent);
}

export function flammabilityMargin(
  material: string,
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS
): FlammabilityMargin {
  const c = clampEnv(env);
  const [base, basis] = MATERIAL_LOI[material];
  const eff = loiEffective(material, c, p);
  const margin = c.o2_pct - eff;
  let verdict: string;
  let severity: FlammabilityMargin['severity'];
  if (margin > 6) {
    verdict = 'BURNS READILY — do not use in this atmosphere';
    severity = 'danger';
  } else if (margin > 0) {
    verdict = 'FLAMMABLE — narrow margin, flow-dependent';
    severity = 'warn';
  } else if (margin > -4) {
    verdict = 'MARGINAL — sensitive to pressure and airflow';
    severity = 'caution';
  } else {
    verdict = 'NON-FLAMMABLE at this atmosphere';
    severity = 'safe';
  }
  return {
    material,
    loi_at_1atm: base,
    loi_effective: Math.round(eff * 10) / 10,
    o2_pct: c.o2_pct,
    margin_pct: Math.round(margin * 10) / 10,
    verdict,
    severity,
    basis,
  };
}

export interface PrebreatheEstimate {
  minutes: number;
  nitrogen_psi: number;
  basis: string;
}

export function prebreatheMinutes(
  env: Environment,
  p: ModelParams = DEFAULT_PARAMS
): PrebreatheEstimate {
  const c = clampEnv(env);
  const pn2 = (1.0 - c.o2_pct / 100.0) * Math.max(c.pressure_psi - P_H2O_PSI, 0.0);
  const minutes = Math.max(0.0, (pn2 - p.prebreathe_floor_psi) * p.prebreathe_min_per_psi);
  return {
    minutes: Math.round(minutes),
    nitrogen_psi: Math.round(pn2 * 100) / 100,
    basis:
      'linearised denitrogenation, calibrated to ~98 min from sea-level air to a 4.3 psi suit; not a DCS risk model',
  };
}

export interface Morphology {
  aspect_ratio: number;
  regime: string;
  buoyant_share: number;
  colour: string;
}

export function morphology(env: Environment, p: ModelParams = DEFAULT_PARAMS): Morphology {
  const c = clampEnv(env);
  const ub = buoyantVelocity(c, p);
  const ui = ionWindVelocity(c, p);
  const uf = c.flow_cm_s;
  const forced = uf + ui;
  const share = ub / (ub + forced + 1e-6);
  const aspect = Math.min(3.5, Math.max(1.0, 1.0 + 2.0 * share));

  let regime: string;
  let colour: string;
  if (ub < 0.15 * Math.max(forced, 1e-6)) {
    regime = 'Diffusion sphere (buoyancy-free)';
    colour = '#4C8DFF';
  } else if (ui > ub) {
    regime = 'Ion-wind stretched (E-field dominated)';
    colour = '#8FA6C4';
  } else if (c.o2_pct >= 50.0) {
    regime = 'High-oxygen, sooting teardrop';
    colour = '#D5DEEA';
  } else {
    regime = 'Buoyant teardrop';
    colour = '#D9A441';
  }

  return {
    aspect_ratio: Math.round(aspect * 100) / 100,
    regime,
    buoyant_share: Math.round(share * 1000) / 1000,
    colour,
  };
}

export interface PhysicsSummary {
  environment: Environment;
  index: number;
  index_0g: number;
  index_1g: number;
  band_p10: number;
  band_p90: number;
  bracket: [number, number];
  has_empirical_data: boolean;
  statement: string;
  effective_flow_cm_s: number;
  buoyant_velocity_cm_s: number;
  ion_wind_cm_s: number;
  prebreathe_min: number;
  prebreathe_basis: string;
  morphology: Morphology;
}

export function summarise(env: Environment, p: ModelParams = DEFAULT_PARAMS): PhysicsSummary {
  const c = clampEnv(env);
  const verdict = partialGravityVerdict(c, p);
  const pre = prebreatheMinutes(c, p);
  const morph = morphology(c, p);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    environment: c,
    index: r3(verdict.index),
    index_0g: r3(verdict.index_0g),
    index_1g: r3(verdict.index_1g),
    band_p10: r3(verdict.p10),
    band_p90: r3(verdict.p90),
    bracket: [r3(verdict.bracket_low), r3(verdict.bracket_high)],
    has_empirical_data: verdict.has_empirical_data,
    statement: verdict.statement,
    effective_flow_cm_s: Math.round(effectiveVelocity(c, p) * 10) / 10,
    buoyant_velocity_cm_s: Math.round(buoyantVelocity(c, p) * 10) / 10,
    ion_wind_cm_s: Math.round(ionWindVelocity(c, p) * 10) / 10,
    prebreathe_min: pre.minutes,
    prebreathe_basis: pre.basis,
    morphology: morph,
  };
}
