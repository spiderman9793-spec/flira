import { useMemo, useRef, useState } from 'react';
import { Box, Grid } from 'lucide-react';
import { Environment } from '../engine/physics';
import { getTablesForAccession, PSI_RUNS } from '../engine/psiRuns';
import { BASIS_LABEL, INVESTIGATIONS, Investigation, TestCondition } from '../engine/schema';

type AxisKey = 'o2_pct' | 'pressure_psi' | 'flow_cm_s' | 'gravity_g';

const AXIS_META: Record<
  AxisKey,
  { label: string; min: number; max: number; unit: string }
> = {
  o2_pct: { label: 'Oxygen (%)', min: 10, max: 100, unit: '%' },
  pressure_psi: { label: 'Pressure (psi)', min: 0, max: 32, unit: ' psi' },
  flow_cm_s: { label: 'Airflow (cm/s)', min: 0, max: 30, unit: ' cm/s' },
  gravity_g: { label: 'Gravity (g)', min: -0.05, max: 1.05, unit: ' g' },
};

interface UniverseViewProps {
  env: Environment;
}

export function UniverseView({ env }: UniverseViewProps) {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [xAxis, setXAxis] = useState<AxisKey>('o2_pct');
  const [yAxis, setYAxis] = useState<AxisKey>('pressure_psi');
  const [zAxis, setZAxis] = useState<AxisKey>('flow_cm_s');
  const [azimDeg, setAzimDeg] = useState(34);
  const [elevDeg, setElevDeg] = useState(22);
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'flight' | 'ground'>('all');
  const [selectedInvId, setSelectedInvId] = useState<string>('SAFFIRE-I');
  const dragRef = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  const points = useMemo(() => {
    const out: {
      inv: Investigation;
      cond: TestCondition;
      x: number;
      y: number;
      z: number;
    }[] = [];
    for (const inv of INVESTIGATIONS) {
      if (phaseFilter !== 'all' && !inv.phase.includes(phaseFilter)) continue;
      if (scopeFilter !== 'all') {
        const isGround = inv.facility.startsWith('Ground');
        if (scopeFilter === 'ground' && !isGround) continue;
        if (scopeFilter === 'flight' && isGround) continue;
      }
      for (const cond of inv.conditions) {
        const g = inv.gravity_g[0] ?? 0;
        const getVal = (k: AxisKey) => (k === 'gravity_g' ? g : cond[k]);
        out.push({ inv, cond, x: getVal(xAxis), y: getVal(yAxis), z: getVal(zAxis) });
      }
    }
    return out;
  }, [xAxis, yAxis, zAxis, phaseFilter, scopeFilter]);

  const selectedInv = useMemo(
    () => INVESTIGATIONS.find((i) => i.id === selectedInvId) ?? INVESTIGATIONS[0],
    [selectedInvId]
  );
  const selectedPsiTables = useMemo(
    () => (selectedInv.psi ? getTablesForAccession(selectedInv.psi.accession) : []),
    [selectedInv]
  );

  // 2D SVG layout
  const w = 700;
  const h = 360;
  const padL = 56;
  const padR = 26;
  const padT = 26;
  const padB = 46;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xm = AXIS_META[xAxis];
  const ym = AXIS_META[yAxis];
  const zm = AXIS_META[zAxis];
  const xPx = (v: number) => padL + ((v - xm.min) / (xm.max - xm.min)) * plotW;
  const yPx = (v: number) => padT + plotH - ((v - ym.min) / (ym.max - ym.min)) * plotH;

  const norm = (val: number, k: AxisKey) => {
    const m = AXIS_META[k];
    return Math.min(1, Math.max(0, (val - m.min) / (m.max - m.min))) - 0.5;
  };

  // 3D orthographic projection
  const project3D = (nx: number, ny: number, nz: number) => {
    const az = (azimDeg * Math.PI) / 180;
    const el = (elevDeg * Math.PI) / 180;
    const x1 = nx * Math.cos(az) - nz * Math.sin(az);
    const z1 = nx * Math.sin(az) + nz * Math.cos(az);
    const y2 = ny * Math.cos(el) - z1 * Math.sin(el);
    const z2 = ny * Math.sin(el) + z1 * Math.cos(el);
    const scale = 215;
    return {
      sx: 350 + x1 * scale,
      sy: 185 - y2 * scale,
      depth: z2,
    };
  };

  const cubeCorners = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
  ];
  const cubeEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const projectedPoints3D = useMemo(() => {
    return points
      .map((p) => {
        const pr = project3D(norm(p.x, xAxis), norm(p.y, yAxis), norm(p.z, zAxis));
        return { ...p, ...pr };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [points, azimDeg, elevDeg, xAxis, yAxis, zAxis]);

  const env3D = project3D(
    norm(env[xAxis], xAxis),
    norm(env[yAxis], yAxis),
    norm(env[zAxis], zAxis)
  );

  const lunarO2Count = points.filter((p) => p.cond.o2_pct >= 30).length;
  const partialGCount = INVESTIGATIONS.filter((i) =>
    i.gravity_g.some((g) => g > 0.01 && g < 0.99)
  ).length;

  const phaseColor = (phases: string[]) => {
    if (phases.includes('solid')) return '#dfc07c';
    if (phases.includes('liquid')) return '#5fa3ff';
    return '#ff7a1a';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">COMBUSTION UNIVERSE &amp; COVERAGE</p>
        <h2 className="serif-title page-title">What Has Been Measured — and What Has Not</h2>
        <p className="lead">
          Explore {INVESTIGATIONS.length} curated records ({points.length} conditions) linked to{' '}
          {PSI_RUNS.total_run_rows.toLocaleString()} official NASA PSI experimental rows. An empty
          region is missing evidence — never proof that nothing happens there.
        </p>
      </div>

      {/* Coverage summary cards */}
      <div className="grid-3">
        <div className="card" style={{ padding: 14 }}>
          <span className="eyebrow">PARTIAL GRAVITY (0.02–0.98 g)</span>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-red)' }}>
            {partialGCount} / {INVESTIGATIONS.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Investigations measured in Moon/Mars gravity (0 empirical)
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <span className="eyebrow">ELEVATED O₂ (≥ 30%)</span>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
            {lunarO2Count} conditions
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Mostly SAFFIRE (2.98 psi), ACME-CFI-G (14.7 psi), &amp; ACME-BRE
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <span className="eyebrow">NASA PSI RUN TABLES</span>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>
            {PSI_RUNS.total_run_rows.toLocaleString()} rows
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Across {PSI_RUNS.table_count} official experimentalTable CSVs
          </div>
        </div>
      </div>

      {/* Interactive 3D Cube / 2D Coverage Plot */}
      <div className="card card-gold">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn-ghost ${mode === '3d' ? 'active' : ''}`}
              onClick={() => setMode('3d')}
            >
              <Box size={14} /> 3D Cube
            </button>
            <button
              className={`btn-ghost ${mode === '2d' ? 'active' : ''}`}
              onClick={() => setMode('2d')}
            >
              <Grid size={14} /> 2D Coverage
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <select
              aria-label="X axis"
              className="select-input"
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value as AxisKey)}
            >
              {Object.entries(AXIS_META).map(([k, m]) => (
                <option key={k} value={k}>
                  X: {m.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Y axis"
              className="select-input"
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value as AxisKey)}
            >
              {Object.entries(AXIS_META).map(([k, m]) => (
                <option key={k} value={k}>
                  Y: {m.label}
                </option>
              ))}
            </select>
            {mode === '3d' && (
              <select
                aria-label="Z axis"
                className="select-input"
                value={zAxis}
                onChange={(e) => setZAxis(e.target.value as AxisKey)}
              >
                {Object.entries(AXIS_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    Z: {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'solid', 'liquid', 'gas'].map((ph) => (
              <button
                key={ph}
                className={`btn-ghost ${phaseFilter === ph ? 'active' : ''}`}
                onClick={() => setPhaseFilter(ph)}
                style={{ padding: '5px 10px', fontSize: 12, textTransform: 'capitalize' }}
              >
                {ph}
              </button>
            ))}
            {(
              [
                ['all', '24/24 PSI'],
                ['flight', 'Flight'],
                ['ground', 'Ground/CFD'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                className={`btn-ghost ${scopeFilter === k ? 'active' : ''}`}
                onClick={() => setScopeFilter(k)}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === '3d' ? (
          <div>
            <svg
              viewBox="0 0 700 370"
              style={{ width: '100%', height: 'auto', display: 'block', cursor: 'grab' }}
              onMouseDown={(e) => {
                dragRef.current = { x: e.clientX, y: e.clientY, az: azimDeg, el: elevDeg };
              }}
              onMouseMove={(e) => {
                if (!dragRef.current) return;
                const dx = e.clientX - dragRef.current.x;
                const dy = e.clientY - dragRef.current.y;
                setAzimDeg(dragRef.current.az + dx * 0.45);
                setElevDeg(Math.min(80, Math.max(-80, dragRef.current.el + dy * 0.35)));
              }}
              onMouseUp={() => {
                dragRef.current = null;
              }}
              onMouseLeave={() => {
                dragRef.current = null;
              }}
            >
              {/* Wireframe cube */}
              {cubeEdges.map(([a, b], idx) => {
                const pa = project3D(cubeCorners[a][0], cubeCorners[a][1], cubeCorners[a][2]);
                const pb = project3D(cubeCorners[b][0], cubeCorners[b][1], cubeCorners[b][2]);
                return (
                  <line
                    key={idx}
                    x1={pa.sx}
                    y1={pa.sy}
                    x2={pb.sx}
                    y2={pb.sy}
                    stroke="var(--border-subtle)"
                    strokeWidth={idx < 4 ? 1 : 1.2}
                  />
                );
              })}

              {/* Axis label tips */}
              {(() => {
                const px = project3D(0.58, -0.5, -0.5);
                const py = project3D(-0.5, 0.58, -0.5);
                const pz = project3D(-0.5, -0.5, 0.58);
                return (
                  <>
                    <text x={px.sx} y={px.sy} fontSize="11" fill="var(--gold)" textAnchor="middle">
                      {xm.label}
                    </text>
                    <text x={py.sx} y={py.sy} fontSize="11" fill="var(--gold)" textAnchor="middle">
                      {ym.label}
                    </text>
                    <text x={pz.sx} y={pz.sy} fontSize="11" fill="var(--gold)" textAnchor="middle">
                      {zm.label}
                    </text>
                  </>
                );
              })()}

              {/* Active habitat marker in 3D */}
              <circle
                cx={env3D.sx}
                cy={env3D.sy}
                r={8}
                fill="none"
                stroke="var(--accent-green)"
                strokeWidth="2"
              />
              <text
                x={env3D.sx + 10}
                y={env3D.sy + 4}
                fontSize="11"
                fill="var(--accent-green)"
                fontWeight="600"
              >
                Active Habitat
              </text>

              {/* Projected points sorted back-to-front */}
              {projectedPoints3D.map((p, idx) => {
                const isSel = p.inv.id === selectedInvId;
                return (
                  <g
                    key={`${p.inv.id}-${idx}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedInvId(p.inv.id)}
                  >
                    <circle
                      cx={p.sx}
                      cy={p.sy}
                      r={isSel ? 8 : 5 + (p.depth + 0.7) * 1.6}
                      fill={phaseColor(p.inv.phase)}
                      fillOpacity={isSel ? 0.98 : 0.76}
                      stroke={isSel ? '#fff' : 'rgba(0,0,0,0.35)'}
                      strokeWidth={isSel ? 2 : 1}
                    />
                    <title>{`${p.inv.id} (${p.cond.label}): ${p.x}${xm.unit}, ${p.y}${ym.unit}, ${p.z}${zm.unit}`}</title>
                  </g>
                );
              })}
            </svg>
            <div className="grid-2" style={{ marginTop: 6 }}>
              <label style={{ fontSize: 12 }}>
                Drag cube or rotate Azimuth (<span className="mono">{Math.round(azimDeg)}°</span>)
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={azimDeg}
                  onChange={(e) => setAzimDeg(parseFloat(e.target.value))}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Elevation (<span className="mono">{Math.round(elevDeg)}°</span>)
                <input
                  type="range"
                  min={-75}
                  max={75}
                  value={elevDeg}
                  onChange={(e) => setElevDeg(parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        ) : (
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {[0.25, 0.5, 0.75, 1].map((t) => {
              const xVal = xm.min + t * (xm.max - xm.min);
              const yVal = ym.min + t * (ym.max - ym.min);
              return (
                <g key={t}>
                  <line
                    x1={xPx(xVal)}
                    y1={padT}
                    x2={xPx(xVal)}
                    y2={padT + plotH}
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={padL}
                    y1={yPx(yVal)}
                    x2={w - padR}
                    y2={yPx(yVal)}
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

            {xAxis === 'gravity_g' && (
              <rect
                x={xPx(0.02)}
                y={padT}
                width={xPx(0.98) - xPx(0.02)}
                height={plotH}
                fill="rgba(242, 92, 84, 0.08)"
              />
            )}
            {yAxis === 'gravity_g' && (
              <rect
                x={padL}
                y={yPx(0.98)}
                width={plotW}
                height={yPx(0.02) - yPx(0.98)}
                fill="rgba(242, 92, 84, 0.08)"
              />
            )}

            <line
              x1={xPx(env[xAxis])}
              y1={padT}
              x2={xPx(env[xAxis])}
              y2={padT + plotH}
              stroke="var(--accent-green)"
              strokeDasharray="5 4"
              strokeWidth="1.4"
            />
            <line
              x1={padL}
              y1={yPx(env[yAxis])}
              x2={w - padR}
              y2={yPx(env[yAxis])}
              stroke="var(--accent-green)"
              strokeDasharray="5 4"
              strokeWidth="1.4"
            />
            <circle
              cx={xPx(env[xAxis])}
              cy={yPx(env[yAxis])}
              r={6}
              fill="none"
              stroke="var(--accent-green)"
              strokeWidth="2"
            />

            {points.map((p, idx) => {
              const isSel = p.inv.id === selectedInvId;
              return (
                <g
                  key={`${p.inv.id}-${p.cond.label}-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedInvId(p.inv.id)}
                >
                  <circle
                    cx={xPx(p.x)}
                    cy={yPx(p.y)}
                    r={isSel ? 8.5 : 5.5}
                    fill={phaseColor(p.inv.phase)}
                    fillOpacity={isSel ? 0.95 : 0.72}
                    stroke={isSel ? '#ffffff' : 'rgba(0,0,0,0.35)'}
                    strokeWidth={isSel ? 2 : 1}
                  />
                  <title>{`${p.inv.id} — ${p.cond.label}: ${p.x}${xm.unit}, ${p.y}${ym.unit}`}</title>
                </g>
              );
            })}

            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border-subtle)" />
            <line
              x1={padL}
              y1={padT + plotH}
              x2={w - padR}
              y2={padT + plotH}
              stroke="var(--border-subtle)"
            />
            <text x={padL + plotW / 2} y={h - 10} textAnchor="middle" fontSize="12" fill="var(--muted)">
              {xm.label}
            </text>
            <text
              x={16}
              y={padT + plotH / 2}
              textAnchor="middle"
              fontSize="12"
              fill="var(--muted)"
              transform={`rotate(-90 16 ${padT + plotH / 2})`}
            >
              {ym.label}
            </text>
          </svg>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 8,
          }}
        >
          <span>● Gold: Solid fuel</span>
          <span style={{ color: '#5fa3ff' }}>● Blue: Liquid droplet</span>
          <span style={{ color: '#ff7a1a' }}>● Orange: Gaseous fuel</span>
          <span style={{ color: 'var(--accent-green)' }}>◎ Green: Active habitat</span>
        </div>
      </div>

      {/* Focused Investigation Record Inspector */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <span className="eyebrow">FOCUSED EVIDENCE RECORD</span>
            <h3 style={{ margin: 0, fontSize: 20 }}>
              {selectedInv.id} — {selectedInv.name}
            </h3>
          </div>
          <select
            className="select-input"
            value={selectedInvId}
            onChange={(e) => setSelectedInvId(e.target.value)}
          >
            {INVESTIGATIONS.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id} ({inv.phase.join('/')})
              </option>
            ))}
          </select>
        </div>

        <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>{selectedInv.finding}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <span className="badge badge-gold">{selectedInv.facility}</span>
          <span className="badge">{selectedInv.hardware}</span>
          {selectedInv.psi && <span className="badge badge-blue">{selectedInv.psi.accession}</span>}
          {selectedPsiTables.map((t) => (
            <span key={t.file_name} className="badge badge-green">
              {t.row_count} real PSI rows ({t.file_name})
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selectedInv.conditions.map((c) => (
            <div key={c.label} className="badge">
              {c.label}: {c.o2_pct}% O₂ · {c.pressure_psi} psi · {c.flow_cm_s} cm/s (
              {BASIS_LABEL[c.basis]})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
