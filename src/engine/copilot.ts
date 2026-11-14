import { Environment, summarise } from './physics';
import { findVerbatimRunMatches } from './psiRuns';
import { parametricQuery, rankInvestigations } from './ranking';
import { Hit, HybridIndex, parseQuery } from './retrieval';
import { INVESTIGATIONS, Investigation } from './schema';
import { queryGraphRag } from './graphRag';

const MARKER_RE = /\[(kb:[A-Za-z0-9\-._:]+|inv:[A-Za-z0-9\-._]+|psi:PSI-\d+:[A-Za-z0-9\-._]+|graph:[A-Za-z0-9\-._]+|custom:[A-Za-z0-9\-._]+)\]/g;

export interface AuditStep {
  step: string;
  detail: string;
}

export interface EvidenceLine {
  label: string;
  value: string;
  tag: 'NASA REPORTED' | 'MODEL BOUND' | 'UNKNOWN';
  citation?: string;
}

export interface CopilotAnswer {
  text: string;
  citations: string[];
  unresolved: string[];
  mode: 'openrouter' | 'gemini' | 'local';
  badge: string;
  grounded: number;
  notes: string[];
  hits: Hit[];
  matchedInvestigations: Investigation[];
  evidenceLines: EvidenceLine[];
  auditTrail: AuditStep[];
  unknownNotice?: string;
}

export function extractCitations(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(MARKER_RE)) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function validateCitations(
  text: string,
  validMarkers: Set<string>
): { valid: string[]; unresolved: string[]; ratio: number } {
  const found = extractCitations(text);
  const valid = found.filter((m) => validMarkers.has(m));
  const unresolved = found.filter((m) => !validMarkers.has(m));
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!sentences.length) return { valid, unresolved, ratio: 0 };
  const citedSentences = sentences.filter((s) => new RegExp(MARKER_RE.source).test(s)).length;
  return {
    valid,
    unresolved,
    ratio: citedSentences / sentences.length,
  };
}

function trimSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (/^[a-z]/.test(cleaned)) {
    const m = cleaned.match(/[.!?]\s+([A-Z])/);
    if (m && m.index !== undefined) {
      return cleaned.slice(m.index + 2);
    }
  }
  return cleaned;
}

export interface ConversationTurnRef {
  question: string;
  matchedIds: string[];
}

export async function askCopilot(
  question: string,
  index: HybridIndex,
  env: Environment,
  options: {
    cloudEnabled?: boolean;
    provider?: 'openrouter' | 'gemini';
    apiKey?: string;
    openrouterKey?: string;
    history?: ConversationTurnRef[];
  } = {}
): Promise<CopilotAnswer> {
  const q = question.trim();
  const history = options.history ?? [];
  const priorIds = Array.from(new Set(history.flatMap((h) => h.matchedIds)));
  const isFollowup =
    history.length > 0 &&
    !INVESTIGATIONS.some((inv) => q.toLowerCase().includes(inv.id.toLowerCase())) &&
    !/psi-\d+/i.test(q);
  const retrievalQuery = isFollowup && priorIds.length ? `${q} ${priorIds.slice(0, 3).join(' ')}` : q;

  const auditTrail: AuditStep[] = [
    {
      step: 'NASA-only corpus selected',
      detail: `${index.chunks.length} indexed chunks (${INVESTIGATIONS.length} curated studies + 22 PSI experimentalTable CSVs)`,
    },
  ];
  if (history.length > 0) {
    auditTrail.push({
      step: 'Conversational memory context',
      detail: `${history.length} remembered turn(s)${
        isFollowup && priorIds.length ? ` — carried focus: ${priorIds.slice(0, 3).join(', ')}` : ''
      }`,
    });
  }

  const parsed = parseQuery(retrievalQuery);
  const hasFilters = Object.keys(parsed.filters).length > 0;
  auditTrail.push({
    step: 'Structured constraint parser',
    detail: hasFilters ? `Extracted filters: ${parsed.description}` : 'No numeric/fuel constraints parsed; using full corpus',
  });

  const hits = index.search(retrievalQuery, 6);
  auditTrail.push({
    step: 'Hybrid BM25 + TF-IDF (RRF) retrieval',
    detail: `Top ${hits.length} chunks retrieved (${hits
      .slice(0, 3)
      .map((h) => `[${h.chunk.id}] via ${h.matchedBy}`)
      .join(', ')})`,
  });

  // Graph RAG Knowledge Graph Subgraph Traversal (Graphify + LangChain pattern)
  const graphResult = queryGraphRag(retrievalQuery);
  if (graphResult.matchedEntityIds.length > 0) {
    auditTrail.push({
      step: 'Graph RAG Subgraph Traversal (Graphify)',
      detail: `Extracted ${graphResult.subgraph.nodes.length} nodes & ${graphResult.subgraph.edges.length} edges around [${graphResult.matchedEntityIds.join(', ')}]`,
    });
  }

  const validMarkers = new Set<string>(hits.map((h) => h.chunk.id));
  INVESTIGATIONS.forEach((inv) => validMarkers.add(`inv:${inv.id}`));
  for (const n of graphResult.subgraph.nodes) {
    validMarkers.add(`graph:${n.id}`);
    if (n.id.startsWith('incident:')) validMarkers.add(`kb:incident:${n.id.replace('incident:', '')}`);
    if (n.id.startsWith('spinoff:')) validMarkers.add(`kb:spinoff:${n.id.replace('spinoff:', '')}`);
    if (n.id.startsWith('PSI-117')) {
      validMarkers.add('kb:psi117:overview');
      validMarkers.add('kb:psi117:dynamics');
      validMarkers.add('kb:psi117:safety');
    }
  }

  const qResult = hasFilters ? parametricQuery(INVESTIGATIONS, parsed.filters) : null;
  const ranked = rankInvestigations(INVESTIGATIONS, env).slice(0, 4);
  const phys = summarise(env);

  // Collect matched investigations: explicit query mentions first, then filters & hits
  const matchedMap = new Map<string, Investigation>();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const inv of INVESTIGATIONS) {
    const idRe = new RegExp(`(^|[^a-z0-9-])${escapeRe(inv.id.toLowerCase())}([^a-z0-9-]|$)`, 'i');
    const psiRe = inv.psi
      ? new RegExp(`(^|[^a-z0-9-])${escapeRe(inv.psi.accession.toLowerCase())}([^a-z0-9-]|$)`, 'i')
      : null;
    if (idRe.test(retrievalQuery) || (psiRe && psiRe.test(retrievalQuery))) {
      matchedMap.set(inv.id, inv);
    }
  }
  if (qResult) {
    for (const r of qResult.rows) matchedMap.set(r.investigation.id, r.investigation);
  }
  for (const h of hits) {
    if (h.chunk.id.startsWith('inv:')) {
      const id = h.chunk.id.slice(4);
      const inv = INVESTIGATIONS.find((x) => x.id === id);
      if (inv) matchedMap.set(inv.id, inv);
    }
    if (h.chunk.id.startsWith('psi:')) {
      const acc = h.chunk.id.split(':')[1];
      const inv = INVESTIGATIONS.find((x) => x.psi?.accession === acc);
      if (inv) matchedMap.set(inv.id, inv);
    }
    for (const inv of INVESTIGATIONS) {
      const idRe = new RegExp(`(^|[^a-z0-9-])${escapeRe(inv.id.toLowerCase())}([^a-z0-9-]|$)`, 'i');
      if (idRe.test(h.chunk.text)) {
        matchedMap.set(inv.id, inv);
      }
    }
  }
  if (!matchedMap.size && ranked.length) {
    matchedMap.set(ranked[0].investigation.id, ranked[0].investigation);
  }
  const matchedInvestigations = Array.from(matchedMap.values()).slice(0, 4);
  const preferredAccessions = matchedInvestigations
    .map((m) => m.psi?.accession)
    .filter((a): a is string => Boolean(a));

  const verbatimRuns = findVerbatimRunMatches(retrievalQuery, preferredAccessions, 3);
  for (const vr of verbatimRuns) {
    validMarkers.add(`psi:${vr.accession}:r${vr.rowIndex}`);
  }

  // Build verbatim reported evidence lines (prioritizing real NASA PSI experimentalTable rows!)
  const evidenceLines: EvidenceLine[] = [];
  for (const vr of verbatimRuns) {
    evidenceLines.push({
      label: `${vr.accession} · Row ${vr.rowIndex}`,
      value: vr.summary,
      tag: 'NASA REPORTED',
      citation: `psi:${vr.accession}:r${vr.rowIndex}`,
    });
  }
  for (const inv of matchedInvestigations.slice(0, 2)) {
    const o2Vals = inv.conditions.map((c) => c.o2_pct);
    const pVals = inv.conditions.map((c) => c.pressure_psi);
    const fVals = inv.conditions.map((c) => c.flow_cm_s);
    const fmtRange = (arr: number[], unit: string) => {
      const lo = Math.min(...arr);
      const hi = Math.max(...arr);
      return lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`;
    };
    evidenceLines.push({
      label: `${inv.psi?.accession ?? inv.id} (${inv.id} design envelope)`,
      value: `O2 ${fmtRange(o2Vals, '%')} · Pressure ${fmtRange(pVals, ' psi')} · Flow ${fmtRange(
        fVals,
        ' cm/s'
      )}`,
      tag: 'NASA REPORTED',
      citation: `inv:${inv.id}`,
    });
  }

  let unknownNotice: string | undefined;
  const lowQ = q.toLowerCase();
  if (
    lowQ.includes('partial') ||
    lowQ.includes('0.16') ||
    lowQ.includes('0.38') ||
    lowQ.includes('lunar') ||
    lowQ.includes('mars')
  ) {
    unknownNotice =
      'No empirical partial-gravity combustion data exists in NASA PSI (LUCI and FM2 have not flown). Intermediate gravity (0 < g < 1) can only be bounded between 0 g and 1 g.';
    evidenceLines.push({
      label: 'Partial-g empirical data',
      value: 'Not established by loaded PSI corpus (0 g & 1 g only)',
      tag: 'UNKNOWN',
    });
  } else if (lowQ.includes('rate') || lowQ.includes('mm/s') || lowQ.includes('spread speed')) {
    unknownNotice =
      'Per-run absolute flame-spread rates in mm/s require raw PSI experimentalTable anchors and are not fabricated from nominal design conditions.';
    evidenceLines.push({
      label: 'Absolute spread rate (mm/s)',
      value: 'Not in nominal summary seed — requires raw PSI run anchor',
      tag: 'UNKNOWN',
    });
  }

  // Optional Cloud AI synthesis (OpenRouter Free or Gemini) with strict citation firewall
  const provider = options.provider ?? (options.openrouterKey?.trim() ? 'openrouter' : 'gemini');
  const activeKey =
    provider === 'openrouter' ? options.openrouterKey?.trim() : options.apiKey?.trim();

  if (options.cloudEnabled && activeKey) {
    const contextLines: string[] = [
      `ACTIVE ENVIRONMENT: gravity=${env.gravity_g.toFixed(2)}g, pressure=${env.pressure_psi.toFixed(
        1
      )}psi, O2=${env.o2_pct.toFixed(0)}%, airflow=${env.flow_cm_s.toFixed(
        0
      )}cm/s, flammability_index=${phys.index}, uncertainty_band=${phys.band_p10}-${phys.band_p90}.`,
      'RETRIEVED CHUNKS:',
      ...hits.map((h) => `[${h.chunk.id}] (${h.chunk.source}): ${h.chunk.text}`),
      ...(verbatimRuns.length
        ? [
            'VERBATIM NASA PSI EXPERIMENTAL ROWS:',
            ...verbatimRuns.map((vr) => `[psi:${vr.accession}:r${vr.rowIndex}] ${vr.summary}`),
          ]
        : []),
      ...(graphResult.contextText ? [graphResult.contextText] : []),
      'TOP RANKED INVESTIGATIONS:',
      ...ranked.map(
        (r) =>
          `[inv:${r.investigation.id}] ${r.investigation.name} (score ${r.score}/100, hardware=${r.investigation.hardware}): ${r.investigation.finding}`
      ),
    ];

    const systemPrompt = `You are FLIRA, the NASA PSI Fire Safety Analyst.
Hard rules:
1. Use ONLY the CONTEXT below. No outside knowledge or invented numbers.
2. Cite EVERY factual sentence with [kb:...], [inv:ID], [psi:PSI-XX:rN], or [graph:NODE] copied verbatim from CONTEXT.
3. Preserve NASA reported values/ranges verbatim. Never invent mm/s spread rates.
4. PSI has NO empirical partial-gravity data (LUCI and FM2 have not flown). State that explicitly if asked about Moon/Mars/partial gravity.
5. Keep response concise (4-6 sentences).`;

    try {
      let candidateText: string | undefined;
      let usedModel = '';

      if (provider === 'openrouter') {
        const orModels = [
          'openrouter/free',
          'google/gemma-4-31b-it:free',
          'nvidia/nemotron-3.5-super-vl:free',
        ];
        const referer =
          typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'http://localhost:5173';
        for (const modelName of orModels) {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeKey}`,
              'HTTP-Referer': referer,
              'X-Title': 'FLIRA - Flame in Freefall',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelName,
              temperature: 0.1,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `CONTEXT:\n${contextLines.join('\n')}\n\nQUESTION: ${q}` },
              ],
            }),
          });
          if (!resp.ok) continue;
          const data = await resp.json();
          const textOut = data?.choices?.[0]?.message?.content?.trim();
          if (textOut) {
            candidateText = textOut;
            usedModel = data?.model || modelName;
            break;
          }
        }
      } else {
        const modelsToTry = [
          'gemini-3-flash-preview',
          'gemini-flash-latest',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
        ];
        for (const modelName of modelsToTry) {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
              activeKey
            )}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `CONTEXT:\n${contextLines.join('\n')}\n\nQUESTION: ${q}` }],
                  },
                ],
                generationConfig: { temperature: 0.1 },
              }),
            }
          );
          if (!resp.ok) continue;
          const data = await resp.json();
          const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (textOut) {
            candidateText = textOut;
            usedModel = modelName;
            break;
          }
        }
      }

      if (candidateText) {
        const check = validateCitations(candidateText, validMarkers);
        if (check.unresolved.length === 0 && check.valid.length > 0 && check.ratio >= 0.75) {
          auditTrail.push({
            step: `Cloud AI citation firewall passed (${provider}: ${usedModel})`,
            detail: `${check.valid.length} verified citations (${Math.round(
              check.ratio * 100
            )}% sentence coverage), 0 unresolved`,
          });
          return {
            text: candidateText,
            citations: check.valid,
            unresolved: [],
            mode: provider,
            badge: `Cloud AI (${usedModel}) · Citation-Verified`,
            grounded: check.ratio,
            notes: [
              hasFilters
                ? `Structured filter applied (${parsed.description}): ${qResult?.rows.length ?? 0} matching condition(s).`
                : 'Hybrid BM25 + TF-IDF retrieval over PSI & brief corpus.',
            ],
            hits,
            matchedInvestigations,
            evidenceLines,
            auditTrail,
            unknownNotice,
          };
        }
        auditTrail.push({
          step: 'Cloud AI rejected by citation firewall',
          detail: `Unresolved citations (${check.unresolved.length}) or insufficient coverage (${Math.round(
            check.ratio * 100
          )}%) — reverted to deterministic local evidence.`,
        });
      }
    } catch {
      auditTrail.push({
        step: 'Cloud AI unreachable',
        detail: 'Fell back cleanly to deterministic local NASA corpus.',
      });
    }
  } else {
    auditTrail.push({
      step: 'External-knowledge fallback disabled',
      detail: 'Local NASA source firewall active — quoting verified records verbatim',
    });
  }

  // Deterministic extractive local response
  const sentences: string[] = [];
  if (qResult) {
    if (qResult.rows.length) {
      const sampleIds = Array.from(new Set(qResult.rows.map((r) => r.investigation.id)));
      sentences.push(
        `Structured condition filter (${parsed.description}) matched ${qResult.rows.length} test condition(s) across ${sampleIds
          .map((id) => `${id} [inv:${id}]`)
          .join(', ')}.`
      );
    } else {
      sentences.push(
        `Structured condition filter (${parsed.description}) matched 0 conditions in the loaded PSI seed catalogue.`
      );
    }
  }

  for (const h of hits.slice(0, 3)) {
    const snippet = trimSentence(h.chunk.text);
    const clipped = snippet.length > 260 ? `${snippet.slice(0, 257).trimEnd()}...` : snippet;
    sentences.push(`${clipped} [${h.chunk.id}]`);
  }

  if (unknownNotice) {
    sentences.push(`${unknownNotice} [inv:${matchedInvestigations[0]?.id ?? 'ACME-E-FIELD'}]`);
  }

  const finalText = sentences.join('\n\n');
  const check = validateCitations(finalText, validMarkers);
  auditTrail.push({
    step: 'Reported values preserved verbatim',
    detail: `${check.valid.length} resolvable citation markers attached`,
  });

  return {
    text: finalText,
    citations: check.valid,
    unresolved: check.unresolved,
    mode: 'local',
    badge: 'Local Source Firewall · Verbatim NASA Evidence',
    grounded: check.ratio,
    notes: [
      `Active habitat model index: ${phys.index.toFixed(2)}× (10–90% band ${phys.band_p10.toFixed(
        2
      )}–${phys.band_p90.toFixed(2)} at ${env.gravity_g.toFixed(2)} g, ${env.o2_pct.toFixed(
        0
      )}% O2, ${env.pressure_psi.toFixed(1)} psi).`,
    ],
    hits,
    matchedInvestigations,
    evidenceLines,
    auditTrail,
    unknownNotice,
  };
}
