import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  FlaskConical,
  GitCompareArrows,
  Play,
  Shield,
  Sparkles,
} from 'lucide-react';
import { ViewId } from '../components/GuidedTour';
import { FlameSvg } from '../components/FlameSvg';
import { Environment, morphology, summarise } from '../engine/physics';
import { INVESTIGATIONS, PSI_REGISTRY, UPCOMING } from '../engine/schema';

interface HomeViewProps {
  env: Environment;
  onNavigate: (view: ViewId) => void;
  onStartTour: () => void;
}

export function HomeView({ env, onNavigate, onStartTour }: HomeViewProps) {
  const summary = summarise(env);
  const microMorph = morphology({ ...env, gravity_g: 0, flow_cm_s: 0.5, efield_kv: 0 });
  const totalConditions = INVESTIGATIONS.reduce((acc, inv) => acc + inv.conditions.length, 0);

  const workspaceItems: {
    id: ViewId;
    title: string;
    desc: string;
    icon: typeof BarChart3;
    tag: string;
  }[] = [
    {
      id: 'rank',
      title: 'AI Fire-Safety Dashboard',
      desc: 'Summarize, rank, and audit NASA studies weighted to your target crew habitat.',
      icon: BarChart3,
      tag: '7-axis ranking',
    },
    {
      id: 'lab',
      title: 'Virtual Lab & 0g–1g Bounds',
      desc: 'Adjust gravity, O₂, pressure, airflow & E-field with live Monte Carlo uncertainty.',
      icon: FlaskConical,
      tag: 'Simulator + LOI',
    },
    {
      id: 'universe',
      title: 'Evidence Universe & Coverage',
      desc: 'Inspect what has been measured and expose unmeasured gaps across O₂, P, and g.',
      icon: Compass,
      tag: `${totalConditions} conditions`,
    },
    {
      id: 'compare',
      title: 'Cross-Compare & Hardware Graph',
      desc: 'Diff up to 3 experiments side-by-side and trace shared CIR/MSG/Cygnus rigs.',
      icon: GitCompareArrows,
      tag: 'Network graph',
    },
    {
      id: 'controls',
      title: 'Next-Gen Safety Controls',
      desc: 'Hardware takeaways for prevention, dust-safe detection, CO₂ & ion-wind suppression.',
      icon: Shield,
      tag: 'Spacecraft hardware',
    },
    {
      id: 'sources',
      title: 'PSI Tables, Registry & Earth Spin-Offs',
      desc: `Browse ${PSI_REGISTRY.combustion_investigations} PSI DOIs, 22 per-run CSV tables & terrestrial spin-offs.`,
      icon: BookOpen,
      tag: `${PSI_REGISTRY.combustion_investigations} PSI DOIs`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Hero */}
      <section className="card card-gold" style={{ padding: '28px 26px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            alignItems: 'center',
          }}
        >
          <div>
            <p className="eyebrow">NASA MICROGRAVITY COMBUSTION · SCIENTIFIC INTELLIGENCE</p>
            <h1 className="serif-title hero-title">FLAME IN FREEFALL</h1>
            <p className="lead" style={{ marginBottom: 18 }}>
              Ask scientific questions. Explore NASA PSI evidence. Bound partial-gravity risk.
              Every conclusion traceable to its source — and explicit about what has not been
              measured yet.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button className="btn-primary" onClick={() => onNavigate('copilot')}>
                <Sparkles size={15} /> Ask Source-Firewall AI
              </button>
              <button className="btn-ghost" onClick={onStartTour}>
                <Play size={14} /> 7-Step Guided Tour
              </button>
              <button className="btn-ghost" onClick={() => onNavigate('lab')}>
                Open Virtual Lab <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlameSvg
              gravityG={0}
              o2Pct={21}
              flowCmS={0.5}
              efieldKv={0}
              morph={microMorph}
              size={220}
            />
            <span className="badge badge-blue" style={{ marginTop: 4 }}>
              Quiescent 0 g diffusion sphere · dim blue below 1 cm/s
            </span>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid-4" style={{ marginTop: 22 }}>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 2 }}>
              NASA PSI REGISTRY
            </span>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
              {PSI_REGISTRY.combustion_investigations} / {PSI_REGISTRY.total_psi_investigations}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Combustion records · {PSI_REGISTRY.total_files.toLocaleString()} archive files
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 2 }}>
              24/24 PSI COVERAGE
            </span>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
              {INVESTIGATIONS.length} · {totalConditions}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              All 24 PSI records ranked &amp; mapped in 3D
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 2 }}>
              ACTIVE HABITAT INDEX
            </span>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-orange)' }}>
              {summary.index.toFixed(2)}×
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              10–90% band {summary.band_p10.toFixed(2)}–{summary.band_p90.toFixed(2)} at{' '}
              {env.gravity_g.toFixed(2)} g
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow" style={{ marginBottom: 2 }}>
              PARTIAL-G GAP
            </span>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-red)' }}>
              0 empirical
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Awaiting {UPCOMING.map((u) => u.id).join(' & ')} at 0.16 g
            </div>
          </div>
        </div>
      </section>

      {/* Ask AI Hero Bar */}
      <button
        className="card card-gold workspace-card"
        onClick={() => onNavigate('copilot')}
        style={{ padding: '18px 22px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--pill-bg)',
              border: '1px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--gold)',
            }}
          >
            <Sparkles size={19} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Ask FLIRA Co-Pilot</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              What does NASA PSI evidence tell us about fire in microgravity, oxygen limits, and
              lunar habitats?
            </div>
          </div>
        </div>
        <ArrowRight size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
      </button>

      {/* Workspace Cards */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          YOUR WORKSPACE
        </p>
        <div className="grid-2">
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="card workspace-card"
                onClick={() => onNavigate(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'var(--pill-bg)',
                      border: '1px solid var(--border-subtle)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--gold)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15.5, fontWeight: 600 }}>{item.title}</span>
                      <span className="badge badge-gold">{item.tag}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
