import { Environment } from './physics';
import { Investigation, TestCondition } from './schema';

export interface Weights {
  gravity: number;
  oxygen: number;
  pressure: number;
  flow: number;
  phase: number;
  pillar: number;
  hardware: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  gravity: 1.0,
  oxygen: 1.3,
  pressure: 0.8,
  flow: 1.0,
  phase: 0.9,
  pillar: 1.2,
  hardware: 0.3,
};

export interface RankComponent {
  name: keyof Weights;
  value: number;
  weight: number;
  reason: string;
}

export interface RankedInvestigation {
  investigation: Investigation;
  condition: TestCondition;
  score: number;
  components: RankComponent[];
  flags: string[];
}

export function gravityComponent(inv: Investigation, env: Environment): RankComponent {
  const target = env.gravity_g;
  if (target <= 0.01) {
    const best = Math.min(...inv.gravity_g.map((g) => Math.abs(g - target)));
    const value = best < 0.02 ? 1.0 : Math.max(0.0, 1.0 - best);
    return {
      name: 'gravity',
      value,
      weight: DEFAULT_WEIGHTS.gravity,
      reason: 'measured in the microgravity regime the habitat operates in',
    };
  }
  if (target >= 0.99) {
    const best = Math.min(...inv.gravity_g.map((g) => Math.abs(g - target)));
    const value = best < 0.02 ? 1.0 : Math.max(0.0, 1.0 - best);
    return {
      name: 'gravity',
      value,
      weight: DEFAULT_WEIGHTS.gravity,
      reason: 'measured at 1 g, the regime terrestrial limits are written in',
    };
  }
  const zeroG = inv.gravity_g.some((g) => g <= 0.01);
  const oneG = inv.gravity_g.some((g) => g >= 0.99);
  if (zeroG) {
    return {
      name: 'gravity',
      value: 0.72,
      weight: DEFAULT_WEIGHTS.gravity,
      reason: '0 g end of the bounding pair for a partial-g habitat',
    };
  }
  if (oneG) {
    return {
      name: 'gravity',
      value: 0.55,
      weight: DEFAULT_WEIGHTS.gravity,
      reason: '1 g end of the bounding pair for a partial-g habitat',
    };
  }
  return {
    name: 'gravity',
    value: 0.0,
    weight: DEFAULT_WEIGHTS.gravity,
    reason: 'no gravity level useful for bounding',
  };
}

export function oxygenComponent(cond: TestCondition, env: Environment): RankComponent {
  const delta = cond.o2_pct - env.o2_pct;
  const scale = 25.0;
  if (delta >= 0) {
    return {
      name: 'oxygen',
      value: Math.max(0.0, 1.0 - delta / scale),
      weight: DEFAULT_WEIGHTS.oxygen,
      reason: `${Math.round(cond.o2_pct)}% O2 covers the habitat's ${Math.round(env.o2_pct)}%`,
    };
  }
  return {
    name: 'oxygen',
    value: Math.max(0.0, 1.0 - Math.abs(delta) / (scale * 0.7)),
    weight: DEFAULT_WEIGHTS.oxygen,
    reason: `${Math.round(cond.o2_pct)}% O2 is below the habitat's ${Math.round(
      env.o2_pct
    )}% — result needs extrapolating upward`,
  };
}

export function pressureComponent(cond: TestCondition, env: Environment): RankComponent {
  const delta = Math.abs(cond.pressure_psi - env.pressure_psi);
  return {
    name: 'pressure',
    value: Math.max(0.0, 1.0 - delta / 7.0),
    weight: DEFAULT_WEIGHTS.pressure,
    reason: `tested at ${cond.pressure_psi.toFixed(1)} psi vs habitat ${env.pressure_psi.toFixed(
      1
    )} psi`,
  };
}

export function flowComponent(cond: TestCondition, env: Environment): RankComponent {
  const delta = Math.abs(cond.flow_cm_s - env.flow_cm_s);
  return {
    name: 'flow',
    value: Math.max(0.0, 1.0 - delta / 25.0),
    weight: DEFAULT_WEIGHTS.flow,
    reason: `${Math.round(cond.flow_cm_s)} cm/s airflow vs habitat ${Math.round(
      env.flow_cm_s
    )} cm/s`,
  };
}

export function phaseComponent(inv: Investigation, materialClass: string): RankComponent {
  const value = inv.phase.includes(materialClass)
    ? 1.0
    : inv.phase.includes('solid')
    ? 0.6
    : 0.35;
  return {
    name: 'phase',
    value,
    weight: DEFAULT_WEIGHTS.phase,
    reason: `${inv.phase.join(' / ')} fuel vs ${materialClass}-dominated habitat`,
  };
}

export function pillarComponent(inv: Investigation, wanted: string[]): RankComponent {
  if (!wanted.length) {
    return {
      name: 'pillar',
      value: 1.0,
      weight: DEFAULT_WEIGHTS.pillar,
      reason: 'no pillar filter applied',
    };
  }
  const overlap = inv.pillars.filter((p) => wanted.includes(p)).sort();
  return {
    name: 'pillar',
    value: overlap.length ? 1.0 : 0.0,
    weight: DEFAULT_WEIGHTS.pillar,
    reason: overlap.length
      ? `addresses ${overlap.join(', ')}`
      : `addresses ${inv.pillars.join(', ')} — outside selected pillars`,
  };
}

export function hardwareComponent(inv: Investigation, catalogue: Investigation[]): RankComponent {
  const siblings = catalogue.filter(
    (other) => other.hardware === inv.hardware && other.id !== inv.id
  ).length;
  return {
    name: 'hardware',
    value: Math.min(1.0, siblings / 3.0),
    weight: DEFAULT_WEIGHTS.hardware,
    reason: siblings
      ? `shares '${inv.hardware}' with ${siblings} other investigation(s), so results are comparable`
      : `unique hardware ('${inv.hardware}') — harder to compare directly`,
  };
}

function computeFlags(cond: TestCondition, env: Environment): string[] {
  const flags: string[] = [];
  if (cond.o2_pct < env.o2_pct - 3) flags.push('oxygen coverage gap');
  if (env.gravity_g > 0.01 && env.gravity_g < 0.99) flags.push('no partial-gravity data exists');
  if (cond.pressure_psi > env.pressure_psi * 1.4) flags.push('test pressure well above habitat');
  if (env.o2_pct >= 30 && cond.o2_pct >= 50) flags.push('high-oxygen analogue');
  return flags;
}

export function scoreInvestigation(
  inv: Investigation,
  catalogue: Investigation[],
  env: Environment,
  weights: Weights = DEFAULT_WEIGHTS,
  pillars: string[] = [],
  materialClass = 'solid'
): RankedInvestigation {
  let best: RankedInvestigation | null = null;
  for (const cond of inv.conditions) {
    const comps: RankComponent[] = [
      gravityComponent(inv, env),
      oxygenComponent(cond, env),
      pressureComponent(cond, env),
      flowComponent(cond, env),
      phaseComponent(inv, materialClass),
      pillarComponent(inv, pillars),
      hardwareComponent(inv, catalogue),
    ];
    let num = 0;
    let den = 0;
    for (const c of comps) {
      const w = weights[c.name];
      num += c.value * w;
      if (w > 0) den += w;
    }
    const score = den > 0 ? Math.round((100.0 * num / den) * 10) / 10 : 0.0;
    const candidate: RankedInvestigation = {
      investigation: inv,
      condition: cond,
      score,
      components: comps,
      flags: computeFlags(cond, env),
    };
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best!;
}

export function rankInvestigations(
  catalogue: Investigation[],
  env: Environment,
  weights: Weights = DEFAULT_WEIGHTS,
  pillars: string[] = [],
  materialClass = 'solid'
): RankedInvestigation[] {
  return catalogue
    .filter((inv) => inv.finding_basis !== 'illustrative')
    .map((inv) => scoreInvestigation(inv, catalogue, env, weights, pillars, materialClass))
    .sort((a, b) => b.score - a.score);
}

export interface ParametricFilter {
  o2_min?: number;
  o2_max?: number;
  pressure_min?: number;
  pressure_max?: number;
  flow_min?: number;
  flow_max?: number;
  gravity_max?: number;
  phase?: string;
  fuel_contains?: string;
  pillar?: string;
}

export interface QueryRow {
  investigation: Investigation;
  condition: TestCondition;
}

export function parametricQuery(
  catalogue: Investigation[],
  filter: ParametricFilter
): { rows: QueryRow[]; interpretation: string } {
  const rows: QueryRow[] = [];
  for (const inv of catalogue) {
    for (const cond of inv.conditions) {
      if (filter.o2_min !== undefined && cond.o2_pct < filter.o2_min) continue;
      if (filter.o2_max !== undefined && cond.o2_pct > filter.o2_max) continue;
      if (filter.pressure_min !== undefined && cond.pressure_psi < filter.pressure_min) continue;
      if (filter.pressure_max !== undefined && cond.pressure_psi > filter.pressure_max) continue;
      if (filter.flow_min !== undefined && cond.flow_cm_s < filter.flow_min) continue;
      if (filter.flow_max !== undefined && cond.flow_cm_s > filter.flow_max) continue;
      if (filter.gravity_max !== undefined && Math.min(...inv.gravity_g) > filter.gravity_max)
        continue;
      if (filter.phase && !inv.phase.includes(filter.phase)) continue;
      if (
        filter.fuel_contains &&
        !inv.fuels.some((f) => f.toLowerCase().includes(filter.fuel_contains!.toLowerCase()))
      )
        continue;
      if (filter.pillar && !inv.pillars.includes(filter.pillar)) continue;
      rows.push({ investigation: inv, condition: cond });
    }
  }
  const parts: string[] = [];
  if (filter.fuel_contains) parts.push(`fuel matching '${filter.fuel_contains}'`);
  if (filter.o2_min !== undefined || filter.o2_max !== undefined)
    parts.push(`O2 ${filter.o2_min ?? 'any'}-${filter.o2_max ?? 'any'}%`);
  if (filter.flow_min !== undefined || filter.flow_max !== undefined)
    parts.push(`airflow ${filter.flow_min ?? 'any'}-${filter.flow_max ?? 'any'} cm/s`);
  if (filter.pressure_min !== undefined || filter.pressure_max !== undefined)
    parts.push(`pressure ${filter.pressure_min ?? 'any'}-${filter.pressure_max ?? 'any'} psi`);
  if (filter.phase) parts.push(`${filter.phase} fuel`);
  return {
    rows,
    interpretation: parts.length ? parts.join(', ') : 'no filters',
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'hardware' | 'facility' | 'fuel';
  label: string;
}

export function buildRelationshipGraph(catalogue: Investigation[]): {
  nodes: Investigation[];
  edges: GraphEdge[];
} {
  const edges: GraphEdge[] = [];
  for (let i = 0; i < catalogue.length; i++) {
    for (let j = i + 1; j < catalogue.length; j++) {
      const a = catalogue[i];
      const b = catalogue[j];
      if (a.hardware === b.hardware) {
        edges.push({ source: a.id, target: b.id, kind: 'hardware', label: a.hardware });
      } else if (a.facility === b.facility) {
        edges.push({ source: a.id, target: b.id, kind: 'facility', label: a.facility });
      } else {
        const sharedFuel = a.fuels.find((fa) =>
          b.fuels.some((fb) => fb.toLowerCase() === fa.toLowerCase())
        );
        if (sharedFuel) {
          edges.push({ source: a.id, target: b.id, kind: 'fuel', label: sharedFuel });
        }
      }
    }
  }
  return { nodes: catalogue, edges };
}
