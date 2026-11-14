import rawPsiRuns from '../data/psi_runs.json';
import { Chunk } from './retrieval';

export interface PsiRunTable {
  accession: string;
  file_name: string;
  row_count: number;
  columns: string[];
  rows: Record<string, string>[];
}

export interface PsiRunsDataset {
  source: string;
  table_count: number;
  total_run_rows: number;
  tables: PsiRunTable[];
}

export const PSI_RUNS: PsiRunsDataset = rawPsiRuns as PsiRunsDataset;

export function getTablesForAccession(accession: string): PsiRunTable[] {
  return PSI_RUNS.tables.filter((t) => t.accession === accession);
}

function summarizeRow(table: PsiRunTable, row: Record<string, string>): string {
  const nonEmpty = table.columns
    .filter((c) => row[c] !== undefined && row[c] !== '')
    .slice(0, 9)
    .map((c) => `${c}: ${row[c]}`);
  return nonEmpty.join(' | ');
}

/**
 * Build retrieval chunks from the 22 official NASA PSI experimentalTable CSVs.
 * Small tables (<= 35 rows) index every valid row verbatim; larger tables index
 * column schemas + representative run rows so retrieval stays fast and exact.
 */
export function buildPsiRunChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  for (const table of PSI_RUNS.tables) {
    chunks.push({
      id: `psi:${table.accession}:schema`,
      text: `${table.accession} official experimentalTable (${table.file_name}, ${table.row_count} rows). Columns: ${table.columns.join(', ')}.`,
      source: `${table.accession} · ${table.file_name}`,
      kind: 'psi-table',
    });

    const step = table.rows.length <= 35 ? 1 : Math.max(1, Math.floor(table.rows.length / 18));
    for (let i = 0; i < table.rows.length; i += step) {
      const row = table.rows[i];
      const summary = summarizeRow(table, row);
      if (!summary) continue;
      chunks.push({
        id: `psi:${table.accession}:r${i + 1}`,
        text: `${table.accession} row ${i + 1} (${table.file_name}): ${summary}`,
        source: `${table.accession} · row ${i + 1}`,
        kind: 'psi-row',
      });
    }
  }
  return chunks;
}

export interface VerbatimRunMatch {
  accession: string;
  fileName: string;
  rowIndex: number;
  summary: string;
  o2Value?: string;
}

const O2_COL_RE = /o2|oxygen|xo2/i;

export function findVerbatimRunMatches(
  query: string,
  preferredAccessions: string[] = [],
  limit = 4
): VerbatimRunMatch[] {
  const lowQ = query.toLowerCase();
  const tokens = lowQ
    .split(/[^a-z0-9.\-]+/)
    .filter((t) => t.length >= 2);
  if (lowQ.includes('oxygen') && !tokens.includes('o2')) tokens.push('o2');
  if (lowQ.includes('saffire-i') && !tokens.includes('saffire-1')) tokens.push('saffire-1');
  if (lowQ.includes('saffire-ii') && !tokens.includes('saffire-2')) tokens.push('saffire-2');
  if (lowQ.includes('saffire-iii') && !tokens.includes('saffire-3')) tokens.push('saffire-3');

  const scored: { score: number; match: VerbatimRunMatch }[] = [];

  for (const table of PSI_RUNS.tables) {
    const accIdx = preferredAccessions.indexOf(table.accession);
    const accBoost = accIdx === 0 ? 10 : accIdx > 0 ? 5 : 0;
    const o2Col = table.columns.find((c) => O2_COL_RE.test(c));

    table.rows.forEach((row, idx) => {
      const summary = summarizeRow(table, row);
      const low = `${table.accession} ${table.file_name} ${summary}`.toLowerCase();
      let hits = 0;
      for (const tok of tokens) {
        if (low.includes(tok)) hits++;
      }
      const o2Val = o2Col ? row[o2Col] : undefined;
      const o2Bonus =
        o2Val && o2Val !== '-' && (lowQ.includes('oxygen') || lowQ.includes('o2')) ? 3 : 0;
      const score = hits * 2 + accBoost + o2Bonus;
      if (score >= 4) {
        scored.push({
          score,
          match: {
            accession: table.accession,
            fileName: table.file_name,
            rowIndex: idx + 1,
            summary,
            o2Value: o2Val && o2Val !== '-' ? o2Val : undefined,
          },
        });
      }
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.match);
}
