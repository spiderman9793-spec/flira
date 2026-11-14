import { describe, expect, it } from 'vitest';
import { askCopilot } from '../copilot';
import {
  PRESETS,
  flammabilityMargin,
  gravityBand,
  morphology,
  partialGravityVerdict,
  prebreatheMinutes,
  spreadRateMmS,
} from '../physics';
import { PSI_RUNS, findVerbatimRunMatches } from '../psiRuns';
import { buildRelationshipGraph, parametricQuery, rankInvestigations } from '../ranking';
import { buildKnowledgeIndex, parseQuery } from '../retrieval';
import { INVESTIGATIONS, PSI_REGISTRY } from '../schema';

describe('physics engine', () => {
  it('refuses to fabricate mm/s spread rate without an empirical anchor', () => {
    const lunar = PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)'];
    expect(spreadRateMmS(lunar, null, null)).toBeNull();
  });

  it('scales spread rate cleanly when an anchor is provided', () => {
    const iss = PRESETS['ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)'];
    const lunar = PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)'];
    const scaled = spreadRateMmS(lunar, 2.5, iss);
    expect(scaled).not.toBeNull();
    expect(scaled!).toBeGreaterThan(0);
  });

  it('produces ordered 10-90% Monte Carlo bands and flags partial-g empirical gap', () => {
    const lunar = PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)'];
    const band = gravityBand(lunar);
    expect(band.length).toBe(51);
    for (const pt of band) {
      expect(pt.p10).toBeLessThanOrEqual(pt.median);
      expect(pt.median).toBeLessThanOrEqual(pt.p90);
    }

    const verdict = partialGravityVerdict(lunar);
    expect(verdict.has_empirical_data).toBe(false);
    expect(verdict.statement).toContain('LUCI and FM2');

    const issVerdict = partialGravityVerdict(
      PRESETS['ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)']
    );
    expect(issVerdict.has_empirical_data).toBe(true);
  });

  it('computes realistic LOI margins, morphology, and prebreathe estimates', () => {
    const lunar = PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)'];
    const pmma = flammabilityMargin('PMMA (acrylic)', lunar);
    expect(pmma.margin_pct).toBeGreaterThan(6);
    expect(pmma.severity).toBe('danger');

    const earth = PRESETS['Earth Baseline (1g, 14.7 psi, 21% O2)'];
    expect(prebreatheMinutes(earth).minutes).toBeGreaterThan(80);
    expect(morphology(earth).regime).toContain('teardrop');
  });
});

describe('ranking, graph & PSI registry', () => {
  it('links curated investigations to all 24 official PSI combustion records', () => {
    expect(INVESTIGATIONS.length).toBe(26);
    expect(PSI_REGISTRY.combustion_investigations).toBe(24);
    const linkedAccessions = new Set(
      INVESTIGATIONS.map((i) => i.psi?.accession).filter((a): a is string => Boolean(a))
    );
    for (const rec of PSI_REGISTRY.investigations) {
      expect(linkedAccessions.has(rec.accession)).toBe(true);
    }
    const saffire = INVESTIGATIONS.find((i) => i.id === 'SAFFIRE-I');
    expect(saffire?.psi?.accession).toBe('PSI-98');
    expect(saffire?.psi?.doi).toBe('10.60555/0t15-1z43');
  });

  it('ranks investigations with 7 decomposed components and builds hardware graph', () => {
    const lunar = PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)'];
    const ranked = rankInvestigations(INVESTIGATIONS, lunar);
    expect(ranked.length).toBe(26);
    expect(ranked[0].components.length).toBe(7);
    expect(ranked[0].score).toBeGreaterThan(ranked[ranked.length - 1].score);

    const graph = buildRelationshipGraph(INVESTIGATIONS);
    expect(graph.edges.some((e) => e.kind === 'hardware')).toBe(true);

    const q = parametricQuery(INVESTIGATIONS, { fuel_contains: 'PMMA', flow_max: 20 });
    expect(q.rows.length).toBeGreaterThan(0);
  });
});

describe('hybrid retrieval & source-firewall copilot', () => {
  it('parses numeric constraints and produces verified local answers with audit trail', async () => {
    const index = buildKnowledgeIndex();
    const parsed = parseQuery('Show solid tests with acrylic at 20 cm/s and 30% O2');
    expect(parsed.filters.fuel_contains).toBe('PMMA');
    expect(parsed.filters.flow_max).toBe(22);
    expect(parsed.filters.o2_min).toBe(29);

    const ans = await askCopilot(
      'Is there any partial-gravity combustion data in PSI for lunar 0.16g?',
      index,
      PRESETS['Lunar Base / Rover (0.16g, 10.2 psi, 30% O2)']
    );
    expect(ans.mode).toBe('local');
    expect(ans.unresolved.length).toBe(0);
    expect(ans.citations.length).toBeGreaterThan(0);
    expect(ans.unknownNotice).toContain('LUCI and FM2');
    expect(ans.auditTrail.length).toBeGreaterThanOrEqual(4);
  });

  it('loads all 22 NASA PSI experimental tables and preserves verbatim SAFFIRE-I oxygen values', async () => {
    expect(PSI_RUNS.table_count).toBe(22);
    expect(PSI_RUNS.total_run_rows).toBeGreaterThan(2000);

    const matches = findVerbatimRunMatches('oxygen SAFFIRE-I', ['PSI-98'], 3);
    expect(matches.some((m) => m.accession === 'PSI-98' && m.summary.includes('21.5 - 21.7'))).toBe(
      true
    );

    const index = buildKnowledgeIndex([
      {
        id: 'custom:test_note_1',
        text: 'Custom uploaded thermal test note for Kapton wire insulation.',
        source: 'note.txt',
        page: 1,
        kind: 'uploaded',
      },
    ]);
    const ans = await askCopilot(
      'What does NASA actually observe about oxygen and SAFFIRE-I?',
      index,
      PRESETS['ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)'],
      { history: [{ question: 'Earlier turn', matchedIds: ['SAFFIRE-I'] }] }
    );
    expect(
      ans.evidenceLines.some(
        (l) => l.tag === 'NASA REPORTED' && l.value.includes('21.5 - 21.7')
      )
    ).toBe(true);
    expect(ans.auditTrail.some((s) => s.step === 'Conversational memory context')).toBe(true);
  });

  it('runs Graph RAG subgraph traversal over PSI-117 and cool flame dynamics', async () => {
    const { queryGraphRag } = await import('../graphRag');
    const res = queryGraphRag('What are the cool flame dynamics in PSI-117?');
    expect(res.matchedEntityIds.includes('PSI-117')).toBe(true);
    expect(res.subgraph.nodes.some((n) => n.id === 'phenom:cool_flames')).toBe(true);
    expect(res.subgraph.paths.length).toBeGreaterThan(0);
  });
});
