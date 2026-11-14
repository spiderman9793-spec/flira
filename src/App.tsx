import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Compass,
  FlaskConical,
  GitCompareArrows,
  History,
  Home,
  Moon,
  Play,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { GuidedTour, ViewId } from './components/GuidedTour';
import { Starfield } from './components/Starfield';
import { Environment, PRESETS } from './engine/physics';
import { PSI_RUNS } from './engine/psiRuns';
import { Chunk } from './engine/retrieval';
import { PSI_REGISTRY } from './engine/schema';
import { CompareView } from './views/CompareView';
import { ControlsView } from './views/ControlsView';
import { CopilotView } from './views/CopilotView';
import { HomeView } from './views/HomeView';
import { LabView } from './views/LabView';
import { RankView } from './views/RankView';
import { SourcesView } from './views/SourcesView';
import { UniverseView } from './views/UniverseView';

const NAV_ITEMS: { id: ViewId; label: string; short: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: Home },
  { id: 'rank', label: 'Dashboard', short: 'Rank', icon: BarChart3 },
  { id: 'lab', label: 'Virtual Lab', short: 'Lab', icon: FlaskConical },
  { id: 'universe', label: 'Universe', short: '3D', icon: Compass },
  { id: 'compare', label: 'Compare', short: 'Compare', icon: GitCompareArrows },
  { id: 'controls', label: 'Controls', short: 'Controls', icon: Shield },
  { id: 'copilot', label: 'Co-Pilot AI', short: 'AI', icon: Sparkles },
  { id: 'sources', label: 'PSI & Earth', short: 'PSI', icon: BookOpen },
];

export default function App() {
  const [view, setView] = useState<ViewId>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [presetName, setPresetName] = useState<string>(Object.keys(PRESETS)[0]);
  const [env, setEnv] = useState<Environment>(PRESETS[Object.keys(PRESETS)[0]]);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [extraChunks, setExtraChunks] = useState<Chunk[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handlePreset = (name: string) => {
    setPresetName(name);
    if (PRESETS[name]) setEnv(PRESETS[name]);
  };

  return (
    <>
      <Starfield theme={theme} />
      <div className="app-shell">
        <header className="topbar">
          <button className="brand-btn" onClick={() => setView('home')}>
            <span className="brand-orb" aria-hidden="true" />
            <span className="brand-title">FLIRA</span>
          </button>

          <nav className="nav-tabs" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-tab ${view === item.id ? 'active' : ''}`}
                  onClick={() => setView(item.id)}
                >
                  <Icon size={14} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="top-actions">
            <button
              className="icon-pill"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="pill-btn"
              onClick={() => {
                setTourStep(0);
                setTourOpen(true);
                setView('home');
              }}
              title="Start 7-step guided tour"
            >
              <Play size={13} /> Tour
            </button>
            <button className="pill-btn" onClick={() => setPrivacyOpen(true)}>
              <ShieldCheck size={13} /> Firewall
            </button>
            <button className="pill-btn" onClick={() => setUpdatesOpen(true)}>
              <History size={13} /> Updates
            </button>
          </div>
        </header>

        <main className="main-content">
          {/* Persistent Habitat Environment Strip */}
          <div className="card env-strip">
            <span className="eyebrow" style={{ margin: 0 }}>
              ACTIVE HABITAT
            </span>
            <select
              className="select-input"
              value={env.label === 'custom' ? 'custom' : presetName}
              onChange={(e) => handlePreset(e.target.value)}
            >
              {Object.keys(PRESETS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {env.label === 'custom' && (
                <option value="custom">
                  Custom ({env.gravity_g.toFixed(2)}g, {env.pressure_psi.toFixed(1)} psi,{' '}
                  {env.o2_pct.toFixed(0)}% O₂)
                </option>
              )}
            </select>

            <div
              className="mono"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: 12,
                marginLeft: 'auto',
              }}
            >
              <span className="badge badge-gold">g={env.gravity_g.toFixed(2)}</span>
              <span className="badge">P={env.pressure_psi.toFixed(1)} psi</span>
              <span className="badge">O₂={env.o2_pct.toFixed(0)}%</span>
              <span className="badge">Flow={env.flow_cm_s.toFixed(0)} cm/s</span>
            </div>
          </div>

          {view === 'home' && (
            <HomeView
              env={env}
              onNavigate={setView}
              onStartTour={() => {
                setTourStep(0);
                setTourOpen(true);
              }}
            />
          )}
          {view === 'rank' && <RankView env={env} />}
          {view === 'lab' && <LabView env={env} onEnvChange={setEnv} />}
          {view === 'universe' && <UniverseView env={env} />}
          {view === 'compare' && <CompareView />}
          {view === 'controls' && <ControlsView env={env} />}
          {view === 'copilot' && <CopilotView env={env} extraChunks={extraChunks} />}
          {view === 'sources' && (
            <SourcesView
              extraChunks={extraChunks}
              onAddChunks={(chunks) => setExtraChunks((prev) => [...prev, ...chunks])}
            />
          )}
        </main>

        <footer className="footer">
          FLIRA · Flame in Freefall v2 — Unofficial Space Apps prototype. Quotes verified NASA PSI
          records &amp; refuses to fabricate unmeasured rates.
        </footer>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.filter((i) => ['home', 'rank', 'lab', 'universe', 'copilot'].includes(i.id)).map(
            (item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={view === item.id ? 'active' : ''}
                  onClick={() => setView(item.id)}
                >
                  <Icon size={17} />
                  <span>{item.short}</span>
                </button>
              );
            }
          )}
        </nav>

        {tourOpen && (
          <GuidedTour
            step={tourStep}
            onStepChange={setTourStep}
            onNavigate={setView}
            onClose={() => setTourOpen(false)}
          />
        )}

        {privacyOpen && (
          <div
            className="tour-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setPrivacyOpen(false)}
          >
            <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
              <span className="eyebrow">SCIENTIFIC INTEGRITY &amp; PRIVACY</span>
              <h2 className="serif-title page-title" style={{ marginTop: 6 }}>
                NASA Source Firewall
              </h2>
              <ul style={{ fontSize: 13.5, paddingLeft: 18, lineHeight: 1.65 }}>
                <li>
                  <strong>Local-first corpus:</strong> Co-Pilot runs deterministic BM25 + TF-IDF
                  retrieval directly in your browser with zero external calls by default.
                </li>
                <li>
                  <strong>Optional Cloud AI:</strong> If you enable Gemini, your API key stays in
                  memory only, and every sentence is verified against retrieved{' '}
                  <code>[inv:ID]</code>, <code>[psi:...]</code>, or <code>[kb:...]</code> markers.
                </li>
                <li>
                  <strong>No fabricated rates:</strong> Spread rates in mm/s are omitted unless a
                  measured anchor is provided; 0.16 g and 0.38 g report uncertainty bands rather
                  than fake predictions.
                </li>
              </ul>
              <button className="btn-primary" onClick={() => setPrivacyOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {updatesOpen && (
          <div
            className="tour-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setUpdatesOpen(false)}
          >
            <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
              <span className="eyebrow">DATASET &amp; RELEASE NOTES</span>
              <h2 className="serif-title page-title" style={{ marginTop: 6 }}>
                FLIRA v2.1 Updates
              </h2>
              <ul style={{ fontSize: 13.5, paddingLeft: 18, lineHeight: 1.65 }}>
                <li>
                  <strong>Official NASA PSI Per-Run Tables:</strong> Integrated{' '}
                  {PSI_RUNS.table_count} official <code>experimentalTable</code> CSVs (
                  {PSI_RUNS.total_run_rows.toLocaleString()} verbatim test rows) across{' '}
                  {PSI_REGISTRY.combustion_investigations} PSI Combustion Science records.
                </li>
                <li>
                  <strong>3D Combustion Universe &amp; Coverage:</strong> Added interactive 3D
                  parameter cube alongside 2D coverage gap plots.
                </li>
                <li>
                  <strong>Next-Gen Fire Safety Controls:</strong> Added dedicated spacecraft hardware
                  controls view (screening, multi-criteria detection, CO₂ &amp; ion-wind).
                </li>
                <li>
                  <strong>Multi-Turn Co-Pilot &amp; Client Ingestion:</strong> Added conversational
                  memory, Markdown report export, CSV/JSON downloads, and live file ingestion.
                </li>
              </ul>
              <button className="btn-primary" onClick={() => setUpdatesOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
