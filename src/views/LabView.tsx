import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator } from 'lucide-react';
import { FlameSvg } from '../components/FlameSvg';
import { MonteCarloChart } from '../components/MonteCarloChart';
import {
  Environment,
  MATERIAL_LOI,
  PRESETS,
  flammabilityMargin,
  gravityBand,
  spreadRateMmS,
  summarise,
} from '../engine/physics';

interface LabViewProps {
  env: Environment;
  onEnvChange: (next: Environment) => void;
}

export function LabView({ env, onEnvChange }: LabViewProps) {
  const [anchorEnabled, setAnchorEnabled] = useState(false);
  const [anchorRate, setAnchorRate] = useState(2.5);
  const [anchorPreset, setAnchorPreset] = useState(
    'ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)'
  );

  const summary = useMemo(() => summarise(env), [env]);
  const band = useMemo(() => gravityBand(env), [env]);
  const margins = useMemo(
    () => Object.keys(MATERIAL_LOI).map((m) => flammabilityMargin(m, env)),
    [env]
  );
  const scaledRate = useMemo(
    () =>
      spreadRateMmS(
        env,
        anchorEnabled ? anchorRate : null,
        anchorEnabled ? PRESETS[anchorPreset] ?? PRESETS['ISS / LEO Spacecraft (0g, 14.7 psi, 21% O2)'] : null
      ),
    [env, anchorEnabled, anchorRate, anchorPreset]
  );

  const update = (patch: Partial<Environment>) => {
    onEnvChange({ ...env, ...patch, label: 'custom' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">VIRTUAL LAB · PARTIAL-GRAVITY BOUNDS</p>
        <h2 className="serif-title page-title">Conceptual Flame Lab &amp; 0 g–1 g Uncertainty</h2>
        <p className="lead">
          Adjust gravity, atmosphere, forced airflow, and electric-field ion wind. Physics outputs
          report a dimensionless flammability index with a 400-draw Monte Carlo uncertainty bracket
          — never fabricated mm/s spread rates.
        </p>
      </div>

      {/* Interactive Simulator + Controls */}
      <div className="grid-2">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              HABITAT &amp; TEST CONTROLS
            </span>
            <span className="badge badge-gold">{summary.morphology.regime}</span>
          </div>

          <label style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gravity</span>
              <span className="mono">{env.gravity_g.toFixed(2)} g</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={env.gravity_g}
              onChange={(e) => update({ gravity_g: parseFloat(e.target.value) })}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Oxygen concentration</span>
              <span className="mono">{env.o2_pct.toFixed(0)}% O₂</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              step={1}
              value={env.o2_pct}
              onChange={(e) => update({ o2_pct: parseFloat(e.target.value) })}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cabin pressure</span>
              <span className="mono">{env.pressure_psi.toFixed(1)} psi</span>
            </div>
            <input
              type="range"
              min={2.9}
              max={29.4}
              step={0.1}
              value={env.pressure_psi}
              onChange={(e) => update({ pressure_psi: parseFloat(e.target.value) })}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Forced ventilation airflow</span>
              <span className="mono">{env.flow_cm_s.toFixed(0)} cm/s</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={env.flow_cm_s}
              onChange={(e) => update({ flow_cm_s: parseFloat(e.target.value) })}
            />
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Applied E-field (ACME E-FIELD analogue)</span>
              <span className="mono">{env.efield_kv.toFixed(1)} kV</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={env.efield_kv}
              onChange={(e) => update({ efield_kv: parseFloat(e.target.value) })}
            />
          </label>

          <div className="grid-2" style={{ gap: 10 }}>
            <div className="card" style={{ padding: 12 }}>
              <span className="eyebrow">FLAMMABILITY INDEX</span>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
                {summary.index.toFixed(2)}×
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                10–90% band: {summary.band_p10.toFixed(2)}–{summary.band_p90.toFixed(2)}
              </div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <span className="eyebrow">EVA PRE-BREATHE</span>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {summary.prebreathe_min} min
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Effective flow: {summary.effective_flow_cm_s} cm/s
              </div>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="badge badge-orange">
            <AlertTriangle size={12} /> Educational visualization only — NOT a CFD combustion solver
          </span>
          <FlameSvg
            gravityG={env.gravity_g}
            o2Pct={env.o2_pct}
            flowCmS={env.flow_cm_s}
            efieldKv={env.efield_kv}
            morph={summary.morphology}
            size={250}
          />
          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
            Aspect ratio <span className="mono">{summary.morphology.aspect_ratio}</span> · Buoyant
            share <span className="mono">{Math.round(summary.morphology.buoyant_share * 100)}%</span>{' '}
            · Buoyant velocity <span className="mono">{summary.buoyant_velocity_cm_s} cm/s</span>
          </div>
        </div>
      </div>

      {/* Honest Partial-g Verdict + Monte Carlo Curve */}
      <div className="card card-gold">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <span className="eyebrow">0 G – 1 G MONTE CARLO ENVELOPE (400 DRAWS)</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              Bounding the unmeasured region between microgravity and Earth
            </h3>
          </div>
          <span
            className={`badge ${summary.has_empirical_data ? 'badge-green' : 'badge-red'}`}
          >
            {summary.has_empirical_data
              ? 'Anchor regime (0 g or 1 g)'
              : `No empirical data at ${env.gravity_g.toFixed(2)} g`}
          </span>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 0 }}>{summary.statement}</p>
        <MonteCarloChart band={band} activeGravity={env.gravity_g} />
      </div>

      {/* Anchor-Scaled Spread Rate Refusal / Transport */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <span className="eyebrow">ANCHOR-SCALED SPREAD RATE GUARDRAIL</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              <Calculator size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Transport a Measured Rate (Refuses Without an Empirical Anchor)
            </h3>
          </div>
          <button
            className={`btn-ghost ${anchorEnabled ? 'active' : ''}`}
            onClick={() => setAnchorEnabled((v) => !v)}
          >
            {anchorEnabled ? 'Anchor Supplied' : 'No Anchor (Default Refusal)'}
          </button>
        </div>

        <div className="grid-3" style={{ alignItems: 'end' }}>
          <label style={{ fontSize: 12.5 }}>
            Measured anchor spread rate (mm/s)
            <input
              type="number"
              step="0.1"
              min="0.1"
              disabled={!anchorEnabled}
              className="text-input"
              style={{ width: '100%', marginTop: 4, opacity: anchorEnabled ? 1 : 0.5 }}
              value={anchorRate}
              onChange={(e) => setAnchorRate(parseFloat(e.target.value) || 0.1)}
            />
          </label>
          <label style={{ fontSize: 12.5 }}>
            Anchor reference condition
            <select
              disabled={!anchorEnabled}
              className="select-input"
              style={{ width: '100%', marginTop: 4, opacity: anchorEnabled ? 1 : 0.5 }}
              value={anchorPreset}
              onChange={(e) => setAnchorPreset(e.target.value)}
            >
              {Object.keys(PRESETS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ padding: 12, boxShadow: 'none' }}>
            <span className="eyebrow">SCALED SPREAD RATE</span>
            {scaledRate === null ? (
              <div className="mono" style={{ fontSize: 14, color: 'var(--accent-red)', fontWeight: 600 }}>
                NULL — Refused (no measured anchor)
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 20, color: 'var(--gold)', fontWeight: 700 }}>
                {scaledRate.toFixed(2)} mm/s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Material LOI Table */}
      <div className="card">
        <span className="eyebrow">MATERIAL LIMITING OXYGEN INDEX (LOI) SCREENING</span>
        <h3 style={{ margin: '2px 0 8px', fontSize: 18 }}>
          Pressure-adjusted flammability margin at {env.o2_pct.toFixed(0)}% O₂,{' '}
          {env.pressure_psi.toFixed(1)} psi
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>1 atm LOI</th>
                <th>Effective LOI</th>
                <th>Margin (O₂ − LOI)</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {margins.map((m) => (
                <tr key={m.material}>
                  <td style={{ fontWeight: 600 }}>{m.material}</td>
                  <td className="mono">{m.loi_at_1atm.toFixed(1)}%</td>
                  <td className="mono">{m.loi_effective.toFixed(1)}%</td>
                  <td
                    className="mono"
                    style={{
                      color:
                        m.margin_pct > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                      fontWeight: 600,
                    }}
                  >
                    {m.margin_pct > 0 ? `+${m.margin_pct}` : m.margin_pct}%
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        m.severity === 'danger'
                          ? 'badge-red'
                          : m.severity === 'warn'
                          ? 'badge-orange'
                          : m.severity === 'caution'
                          ? 'badge-gold'
                          : 'badge-green'
                      }`}
                    >
                      {m.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
