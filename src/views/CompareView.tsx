import { useMemo, useState } from 'react';
import { Download, GitCompareArrows, Layers, Network, Search } from 'lucide-react';
import { buildRelationshipGraph, parametricQuery } from '../engine/ranking';
import { INVESTIGATIONS } from '../engine/schema';

export function CompareView() {
  const [tab, setTab] = useState<'compare' | 'variability' | 'graph' | 'query'>('compare');
  const [selectedIds, setSelectedIds] = useState<string[]>(['BASS-II', 'SAFFIRE-I', 'ACME-E-FIELD']);
  const [focusedNode, setFocusedNode] = useState<string>('BASS-II');

  // Parametric query state
  const [fuelQ, setFuelQ] = useState('PMMA');
  const [o2Min, setO2Min] = useState(15);
  const [flowMax, setFlowMax] = useState(25);
  const [phaseQ, setPhaseQ] = useState('');

  const toggleCompare = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.length > 2 ? prev.filter((x) => x !== id) : prev;
      return prev.length < 3 ? [...prev, id] : [...prev.slice(1), id];
    });
  };

  const chosen = useMemo(
    () => INVESTIGATIONS.filter((i) => selectedIds.includes(i.id)),
    [selectedIds]
  );

  const graph = useMemo(() => buildRelationshipGraph(INVESTIGATIONS), []);
  const queryOut = useMemo(
    () =>
      parametricQuery(INVESTIGATIONS, {
        fuel_contains: fuelQ.trim() || undefined,
        o2_min: o2Min,
        flow_max: flowMax,
        phase: phaseQ || undefined,
      }),
    [fuelQ, o2Min, flowMax, phaseQ]
  );

  const rows: { label: string; getValue: (inv: (typeof INVESTIGATIONS)[number]) => string }[] = [
    { label: 'Facility', getValue: (i) => i.facility },
    { label: 'Hardware Rig', getValue: (i) => i.hardware },
    { label: 'Fuel Phase', getValue: (i) => i.phase.join(', ') },
    { label: 'Fuels Tested', getValue: (i) => i.fuels.join(', ') },
    {
      label: 'O₂ Range (%)',
      getValue: (i) => {
        const vals = i.conditions.map((c) => c.o2_pct);
        return `${Math.min(...vals)}–${Math.max(...vals)}%`;
      },
    },
    {
      label: 'Pressure (psi)',
      getValue: (i) => {
        const vals = i.conditions.map((c) => c.pressure_psi);
        return `${Math.min(...vals)}–${Math.max(...vals)} psi`;
      },
    },
    {
      label: 'Max Airflow (cm/s)',
      getValue: (i) => `${Math.max(...i.conditions.map((c) => c.flow_cm_s))} cm/s`,
    },
    { label: 'Key Finding', getValue: (i) => i.finding },
    { label: 'Partial-g Note', getValue: (i) => i.partial_g_note },
  ];

  // Radial coordinates for network graph
  const nodePositions = useMemo(() => {
    const cx = 340;
    const cy = 200;
    const rx = 250;
    const ry = 148;
    const map = new Map<string, { x: number; y: number }>();
    graph.nodes.forEach((n, idx) => {
      const angle = (idx / graph.nodes.length) * Math.PI * 2 - Math.PI / 2;
      map.set(n.id, {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      });
    });
    return map;
  }, [graph.nodes]);

  const activeNode = INVESTIGATIONS.find((i) => i.id === focusedNode) ?? INVESTIGATIONS[0];
  const activeEdges = graph.edges.filter(
    (e) => e.source === activeNode.id || e.target === activeNode.id
  );

  const exportMatrixCsv = () => {
    const header = [
      'Investigation',
      'PSI Accession',
      'Hardware',
      'Facility',
      'Phase',
      'Condition',
      'O2 (%)',
      'Pressure (psi)',
      'Airflow (cm/s)',
      'Basis',
    ];
    const csvRows = [header.join(',')];
    for (const inv of INVESTIGATIONS) {
      for (const c of inv.conditions) {
        csvRows.push(
          [
            inv.id,
            inv.psi?.accession ?? '',
            inv.hardware,
            inv.facility,
            inv.phase.join('/'),
            c.label,
            c.o2_pct,
            c.pressure_psi,
            c.flow_cm_s,
            c.basis,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        );
      }
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flira_cross_investigation_matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">CROSS-INVESTIGATION COMPARISON</p>
        <h2 className="serif-title page-title">Diff Matrix, Variability, Hardware Graph &amp; Query</h2>
        <p className="lead">
          Hardware is the hidden confounder in microgravity combustion: studies sharing a rack are
          directly comparable; studies on different rigs require careful normalization.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          className={`btn-ghost ${tab === 'compare' ? 'active' : ''}`}
          onClick={() => setTab('compare')}
        >
          <GitCompareArrows size={14} /> 2–3 Diff Compare
        </button>
        <button
          className={`btn-ghost ${tab === 'variability' ? 'active' : ''}`}
          onClick={() => setTab('variability')}
        >
          <Layers size={14} /> Within-Investigation Variability ({INVESTIGATIONS.length})
        </button>
        <button
          className={`btn-ghost ${tab === 'graph' ? 'active' : ''}`}
          onClick={() => setTab('graph')}
        >
          <Network size={14} /> Hardware &amp; Fuel Graph
        </button>
        <button
          className={`btn-ghost ${tab === 'query' ? 'active' : ''}`}
          onClick={() => setTab('query')}
        >
          <Search size={14} /> Parametric Query ({queryOut.rows.length})
        </button>
        <button className="btn-ghost" onClick={exportMatrixCsv} style={{ marginLeft: 'auto' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {tab === 'compare' && (
        <>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow">SELECT 2–3 INVESTIGATIONS TO COMPARE</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {INVESTIGATIONS.map((inv) => (
                <button
                  key={inv.id}
                  className={`btn-ghost ${selectedIds.includes(inv.id) ? 'active' : ''}`}
                  onClick={() => toggleCompare(inv.id)}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                >
                  {inv.id}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attribute (shaded = differs)</th>
                  {chosen.map((inv) => (
                    <th key={inv.id}>
                      {inv.id} {inv.psi ? `(${inv.psi.accession})` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const vals = chosen.map((c) => r.getValue(c));
                  const differs = new Set(vals).size > 1;
                  return (
                    <tr key={r.label} className={differs ? 'diff-row' : ''}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.label}</td>
                      {vals.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Max airflow bar comparison */}
          <div className="card">
            <span className="eyebrow">MAXIMUM TESTED AIRFLOW (CM/S)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {chosen.map((inv) => {
                const maxF = Math.max(...inv.conditions.map((c) => c.flow_cm_s));
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="mono" style={{ width: 120, fontSize: 12.5 }}>
                      {inv.id}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 12,
                        background: 'var(--border-subtle)',
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (maxF / 25) * 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--gold), var(--accent-orange))',
                        }}
                      />
                    </div>
                    <span className="mono" style={{ width: 68, textAlign: 'right', fontSize: 12.5 }}>
                      {maxF} cm/s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'variability' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <span className="eyebrow">HOW TESTS DIFFERED WITHIN EACH INVESTIGATION</span>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 12px' }}>
            Within an investigation, hardware and facility are held constant while O₂, pressure,
            airflow, or fuel are varied — making within-study trends trustworthy even when cross-rig
            comparisons require care.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Conditions</th>
                <th>O₂ Range (%)</th>
                <th>Pressure Range (psi)</th>
                <th>Airflow Range (cm/s)</th>
                <th>Held Constant (Hardware)</th>
              </tr>
            </thead>
            <tbody>
              {INVESTIGATIONS.map((inv) => {
                const o2s = inv.conditions.map((c) => c.o2_pct);
                const ps = inv.conditions.map((c) => c.pressure_psi);
                const fs = inv.conditions.map((c) => c.flow_cm_s);
                const fmt = (arr: number[]) => {
                  const lo = Math.min(...arr);
                  const hi = Math.max(...arr);
                  return lo === hi ? `${lo}` : `${lo} – ${hi}`;
                };
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.id}</td>
                    <td className="mono">{inv.conditions.length}</td>
                    <td className="mono">{fmt(o2s)}</td>
                    <td className="mono">{fmt(ps)}</td>
                    <td className="mono">{fmt(fs)}</td>
                    <td style={{ color: 'var(--muted)' }}>{inv.hardware}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'graph' && (
        <div className="grid-2">
          <div className="card card-gold">
            <span className="eyebrow">INTERACTIVE RELATIONSHIP NETWORK</span>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '2px 0 8px' }}>
              Click any node. Gold lines = shared hardware (directly comparable); blue = shared
              facility; dashed = shared fuel.
            </p>
            <svg viewBox="0 0 680 400" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {graph.edges.map((e, idx) => {
                const p1 = nodePositions.get(e.source);
                const p2 = nodePositions.get(e.target);
                if (!p1 || !p2) return null;
                const isFocus = e.source === focusedNode || e.target === focusedNode;
                return (
                  <line
                    key={idx}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={
                      e.kind === 'hardware'
                        ? 'var(--gold)'
                        : e.kind === 'facility'
                        ? 'var(--accent-blue)'
                        : 'var(--muted)'
                    }
                    strokeDasharray={e.kind === 'fuel' ? '3 3' : undefined}
                    strokeOpacity={isFocus ? 0.9 : 0.14}
                    strokeWidth={isFocus ? 2 : 1}
                  />
                );
              })}

              {graph.nodes.map((n) => {
                const pos = nodePositions.get(n.id);
                if (!pos) return null;
                const isSel = n.id === focusedNode;
                return (
                  <g
                    key={n.id}
                    onClick={() => setFocusedNode(n.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSel ? 13 : 8}
                      fill={isSel ? 'var(--gold)' : 'var(--card-solid)'}
                      stroke="var(--gold)"
                      strokeWidth={isSel ? 2.5 : 1.5}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 21}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill={isSel ? 'var(--gold)' : 'var(--text)'}
                      fontWeight={isSel ? '700' : '500'}
                    >
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="card">
            <span className="eyebrow">SELECTED NODE COMPARABILITY</span>
            <h3 style={{ margin: '4px 0', fontSize: 20 }}>
              {activeNode.id} — {activeNode.name}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
              Hardware: <strong style={{ color: 'var(--text)' }}>{activeNode.hardware}</strong> ·{' '}
              Facility: <strong style={{ color: 'var(--text)' }}>{activeNode.facility}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeEdges.map((e, i) => {
                const peer = e.source === activeNode.id ? e.target : e.source;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'var(--pill-bg)',
                      fontSize: 12.5,
                    }}
                  >
                    <button
                      onClick={() => setFocusedNode(peer)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gold)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {peer}
                    </button>
                    <span
                      className={`badge ${
                        e.kind === 'hardware'
                          ? 'badge-gold'
                          : e.kind === 'facility'
                          ? 'badge-blue'
                          : ''
                      }`}
                    >
                      {e.kind}: {e.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'query' && (
        <div className="card">
          <div className="grid-4" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12 }}>
              Fuel contains
              <input
                className="text-input"
                style={{ width: '100%', marginTop: 4 }}
                value={fuelQ}
                onChange={(e) => setFuelQ(e.target.value)}
                placeholder="PMMA, SIBAL, heptane..."
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Min O₂ ({o2Min}%)
              <input
                type="range"
                min={15}
                max={85}
                value={o2Min}
                onChange={(e) => setO2Min(parseInt(e.target.value, 10))}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Max Airflow ({flowMax} cm/s)
              <input
                type="range"
                min={0}
                max={30}
                value={flowMax}
                onChange={(e) => setFlowMax(parseInt(e.target.value, 10))}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Phase
              <select
                className="select-input"
                style={{ width: '100%', marginTop: 4 }}
                value={phaseQ}
                onChange={(e) => setPhaseQ(e.target.value)}
              >
                <option value="">Any phase</option>
                <option value="solid">Solid</option>
                <option value="liquid">Liquid</option>
                <option value="gas">Gas</option>
              </select>
            </label>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
            Query: <span className="mono">{queryOut.interpretation}</span> —{' '}
            <strong>{queryOut.rows.length}</strong> matching test condition(s)
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Condition</th>
                  <th>O₂</th>
                  <th>Pressure</th>
                  <th>Airflow</th>
                  <th>Hardware</th>
                </tr>
              </thead>
              <tbody>
                {queryOut.rows.map((row, idx) => (
                  <tr key={`${row.investigation.id}-${idx}`}>
                    <td style={{ fontWeight: 600 }}>{row.investigation.id}</td>
                    <td>{row.condition.label}</td>
                    <td className="mono">{row.condition.o2_pct}%</td>
                    <td className="mono">{row.condition.pressure_psi} psi</td>
                    <td className="mono">{row.condition.flow_cm_s} cm/s</td>
                    <td style={{ color: 'var(--muted)' }}>{row.investigation.hardware}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
