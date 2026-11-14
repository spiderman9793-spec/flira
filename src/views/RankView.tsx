import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, RotateCcw, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Environment } from '../engine/physics';
import { DEFAULT_WEIGHTS, Weights, rankInvestigations } from '../engine/ranking';
import { BASIS_LABEL, INVESTIGATIONS } from '../engine/schema';

interface RankViewProps {
  env: Environment;
}

export function RankView({ env }: RankViewProps) {
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [materialClass, setMaterialClass] = useState<'solid' | 'liquid' | 'gas'>('solid');
  const [studyScope, setStudyScope] = useState<'all' | 'flight' | 'ground'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('SAFFIRE-I');
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [showWeights, setShowWeights] = useState(false);

  const togglePillar = (p: string) => {
    setSelectedPillars((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const ranked = useMemo(() => {
    const all = rankInvestigations(INVESTIGATIONS, env, weights, selectedPillars, materialClass);
    if (studyScope === 'all') return all;
    return all.filter((r) => {
      const isGround = r.investigation.facility.startsWith('Ground');
      return studyScope === 'ground' ? isGround : !isGround;
    });
  }, [env, weights, selectedPillars, materialClass, studyScope]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">AI FIRE-SAFETY DASHBOARD</p>
        <h2 className="serif-title page-title">Habitat-Weighted Investigation Ranking</h2>
        <p className="lead">
          Every score out of 100 decomposes into seven auditable axes (gravity, O₂, pressure,
          airflow, phase, safety pillar, and shared-hardware comparability) against your active
          habitat environment.
        </p>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            SAFETY PILLARS:
          </span>
          {['prevention', 'detection', 'suppression'].map((p) => (
            <button
              key={p}
              className={`btn-ghost ${selectedPillars.includes(p) ? 'active' : ''}`}
              onClick={() => togglePillar(p)}
              style={{ textTransform: 'capitalize', padding: '5px 11px', fontSize: 12 }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            DOMINANT FUEL:
          </span>
          {(['solid', 'liquid', 'gas'] as const).map((ph) => (
            <button
              key={ph}
              className={`btn-ghost ${materialClass === ph ? 'active' : ''}`}
              onClick={() => setMaterialClass(ph)}
              style={{ textTransform: 'capitalize', padding: '5px 11px', fontSize: 12 }}
            >
              {ph}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>SCOPE:</span>
          {(
            [
              ['all', 'All (24/24 PSI)'],
              ['flight', 'Flight'],
              ['ground', 'Ground/CFD'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              className={`btn-ghost ${studyScope === k ? 'active' : ''}`}
              onClick={() => setStudyScope(k)}
              style={{ padding: '5px 10px', fontSize: 12 }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className={`btn-ghost ${showWeights ? 'active' : ''}`}
          onClick={() => setShowWeights((v) => !v)}
          style={{ marginLeft: 'auto', padding: '5px 11px', fontSize: 12 }}
        >
          <SlidersHorizontal size={13} /> Custom Axis Weights
        </button>
      </div>

      {/* NASA 5-Axis Weighted Sum Formula Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
          borderLeft: '3px solid var(--gold)',
          padding: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            className="mono"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--gold)',
              padding: '6px 14px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              border: '1px solid rgba(245, 158, 11, 0.3)',
              letterSpacing: 1,
            }}
          >
            S = ∑ (wᵢ · rᵢ)
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              NASA Multi-Axis Flammability Relevance Score Formula
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              S = w_g·r_g + w_O2·r_O2 + w_P·r_P + w_u·r_u + w_mat·r_mat (scaled to 100)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-gold" title="r_g: Microgravity, Lunar (0.166g), or Martian (0.38g)">
            i=1: Gravity (r_g)
          </span>
          <span className="badge badge-blue" title="r_O2: Normal 21% vs Exploration 34% O2">
            i=2: Oxygen (r_O2)
          </span>
          <span className="badge badge-blue" title="r_P: 14.7 psia vs 8.2 psia exploration">
            i=3: Pressure (r_P)
          </span>
          <span className="badge badge-gold" title="r_u: Ventilation duct flow velocity">
            i=4: Flow (r_u)
          </span>
          <span className="badge badge-green" title="r_mat: Solid, liquid, or gas phase">
            i=5: Fuel Phase (r_mat)
          </span>
        </div>
      </div>

      {showWeights && (
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <span className="eyebrow" style={{ margin: 0 }}>
              7-AXIS RANKING WEIGHTS
            </span>
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
            >
              <RotateCcw size={12} /> Reset Defaults
            </button>
          </div>
          <div className="grid-4">
            {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((axis) => (
              <label key={axis} style={{ fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'capitalize' }}>{axis}</span>
                  <span className="mono">{weights[axis].toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={weights[axis]}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [axis]: parseFloat(e.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Ranked List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ranked.map((r, idx) => {
          const inv = r.investigation;
          const isOpen = expandedId === inv.id;
          return (
            <article key={inv.id} className="card" style={{ padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono badge badge-gold">#{idx + 1}</span>
                    <strong style={{ fontSize: 17 }}>{inv.id}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: 14 }}>{inv.name}</span>
                    {inv.psi && (
                      <span className="badge badge-blue">{inv.psi.accession}</span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 8px', fontSize: 13.5, color: 'var(--muted)' }}>
                    {inv.short}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className="badge">
                      Best condition: {r.condition.label} ({r.condition.o2_pct}% O₂,{' '}
                      {r.condition.pressure_psi} psi, {r.condition.flow_cm_s} cm/s)
                    </span>
                    <span className="badge">{BASIS_LABEL[r.condition.basis]}</span>
                    {r.flags.map((flag) => (
                      <span key={flag} className="badge badge-orange">
                        <ShieldAlert size={11} /> {flag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="mono"
                      style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}
                    >
                      {r.score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>RELEVANCE / 100</div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => setExpandedId(isOpen ? null : inv.id)}
                  >
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Audit
                  </button>
                </div>
              </div>

              {isOpen && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                    gap: 18,
                  }}
                >
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 8 }}>
                      7-AXIS SCORE DECOMPOSITION
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {r.components.map((c) => (
                        <div key={c.name}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 12,
                            }}
                          >
                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                              {c.name} (w={c.weight})
                            </span>
                            <span className="mono">{Math.round(c.value * 100)}%</span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 4,
                              background: 'var(--border-subtle)',
                              overflow: 'hidden',
                              margin: '3px 0',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(c.value * 100)}%`,
                                height: '100%',
                                background:
                                  c.value > 0.7
                                    ? 'var(--accent-green)'
                                    : c.value > 0.4
                                    ? 'var(--gold)'
                                    : 'var(--accent-red)',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div>
                      <span className="eyebrow">NASA FINDING ({inv.finding_basis})</span>
                      <p style={{ margin: '2px 0 0' }}>{inv.finding}</p>
                    </div>
                    <div>
                      <span className="eyebrow">PARTIAL-GRAVITY RELEVANCE</span>
                      <p style={{ margin: '2px 0 0', color: 'var(--muted)' }}>
                        {inv.partial_g_note}
                      </p>
                    </div>
                    <div>
                      <span className="eyebrow">EARTH FIRE-SAFETY SPIN-OFF</span>
                      <p style={{ margin: '2px 0 0', color: 'var(--muted)' }}>
                        {inv.earth_spinoff}
                      </p>
                    </div>
                    {inv.psi && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        <a
                          href={inv.psi.psi_url}
                          target="_blank"
                          rel="noreferrer"
                          className="pill-btn"
                          style={{ textDecoration: 'none' }}
                        >
                          PSI Record ({inv.psi.accession}) <ExternalLink size={12} />
                        </a>
                        {inv.psi.doi_url && (
                          <a
                            href={inv.psi.doi_url}
                            target="_blank"
                            rel="noreferrer"
                            className="pill-btn"
                            style={{ textDecoration: 'none' }}
                          >
                            DOI: {inv.psi.doi} <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
