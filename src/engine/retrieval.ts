import rawKnowledge from '../data/knowledge.json';
import { buildPsiRunChunks } from './psiRuns';
import { ParametricFilter } from './ranking';
import { INVESTIGATIONS } from './schema';

const TOKEN_RE = /[a-z0-9][a-z0-9\-./+]*/g;
const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'in',
  'on',
  'at',
  'to',
  'for',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'with',
  'by',
  'as',
  'that',
  'this',
  'it',
  'from',
  'how',
  'what',
  'why',
  'did',
  'do',
  'does',
  'which',
  'when',
]);

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(TOKEN_RE) ?? [];
  return matches.filter((t) => !STOP.has(t) && t.length > 1);
}

export interface Chunk {
  id: string;
  text: string;
  source: string;
  page?: number | null;
  kind?: string;
}

export interface Hit {
  chunk: Chunk;
  score: number;
  bm25_rank?: number;
  tfidf_rank?: number;
  matchedBy: string;
}

export class HybridIndex {
  chunks: Chunk[];
  private k1 = 1.5;
  private b = 0.75;
  private docs: string[][];
  private lens: number[];
  private avgLen: number;
  private tf: Map<string, number>[];
  private idf: Map<string, number>;
  private tfidfVectors: Map<string, number>[];
  private tfidfNorms: number[];

  constructor(chunks: Chunk[]) {
    this.chunks = chunks;
    this.docs = chunks.map((c) => tokenize(c.text));
    this.lens = this.docs.map((d) => d.length);
    this.avgLen = this.lens.length
      ? this.lens.reduce((a, b) => a + b, 0) / this.lens.length
      : 0;
    this.tf = this.docs.map((d) => {
      const m = new Map<string, number>();
      for (const t of d) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    });

    const df = new Map<string, number>();
    for (const d of this.docs) {
      for (const term of new Set(d)) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    const n = Math.max(this.docs.length, 1);
    this.idf = new Map<string, number>();
    for (const [term, freq] of df.entries()) {
      this.idf.set(term, Math.log(1.0 + (n - freq + 0.5) / (freq + 0.5)));
    }

    // Sublinear TF-IDF vectors (unigrams + bigrams)
    const bigramDocs = this.docs.map((d) => {
      const out = [...d];
      for (let i = 0; i < d.length - 1; i++) out.push(`${d[i]}_${d[i + 1]}`);
      return out;
    });
    const bdf = new Map<string, number>();
    for (const bd of bigramDocs) {
      for (const t of new Set(bd)) bdf.set(t, (bdf.get(t) ?? 0) + 1);
    }
    const bidf = new Map<string, number>();
    for (const [t, f] of bdf.entries()) {
      bidf.set(t, Math.log((1 + n) / (1 + f)) + 1);
    }
    this.tfidfVectors = bigramDocs.map((bd) => {
      const counts = new Map<string, number>();
      for (const t of bd) counts.set(t, (counts.get(t) ?? 0) + 1);
      const vec = new Map<string, number>();
      for (const [t, c] of counts.entries()) {
        vec.set(t, (1 + Math.log(c)) * (bidf.get(t) ?? 1));
      }
      return vec;
    });
    this.tfidfNorms = this.tfidfVectors.map((v) => {
      let s = 0;
      for (const val of v.values()) s += val * val;
      return Math.sqrt(s) || 1;
    });
  }

  private bm25Scores(query: string): number[] {
    const terms = tokenize(query);
    return this.tf.map((tf, i) => {
      let s = 0;
      const norm = this.k1 * (1 - this.b + (this.b * this.lens[i]) / (this.avgLen || 1));
      for (const term of terms) {
        const f = tf.get(term) ?? 0;
        if (!f) continue;
        s += ((this.idf.get(term) ?? 0) * (f * (this.k1 + 1))) / (f + norm);
      }
      return s;
    });
  }

  private tfidfScores(query: string): number[] {
    const tokens = tokenize(query);
    const qTerms = [...tokens];
    for (let i = 0; i < tokens.length - 1; i++) qTerms.push(`${tokens[i]}_${tokens[i + 1]}`);
    const qCounts = new Map<string, number>();
    for (const t of qTerms) qCounts.set(t, (qCounts.get(t) ?? 0) + 1);

    let qNormSq = 0;
    for (const c of qCounts.values()) {
      const w = 1 + Math.log(c);
      qNormSq += w * w;
    }
    const qNorm = Math.sqrt(qNormSq) || 1;

    return this.tfidfVectors.map((vec, i) => {
      let dot = 0;
      for (const [t, c] of qCounts.entries()) {
        const v = vec.get(t);
        if (v) dot += (1 + Math.log(c)) * v;
      }
      return dot / (this.tfidfNorms[i] * qNorm);
    });
  }

  search(query: string, k = 6): Hit[] {
    if (!this.chunks.length) return [];
    const bm25 = this.bm25Scores(query);
    const tfidf = this.tfidfScores(query);

    const bm25Order = bm25
      .map((score, idx) => ({ idx, score }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.idx);

    const tfidfOrder = tfidf
      .map((score, idx) => ({ idx, score }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.idx);

    const rrf = new Map<number, number>();
    const bm25Rank = new Map<number, number>();
    const tfidfRank = new Map<number, number>();

    bm25Order.forEach((idx, r) => {
      const rank = r + 1;
      rrf.set(idx, (rrf.get(idx) ?? 0) + 1 / (60 + rank));
      bm25Rank.set(idx, rank);
    });
    tfidfOrder.forEach((idx, r) => {
      const rank = r + 1;
      rrf.set(idx, (rrf.get(idx) ?? 0) + 1 / (60 + rank));
      tfidfRank.set(idx, rank);
    });

    if (!rrf.size) {
      return this.chunks.slice(0, k).map((chunk) => ({
        chunk,
        score: 0,
        matchedBy: 'fallback',
      }));
    }

    return Array.from(rrf.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([idx, score]) => {
        const br = bm25Rank.get(idx);
        const tr = tfidfRank.get(idx);
        const ways: string[] = [];
        if (br !== undefined) ways.push('BM25');
        if (tr !== undefined) ways.push('TF-IDF');
        return {
          chunk: this.chunks[idx],
          score: Math.round(score * 100000) / 100000,
          bm25_rank: br,
          tfidf_rank: tr,
          matchedBy: ways.join(' + ') || 'fallback',
        };
      });
  }
}

export function buildKnowledgeIndex(extraChunks: Chunk[] = []): HybridIndex {
  const kbChunks: Chunk[] = (rawKnowledge as Chunk[]).map((c) => ({ ...c }));
  const invChunks: Chunk[] = INVESTIGATIONS.map((inv) => ({
    id: `inv:${inv.id}`,
    text: `${inv.id} (${inv.name}): ${inv.short} Hardware: ${inv.hardware}. Facility: ${
      inv.facility
    }. Fuels: ${inv.fuels.join(', ')}. Conditions: ${inv.conditions
      .map((c) => `${c.label} (${c.o2_pct}% O2, ${c.pressure_psi} psi, ${c.flow_cm_s} cm/s)`)
      .join('; ')}. Finding: ${inv.finding} Partial-g note: ${inv.partial_g_note} Earth spin-off: ${
      inv.earth_spinoff
    }${inv.psi ? ` NASA PSI ${inv.psi.accession} (DOI ${inv.psi.doi}).` : ''}`,
    source: inv.psi ? `${inv.psi.accession} · ${inv.id}` : inv.id,
    kind: 'investigation',
  }));
  const psiRunChunks = buildPsiRunChunks();
  return new HybridIndex([...kbChunks, ...invChunks, ...psiRunChunks, ...extraChunks]);
}

const FUEL_WORDS: Record<string, string> = {
  acrylic: 'PMMA',
  pmma: 'PMMA',
  cotton: 'cotton',
  nomex: 'Nomex',
  kapton: 'Kapton',
  silicone: 'silicone',
  heptane: 'heptane',
  methanol: 'methanol',
  decane: 'decane',
  propane: 'propane',
  methane: 'methane',
  ethylene: 'ethylene',
  fiberglass: 'fiberglass',
  sibal: 'SIBAL',
  fabric: 'fabric',
};

const PHASE_WORDS: Record<string, string> = {
  solid: 'solid',
  rod: 'solid',
  fabric: 'solid',
  droplet: 'liquid',
  liquid: 'liquid',
  gaseous: 'gas',
  gas: 'gas',
};

const PILLAR_WORDS: Record<string, string> = {
  prevention: 'prevention',
  flammability: 'prevention',
  material: 'prevention',
  detection: 'detection',
  smoke: 'detection',
  dust: 'detection',
  detector: 'detection',
  suppression: 'suppression',
  extinguish: 'suppression',
  suppress: 'suppression',
};

export function parseQuery(query: string): {
  filters: ParametricFilter;
  matched: string[];
  description: string;
} {
  const filters: ParametricFilter = {};
  const matched: string[] = [];
  const low = query.toLowerCase();

  const flowM = query.match(/(\d+(?:\.\d+)?)\s*(?:cm\s*\/\s*s|cm\/s|cms)/i);
  if (flowM) {
    const v = parseFloat(flowM[1]);
    filters.flow_min = Math.max(0, v - 2);
    filters.flow_max = v + 2;
    matched.push(`${v} cm/s`);
  }

  const pressM = query.match(/(\d+(?:\.\d+)?)\s*psi/i);
  if (pressM) {
    const v = parseFloat(pressM[1]);
    filters.pressure_min = Math.max(0, v - 1.5);
    filters.pressure_max = v + 1.5;
    matched.push(`${v} psi`);
  }

  const o2M = query.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:o2|oxygen)?/i);
  if (o2M) {
    const v = parseFloat(o2M[1]);
    filters.o2_min = v - 1;
    filters.o2_max = v + 1;
    matched.push(`${v}% O2`);
  }

  const gravM = query.match(/(\d*\.?\d+)\s*g\b/i);
  if (gravM) {
    const v = parseFloat(gravM[1]);
    if (v <= 1.0) {
      filters.gravity_max = v + 0.02;
      matched.push(`${v} g`);
    }
  }

  for (const [word, fuel] of Object.entries(FUEL_WORDS)) {
    if (low.includes(word)) {
      filters.fuel_contains = fuel;
      matched.push(fuel);
      break;
    }
  }

  for (const [word, phase] of Object.entries(PHASE_WORDS)) {
    if (low.includes(word)) {
      filters.phase = phase;
      matched.push(phase);
      break;
    }
  }

  for (const [word, pillar] of Object.entries(PILLAR_WORDS)) {
    if (low.includes(word)) {
      filters.pillar = pillar;
      matched.push(pillar);
      break;
    }
  }

  const entries = Object.entries(filters);
  return {
    filters,
    matched,
    description: entries.length
      ? entries.map(([k, v]) => `${k}=${v}`).join(', ')
      : 'no parametric constraints recognised',
  };
}
