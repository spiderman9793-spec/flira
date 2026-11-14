import { ChangeEvent, useMemo, useState } from 'react';
import { Database, Download, ExternalLink, FileSpreadsheet, Globe, ShieldAlert, Table2, Upload, FileCode, Check } from 'lucide-react';
import { PSI_RUNS } from '../engine/psiRuns';
import { Chunk } from '../engine/retrieval';
import { BASIS_LABEL, INVESTIGATIONS, PSI_REGISTRY, UPCOMING } from '../engine/schema';

interface SourcesViewProps {
  extraChunks: Chunk[];
  onAddChunks: (chunks: Chunk[]) => void;
}

export function SourcesView({ extraChunks, onAddChunks }: SourcesViewProps) {
  const [tab, setTab] = useState<'psi' | 'runs' | 'earth' | 'method' | 'notion'>('psi');
  const [search, setSearch] = useState('');
  const [selectedTableName, setSelectedTableName] = useState(
    PSI_RUNS.tables.find((t) => t.accession === 'PSI-98')?.file_name ?? PSI_RUNS.tables[0].file_name
  );
  const [runFilter, setRunFilter] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const filteredPsi = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PSI_REGISTRY.investigations;
    return PSI_REGISTRY.investigations.filter(
      (r) =>
        r.accession.toLowerCase().includes(q) ||
        r.acronym.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.sub_research_area.toLowerCase().includes(q)
    );
  }, [search]);

  const activeTable = useMemo(
    () =>
      PSI_RUNS.tables.find((t) => t.file_name === selectedTableName) ?? PSI_RUNS.tables[0],
    [selectedTableName]
  );

  const filteredRows = useMemo(() => {
    const q = runFilter.trim().toLowerCase();
    const base = q
      ? activeTable.rows.filter((r) =>
          Object.values(r).some((v) => v.toLowerCase().includes(q))
        )
      : activeTable.rows;
    return base.slice(0, 60);
  }, [activeTable, runFilter]);

  const exportCatalogueJson = () => {
    const blob = new Blob([JSON.stringify(INVESTIGATIONS, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flira_investigations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportActiveTableCsv = () => {
    const header = activeTable.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
    const body = activeTable.rows.map((r) =>
      activeTable.columns
        .map((c) => `"${(r[c] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTable.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const paragraphs = text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25);
    const lines = paragraphs.length
      ? paragraphs
      : text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 20);

    const newChunks: Chunk[] = lines.slice(0, 80).map((chunkText, i) => ({
      id: `custom:${file.name.replace(/[^a-z0-9]/gi, '_')}_${i + 1}`,
      text: chunkText,
      source: file.name,
      page: i + 1,
      kind: 'uploaded',
    }));

    if (!newChunks.length) {
      setUploadStatus(`No indexable text chunks found in ${file.name}.`);
      return;
    }
    onAddChunks(newChunks);
    setUploadStatus(
      `Indexed ${newChunks.length} chunk(s) from ${file.name} into FLIRA Co-Pilot.`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p className="eyebrow">DATA PROVENANCE · PER-RUN PSI TABLES · EARTH SPIN-OFFS</p>
        <h2 className="serif-title page-title">
          NASA PSI Records, Experimental Runs, Earth Impact &amp; Method
        </h2>
        <p className="lead">
          Full transparency across all {PSI_REGISTRY.combustion_investigations} Combustion Science
          records and {PSI_RUNS.total_run_rows.toLocaleString()} official per-run rows from NASA
          Physical Sciences Informatics, plus Earth spin-offs and limitations.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          className={`btn-ghost ${tab === 'psi' ? 'active' : ''}`}
          onClick={() => setTab('psi')}
        >
          <Database size={14} /> PSI Registry ({PSI_REGISTRY.combustion_investigations})
        </button>
        <button
          className={`btn-ghost ${tab === 'runs' ? 'active' : ''}`}
          onClick={() => setTab('runs')}
        >
          <Table2 size={14} /> Per-Run Tables ({PSI_RUNS.total_run_rows.toLocaleString()} rows)
        </button>
        <button
          className={`btn-ghost ${tab === 'earth' ? 'active' : ''}`}
          onClick={() => setTab('earth')}
        >
          <Globe size={14} /> Earth Add-On ({INVESTIGATIONS.length})
        </button>
        <button
          className={`btn-ghost ${tab === 'method' ? 'active' : ''}`}
          onClick={() => setTab('method')}
        >
          <ShieldAlert size={14} /> Method, Upload &amp; Limitations
        </button>
        <button
          className={`btn-ghost ${tab === 'notion' ? 'active' : ''}`}
          onClick={() => setTab('notion')}
        >
          <FileSpreadsheet size={14} /> Notion Relational Export
        </button>
        <button className="btn-ghost" onClick={exportCatalogueJson} style={{ marginLeft: 'auto' }}>
          <Download size={14} /> Export JSON
        </button>
      </div>

      {tab === 'psi' && (
        <>
          <div
            className="card"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13 }}>
              Snapshot <span className="mono">{PSI_REGISTRY.snapshot_date}</span> ·{' '}
              <strong>{PSI_REGISTRY.total_files.toLocaleString()}</strong> archive files ·{' '}
              <strong>{PSI_REGISTRY.experimental_table_count}</strong> summary tables ·{' '}
              <strong>{PSI_REGISTRY.registered_total_gb.toLocaleString()} GB</strong> registered
            </div>
            <input
              className="text-input"
              style={{ minWidth: 240 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter PSI-98, ACME, SAFFIRE, cool flame..."
            />
          </div>

          <div className="grid-2">
            {filteredPsi.map((rec) => (
              <article key={rec.accession} className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span className="mono badge badge-gold">{rec.accession}</span>
                  <span
                    className={`badge ${
                      rec.archive_status === 'available' ? 'badge-green' : 'badge-orange'
                    }`}
                  >
                    {rec.archive_status === 'available'
                      ? `${rec.file_count} files`
                      : 'experimentalTable only'}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0', fontSize: 16 }}>
                  {rec.acronym ? `${rec.acronym} — ` : ''}
                  {rec.title}
                </h3>
                <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--muted)' }}>
                  {rec.sub_research_area} · {rec.start_date} → {rec.end_date}
                </p>
                {rec.research_impacts && (
                  <p style={{ margin: '0 0 10px', fontSize: 12.5 }}>
                    {rec.research_impacts.slice(0, 200)}
                    {rec.research_impacts.length > 200 ? '…' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <a
                    href={rec.psi_url}
                    target="_blank"
                    rel="noreferrer"
                    className="pill-btn"
                    style={{ textDecoration: 'none', fontSize: 11.5 }}
                  >
                    PSI Portal <ExternalLink size={11} />
                  </a>
                  {rec.doi_url && (
                    <a
                      href={rec.doi_url}
                      target="_blank"
                      rel="noreferrer"
                      className="pill-btn"
                      style={{ textDecoration: 'none', fontSize: 11.5 }}
                    >
                      DOI: {rec.doi} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'runs' && (
        <div className="card">
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
            <select
              className="select-input"
              value={selectedTableName}
              onChange={(e) => {
                setSelectedTableName(e.target.value);
                setRunFilter('');
              }}
            >
              {PSI_RUNS.tables.map((t) => (
                <option key={t.file_name} value={t.file_name}>
                  {t.accession} · {t.file_name} ({t.row_count} rows)
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="text-input"
                value={runFilter}
                onChange={(e) => setRunFilter(e.target.value)}
                placeholder="Search verbatim rows..."
              />
              <button className="btn-ghost" onClick={exportActiveTableCsv}>
                <Download size={13} /> CSV
              </button>
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
            Verbatim NASA PSI table (<span className="mono">{activeTable.row_count}</span> data
            rows, showing up to 60; sentinels like <code>-</code>, <code>#DIV/0!</code>, and{' '}
            <code>~ 21.5</code> are preserved untouched).
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {activeTable.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx}>
                    {activeTable.columns.map((col) => (
                      <td key={col} className="mono" style={{ fontSize: 12 }}>
                        {row[col] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'earth' && (
        <div className="grid-2">
          {INVESTIGATIONS.map((inv) => (
            <article key={inv.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 15, color: 'var(--gold)' }}>{inv.id}</strong>
                <span className="badge">{inv.pillars.join(' · ')}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{inv.name}</div>
              <p style={{ fontSize: 13, margin: '8px 0', color: 'var(--text)' }}>
                {inv.earth_spinoff}
              </p>
              <p style={{ fontSize: 12, margin: 0, color: 'var(--muted)' }}>
                Microgravity insight: {inv.finding}
              </p>
            </article>
          ))}
        </div>
      )}

      {tab === 'method' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Client-side evidence ingestion */}
          <div className="card card-gold">
            <span className="eyebrow">EXTEND THE CORPUS (CLIENT-SIDE INGESTION)</span>
            <h3 style={{ margin: '4px 0 6px', fontSize: 18 }}>
              Upload Additional NASA Notes / CSV / Text into FLIRA Co-Pilot
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
              Upload a <code>.txt</code>, <code>.md</code>, <code>.csv</code>, or <code>.json</code>{' '}
              excerpt (stored in browser memory only). Chunks become immediately citable in FLIRA AI.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label className="btn-ghost" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Choose File
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span className="badge badge-gold">
                Custom chunks loaded: {extraChunks.length}
              </span>
              {uploadStatus && (
                <span style={{ fontSize: 12.5, color: 'var(--accent-green)' }}>
                  {uploadStatus}
                </span>
              )}
            </div>
          </div>

          <div className="card">
            <span className="eyebrow">WHAT THIS DASHBOARD CANNOT DO (EXPLICIT LIMITATIONS)</span>
            <ul style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.65, margin: '8px 0 0' }}>
              <li>
                <strong>It cannot predict partial gravity:</strong> No empirical combustion data
                exists at 0.16 g or 0.38 g in NASA PSI. The 0 g–1 g band is model parameter
                uncertainty until LUCI and FM2 fly.
              </li>
              <li>
                <strong>It is not a validated CFD fire solver:</strong> No pyrolysis or DNS
                combustion chemistry — only a dimensionless scaling argument with assumptions shown.
              </li>
              <li>
                <strong>It is not a DCS medical model:</strong> Pre-breathe time is a linearised
                denitrogenation estimate calibrated to ~98 min at sea-level air.
              </li>
              <li>
                <strong>Ranking is not hazard assessment:</strong> A high score means the evidence
                matches your habitat axes, not that the habitat is unsafe.
              </li>
              <li>
                <strong>LOI values are 1 atm, 1 g literature constants:</strong> Pressure adjustment
                uses an assumed exponent inside the Monte Carlo ensemble.
              </li>
            </ul>
          </div>

          <div className="card">
            <span className="eyebrow">SCALING MODEL EQUATIONS</span>
            <pre
              className="mono"
              style={{
                fontSize: 12.5,
                overflowX: 'auto',
                background: 'var(--bg-elev)',
                padding: 14,
                borderRadius: 10,
                margin: '10px 0 0',
              }}
            >
{`u_buoy   = u_ref * sqrt(g) * (P / 14.7)
u_ion    = k_ion * E_kV
u_eff    = sqrt(u_forced^2 + (u_buoy + u_ion)^2)
f_flow   = base + (1 - base) * exp(-ln(u_eff / u_peak)^2 / (2 * w^2))
I_flam   = (O2 / 21)^n_O2 * (P / 14.7)^n_P * f_flow
LOI_eff  = LOI_1atm * (14.7 / P)^k_LOI`}
            </pre>
          </div>

          <div className="card">
            <span className="eyebrow">PROVENANCE BASIS TAGS &amp; UPCOMING LUNAR PAYLOADS</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {Object.entries(BASIS_LABEL).map(([k, label]) => (
                <span key={k} className="badge badge-gold">
                  {k}: {label}
                </span>
              ))}
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              {UPCOMING.map((u) => (
                <div key={u.id} className="card" style={{ padding: 12, boxShadow: 'none' }}>
                  <strong>
                    {u.id} — {u.name}
                  </strong>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                    Target: {u.target_gravity_g} g · Status: {u.status}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>
                    {u.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'notion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
            <span className="eyebrow">TURNKEY NOTION WORKSPACE EXPORT</span>
            <h3 style={{ margin: '6px 0 10px', fontSize: 18 }}>
              Export NASA PSI Relational Databases to Notion
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Convert FLIRA&apos;s multi-tier datasets into fully linked Notion databases with relations,
              rollups, and pre-computed flammability metrics. Download the ready-to-import CSV files below
              or use the schema specifications to create your engineering tracker.
            </p>

            <div className="grid-3" style={{ marginTop: 16 }}>
              <div className="card" style={{ background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={16} style={{ color: 'var(--accent)' }} />
                  <strong style={{ fontSize: 14 }}>1. Investigations Database</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  25 flight and ground investigations with safety pillars, fuels, facilities, hardware, and safety implications.
                </p>
                <a
                  href="/notion_exports/notion_investigations.csv"
                  download="notion_investigations.csv"
                  className="btn"
                  style={{ textDecoration: 'none', textAlign: 'center', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download CSV (25 items)
                </a>
              </div>

              <div className="card" style={{ background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Table2 size={16} style={{ color: 'var(--gold)' }} />
                  <strong style={{ fontSize: 14 }}>2. PSI Registry Database</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  All 24 NASA PSI Combustion Science accessions with DOIs, PIs, run counts (2,009 total), and repository URLs.
                </p>
                <a
                  href="/notion_exports/notion_psi_registry.csv"
                  download="notion_psi_registry.csv"
                  className="btn"
                  style={{ textDecoration: 'none', textAlign: 'center', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download CSV (24 accessions)
                </a>
              </div>

              <div className="card" style={{ background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={16} style={{ color: '#38bdf8' }} />
                  <strong style={{ fontSize: 14 }}>3. Test Conditions Database</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  50 test conditions including Artemis 8.2 psia exploration atmospheres and Lunar/Martian partial-g benchmarks.
                </p>
                <a
                  href="/notion_exports/notion_test_conditions.csv"
                  download="notion_test_conditions.csv"
                  className="btn"
                  style={{ textDecoration: 'none', textAlign: 'center', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download CSV (50 conditions)
                </a>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <span className="eyebrow">NOTION FORMULAS (READY TO COPY)</span>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--fg)' }}>Oxygen Partial Pressure (P_O2 in psia)</strong>
                  <pre className="mono" style={{ fontSize: 12, background: 'var(--bg-elev)', padding: 10, borderRadius: 8, margin: '6px 0 0', overflowX: 'auto' }}>
{`round(prop("Pressure (psia)") * (prop("Oxygen %") / 100) * 100) / 100`}
                  </pre>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--fg)' }}>Artemis Exploration EVA Hazard Flag</strong>
                  <pre className="mono" style={{ fontSize: 12, background: 'var(--bg-elev)', padding: 10, borderRadius: 8, margin: '6px 0 0', overflowX: 'auto' }}>
{`if(prop("Atmosphere Category") == "Exploration EVA (8.2 psia, 34% O2)", "⚠️ High Flammability / Pre-Breathe Mode", if(prop("Oxygen %") > 25, "🔥 Enriched Oxygen Hazard", if(prop("Oxygen %") < 18, "🛡️ Hypoxic Extinction Zone", "✅ Standard Cabin Baseline")))`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="card">
              <span className="eyebrow">RECOMMENDED NOTION VIEWS</span>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>
                  <strong style={{ color: 'var(--fg)' }}>Safety Pillars Board (Kanban):</strong> Group the Investigations table by <code>Pillars</code> (Prevention | Detection | Suppression).
                </li>
                <li>
                  <strong style={{ color: 'var(--fg)' }}>Artemis 8.2 psia Exploration Filter:</strong> Filter the Test Conditions table where <code>Oxygen % &gt; 25%</code> or <code>Pressure &lt; 10 psia</code>.
                </li>
                <li>
                  <strong style={{ color: 'var(--fg)' }}>Partial-G Vacuum Tracker:</strong> Filter records where <code>Gravity (g)</code> is 0.166 (Moon) or 0.38 (Mars) to track upcoming flight validations (LUCI / FM-2).
                </li>
                <li>
                  <strong style={{ color: 'var(--fg)' }}>PSI Accessions Gallery:</strong> Gallery view grouped by <code>Sub Research Area</code> with direct DOI links.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
