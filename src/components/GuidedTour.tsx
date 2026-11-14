import { ArrowLeft, ArrowRight, X } from 'lucide-react';

export type ViewId =
  | 'home'
  | 'rank'
  | 'lab'
  | 'universe'
  | 'compare'
  | 'controls'
  | 'copilot'
  | 'sources';

export interface TourStep {
  title: string;
  body: string;
  sourceNote: string;
  targetView: ViewId;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'The problem',
    body: 'On Earth, buoyant convection shapes a flame like a teardrop. In microgravity, where convective flows are absent, NASA shows flames become spherical and dim blue—yet a sudden burst of airflow can make them flare.',
    sourceNote: 'Source: NASA BASS / BASS-II & ACME (PSI-25, PSI-26, PSI-10)',
    targetView: 'home',
  },
  {
    title: 'What the dataset contains',
    body: 'This workspace indexes 25 investigations (49 provenance-tagged conditions) covering all 24 official NASA PSI Combustion Science records, DOIs, and 2,009 per-run experimental rows.',
    sourceNote: 'Every numeric condition carries a basis tag: brief, published, or nominal.',
    targetView: 'universe',
  },
  {
    title: 'What has been measured — and what has not',
    body: 'An empty region in the parameter plot is missing evidence, not proof that fire cannot burn there. NASA PSI contains 0 g and 1 g results, leaving lunar (0.16 g) and Martian (0.38 g) gravity unmeasured.',
    sourceNote: 'LUCI and FM2 are planned lunar payloads that have not yet flown.',
    targetView: 'universe',
  },
  {
    title: 'Habitat-weighted ranking',
    body: 'Instead of an unverified single score, the AI Fire-Safety Dashboard decomposes relevance across 7 physical axes (gravity, oxygen, pressure, flow, phase, pillar, hardware comparability) with written reasons.',
    sourceNote: 'Flags warn when test O2 is below the target habitat (upward extrapolation needed).',
    targetView: 'rank',
  },
  {
    title: 'Partial-gravity Monte Carlo bounds',
    body: 'In the Virtual Lab, 400 Monte Carlo draws produce a 10th–90th percentile uncertainty bracket between 0 g and 1 g, plus material LOI margins and EVA pre-breathe estimates—without fabricating mm/s spread rates.',
    sourceNote: 'Animated flame preview is educational only; physics bounds are deterministic.',
    targetView: 'lab',
  },
  {
    title: 'Hardware is the hidden confounder',
    body: 'Experiments sharing the same rack (CIR+ACME, CIR+MDCA, MSG+SPICE) are directly comparable. The Cross-Compare & Relationship Graph surfaces shared hardware and flags cross-rig mismatches.',
    sourceNote: 'Includes Earth fire-safety spin-offs required by the Space Apps add-on.',
    targetView: 'compare',
  },
  {
    title: 'NASA Source-Firewall Co-Pilot',
    body: 'Hybrid BM25 + TF-IDF retrieval fused with Reciprocal Rank Fusion quotes verified NASA records verbatim, attaches [inv:ID] and [kb:pN:i] citations, flags UNKNOWN gaps, and exposes a full Audit Trail.',
    sourceNote: 'Optional Cloud AI (Gemini) passes through the exact same citation firewall.',
    targetView: 'copilot',
  },
];

interface GuidedTourProps {
  step: number;
  onStepChange: (next: number) => void;
  onNavigate: (view: ViewId) => void;
  onClose: () => void;
}

export function GuidedTour({ step, onStepChange, onNavigate, onClose }: GuidedTourProps) {
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const go = (idx: number) => {
    onStepChange(idx);
    onNavigate(TOUR_STEPS[idx].targetView);
  };

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="tour-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow" style={{ margin: 0 }}>
            GUIDED TOUR · {step + 1} OF {TOUR_STEPS.length}
          </span>
          <button className="pill-btn" onClick={onClose}>
            <X size={14} /> Exit
          </button>
        </div>

        <h2 className="serif-title page-title" style={{ marginTop: 12 }}>
          {current.title}
        </h2>
        <p style={{ margin: '8px 0 10px', fontSize: 14.5 }}>{current.body}</p>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gold)' }}>{current.sourceNote}</p>

        <div className="tour-progress" aria-hidden="true">
          {TOUR_STEPS.map((_, idx) => (
            <div key={idx} className={`tour-seg ${idx <= step ? 'done' : ''}`} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            className="btn-ghost"
            disabled={step === 0}
            onClick={() => go(Math.max(0, step - 1))}
            style={{ opacity: step === 0 ? 0.45 : 1 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            className="btn-primary"
            onClick={() => (isLast ? onClose() : go(step + 1))}
          >
            {isLast ? 'Finish Tour' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
