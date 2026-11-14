import rawCatalogue from '../data/investigations.json';
import rawPsiRegistry from '../data/psi_registry.json';

export type Basis = 'brief' | 'published' | 'nominal' | 'illustrative';

export const BASIS_LABEL: Record<Basis, string> = {
  brief: 'From NASA brief',
  published: 'Published summary',
  nominal: 'Representative design condition',
  illustrative: 'UI placeholder (not ranked)',
};

export interface SourceRef {
  label: string;
  page?: number;
}

export interface TestCondition {
  label: string;
  o2_pct: number;
  pressure_psi: number;
  flow_cm_s: number;
  basis: Basis;
  gravity_g?: number;
  atmosphere_category?: string;
  notes?: string;
}

export interface PsiRecord {
  accession: string;
  acronym: string;
  title: string;
  doi: string;
  research_area: string;
  sub_research_area: string;
  start_date: string;
  end_date: string;
  file_count: number;
  experimental_table_count: number;
  archive_status: string;
  objective: string;
  research_impacts: string;
  psi_url: string;
  doi_url: string | null;
}

export interface Investigation {
  id: string;
  name: string;
  short: string;
  pillars: string[];
  facility: string;
  hardware: string;
  phase: string[];
  fuels: string[];
  gravity_g: number[];
  conditions: TestCondition[];
  measurements: string[];
  finding: string;
  finding_basis: Basis;
  partial_g_note: string;
  earth_spinoff: string;
  sources: SourceRef[];
  psi?: PsiRecord;
}

export interface UpcomingInvestigation {
  id: string;
  name: string;
  status: string;
  note: string;
  target_gravity_g: number;
  sources: SourceRef[];
}

export interface PsiRegistrySummary {
  snapshot_date: string;
  source_url: string;
  total_psi_investigations: number;
  combustion_investigations: number;
  total_files: number;
  experimental_table_count: number;
  registered_total_gb: number;
  investigations: PsiRecord[];
}

const PSI_LINK_MAP: Record<string, string> = {
  BASS: 'PSI-26',
  'BASS-II': 'PSI-25',
  SPICE: 'PSI-107',
  SLICE: 'PSI-106',
  'SAFFIRE-I': 'PSI-98',
  'SAFFIRE-II': 'PSI-99',
  'SAFFIRE-III': 'PSI-100',
  SAME: 'PSI-102',
  'SAME-R': 'PSI-101',
  DAFT: 'PSI-47',
  'DAFT-2': 'PSI-47',
  FLEX: 'PSI-69',
  'FLEX-2': 'PSI-68',
  CFI: 'PSI-39',
  'ACME-CFI-G': 'PSI-159',
  'ACME-BRE': 'PSI-20',
  'ACME-E-FIELD': 'PSI-22',
  'ACME-PROGRAM': 'PSI-10',
  'ACME-CLD': 'PSI-21',
  'ACME-S-FLAME': 'PSI-23',
  'PSI-60-SPICE': 'PSI-60',
  'PSI-62-FGM': 'PSI-62',
  'PSI-115-SAME': 'PSI-115',
  'PSI-117-FLEX': 'PSI-117',
  'PSI-142-COOL': 'PSI-142',
};

export const PSI_REGISTRY: PsiRegistrySummary = rawPsiRegistry as PsiRegistrySummary;

const psiByAccession = new Map<string, PsiRecord>(
  PSI_REGISTRY.investigations.map((p) => [p.accession, p])
);

export const INVESTIGATIONS: Investigation[] = (rawCatalogue.investigations as Investigation[]).map(
  (inv) => {
    const acc = PSI_LINK_MAP[inv.id];
    const psi = acc ? psiByAccession.get(acc) : undefined;
    return { ...inv, psi };
  }
);

export const UPCOMING: UpcomingInvestigation[] =
  rawCatalogue.upcoming as UpcomingInvestigation[];

export function getRange(nums: number[]): [number, number] {
  if (!nums.length) return [0, 0];
  return [Math.min(...nums), Math.max(...nums)];
}
