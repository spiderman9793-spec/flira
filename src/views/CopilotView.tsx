import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { CopilotAnswer, askCopilot } from '../engine/copilot';
import { Environment } from '../engine/physics';
import { Chunk, buildKnowledgeIndex } from '../engine/retrieval';

interface CopilotViewProps {
  env: Environment;
  extraChunks?: Chunk[];
}

interface Turn {
  question: string;
  answer: CopilotAnswer;
}

const SUGGESTIONS = [
  'What does NASA actually observe about oxygen and SAFFIRE-I?',
  'Is there any partial-gravity combustion data in PSI for lunar 0.16g?',
  'How do ACME E-FIELD Flames help mimic partial gravity?',
  'Show me every solid-fuel test with PMMA at 20 cm/s',
  'What did SAME find about smoke particle size in microgravity?',
];

const ENV_GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ?? '';
const ENV_OPENROUTER_KEY =
  (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)?.trim() ?? '';

export function CopilotView({ env, extraChunks = [] }: CopilotViewProps) {
  const index = useMemo(() => buildKnowledgeIndex(extraChunks), [extraChunks]);
  const [question, setQuestion] = useState(SUGGESTIONS[0]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<'openrouter' | 'gemini' | 'local_model'>(
    ENV_OPENROUTER_KEY ? 'openrouter' : 'gemini'
  );
  const [cloudEnabled, setCloudEnabled] = useState(
    Boolean(ENV_OPENROUTER_KEY || ENV_GEMINI_KEY)
  );
  const [apiKey, setApiKey] = useState(ENV_GEMINI_KEY);
  const [openrouterKey, setOpenrouterKey] = useState(ENV_OPENROUTER_KEY);
  const [localModelUrl, setLocalModelUrl] = useState('http://localhost:11434/v1');
  const [localModelName, setLocalModelName] = useState('llama3');
  const [openAuditIdx, setOpenAuditIdx] = useState<number | null>(0);

  const runQuery = async (qOverride?: string) => {
    const q = (qOverride ?? question).trim();
    if (!q || busy) return;
    setQuestion(q);
    setBusy(true);
    try {
      const history = turns.slice(0, 4).map((t) => ({
        question: t.question,
        matchedIds: t.answer.matchedInvestigations.map((m) => m.id),
      }));
      const answer = await askCopilot(q, index, env, {
        cloudEnabled: cloudEnabled || provider === 'local_model',
        provider,
        apiKey,
        openrouterKey,
        localModelUrl,
        localModelName,
        history,
      });
      setTurns((prev) => [{ question: q, answer }, ...prev]);
      setOpenAuditIdx(0);
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = () => {
    const lines = [
      '# FLIRA Grounded NASA PSI Co-Pilot Report',
      `Active Habitat: ${env.gravity_g.toFixed(2)} g | ${env.pressure_psi.toFixed(1)} psi | ${env.o2_pct.toFixed(0)}% O2 | ${env.flow_cm_s.toFixed(0)} cm/s`,
      '',
      ...turns.flatMap((t, idx) => [
        `## Q${turns.length - idx}: ${t.question}`,
        `**Mode:** ${t.answer.badge}`,
        '',
        t.answer.text,
        '',
        '### Preserved Evidence',
        ...t.answer.evidenceLines.map((e) => `- **${e.label}** [${e.tag}]: ${e.value}`),
        '',
      ]),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flira_grounded_report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <p className="eyebrow">FLIRA AI · SOURCE FIREWALL</p>
          <h2 className="serif-title page-title">Grounded NASA PSI Intelligence</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-green">
              <ShieldCheck size={12} /> NASA SOURCE FIREWALL · LOCAL EVIDENCE READY
            </span>
            <span className="badge">BM25 + TF-IDF + RRF · {index.chunks.length} chunks</span>
            {turns.length > 0 && (
              <span className="badge badge-gold">{turns.length} remembered turn(s)</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            className={`btn-ghost ${cloudEnabled ? 'active' : ''}`}
            onClick={() => setCloudEnabled((v) => !v)}
          >
            {cloudEnabled
              ? `Cloud AI (${provider === 'openrouter' ? 'OpenRouter Free' : 'Gemini'})`
              : 'Enable Cloud AI'}
          </button>
          {turns.length > 0 && (
            <>
              <button className="btn-ghost" onClick={downloadReport}>
                <Download size={13} /> Export Report
              </button>
              <button className="btn-ghost" onClick={() => setTurns([])}>
                <RotateCcw size={13} /> Clear memory
              </button>
            </>
          )}
        </div>
      </div>

      {cloudEnabled && (
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>PROVIDER:</span>
            <button
              className={`btn-ghost ${provider === 'openrouter' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setProvider('openrouter')}
            >
              OpenRouter (Free)
            </button>
            <button
              className={`btn-ghost ${provider === 'gemini' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setProvider('gemini')}
            >
              Gemini
            </button>
            <button
              className={`btn-ghost ${provider === 'local_model' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setProvider('local_model')}
            >
              Local Pretrained (Ollama / OpenWebUI)
            </button>
          </div>
          {provider === 'local_model' ? (
            <div className="grid-2" style={{ gap: 10 }}>
              <label style={{ fontSize: 12.5 }}>
                Local OpenAI-Compatible API Endpoint:
                <input
                  type="text"
                  className="text-input"
                  style={{ width: '100%', marginTop: 6 }}
                  value={localModelUrl}
                  onChange={(e) => setLocalModelUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />
              </label>
              <label style={{ fontSize: 12.5 }}>
                Local Model Name:
                <input
                  type="text"
                  className="text-input"
                  style={{ width: '100%', marginTop: 6 }}
                  value={localModelName}
                  onChange={(e) => setLocalModelName(e.target.value)}
                  placeholder="llama3 or mistral or qwen2.5"
                />
              </label>
            </div>
          ) : provider === 'openrouter' ? (
            <label style={{ fontSize: 12.5, display: 'block' }}>
              OpenRouter API Key{' '}
              {ENV_OPENROUTER_KEY
                ? '(loaded from .env.local — routes via openrouter/free + citation firewall)'
                : '(kept in browser memory only)'}
              :
              <input
                type="password"
                className="text-input"
                style={{ width: '100%', marginTop: 6 }}
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
            </label>
          ) : (
            <label style={{ fontSize: 12.5, display: 'block' }}>
              Gemini API Key{' '}
              {ENV_GEMINI_KEY
                ? '(loaded from .env.local — all answers pass the citation firewall)'
                : '(kept in browser memory only)'}
              :
              <input
                type="password"
                className="text-input"
                style={{ width: '100%', marginTop: 6 }}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza... or AQ..."
              />
            </label>
          )}
        </div>
      )}

      {/* Prompt input */}
      <div className="card card-gold" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="text-input"
            style={{ flex: 1 }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            placeholder="Ask a NASA microgravity combustion question..."
          />
          <button className="btn-primary" onClick={() => runQuery()} disabled={busy}>
            <Send size={14} /> {busy ? 'Retrieving...' : 'Ask'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="btn-ghost"
              style={{ fontSize: 12, padding: '5px 10px' }}
              onClick={() => runQuery(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Answers */}
      {turns.map((turn, idx) => {
        const a = turn.answer;
        const auditOpen = openAuditIdx === idx;
        return (
          <article key={`${turn.question}-${idx}`} className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <strong style={{ fontSize: 15, color: 'var(--gold)' }}>{turn.question}</strong>
              <span className={`badge ${a.mode !== 'local' ? 'badge-green' : 'badge-gold'}`}>
                {a.badge}
              </span>
            </div>

            <div style={{ whiteSpace: 'pre-line', fontSize: 14, marginBottom: 14 }}>{a.text}</div>

            {/* Verbatim Reported Values / Unknown tags */}
            {a.evidenceLines.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--bg-elev)',
                  marginBottom: 14,
                }}
              >
                <span className="eyebrow">PRESERVED EVIDENCE &amp; GAPS</span>
                {a.evidenceLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 12.5,
                    }}
                  >
                    <span>
                      <strong className="mono">{line.label}:</strong> {line.value}
                    </span>
                    <span
                      className={`badge ${
                        line.tag === 'UNKNOWN' ? 'badge-red' : 'badge-green'
                      }`}
                    >
                      {line.tag}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {a.unknownNotice && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(242, 92, 84, 0.4)',
                  background: 'rgba(242, 92, 84, 0.08)',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                <strong style={{ color: 'var(--accent-red)' }}>
                  UNKNOWN · not established by the loaded evidence:
                </strong>{' '}
                {a.unknownNotice}
              </div>
            )}

            {/* PSI / DOI Source Cards */}
            {a.matchedInvestigations.length > 0 && (
              <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                {a.matchedInvestigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="card"
                    style={{ padding: 12, boxShadow: 'none', background: 'var(--pill-bg)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <strong style={{ fontSize: 13 }}>
                        {inv.psi?.accession ?? inv.id} · {inv.name}
                      </strong>
                    </div>
                    {inv.psi?.doi && (
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--gold)', marginTop: 3 }}>
                        DOI: {inv.psi.doi}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {inv.psi && (
                        <a
                          href={inv.psi.psi_url}
                          target="_blank"
                          rel="noreferrer"
                          className="pill-btn"
                          style={{ textDecoration: 'none', fontSize: 11 }}
                        >
                          PSI Record <ExternalLink size={11} />
                        </a>
                      )}
                      {inv.psi?.doi_url && (
                        <a
                          href={inv.psi.doi_url}
                          target="_blank"
                          rel="noreferrer"
                          className="pill-btn"
                          style={{ textDecoration: 'none', fontSize: 11 }}
                        >
                          DOI Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audit Trail */}
            <div>
              <button
                className="btn-ghost"
                style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={() => setOpenAuditIdx(auditOpen ? null : idx)}
              >
                {auditOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Audit trail (
                {a.auditTrail.length} steps)
              </button>
              {auditOpen && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--bg-elev)',
                    fontSize: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {a.auditTrail.map((s, i) => (
                    <div key={i} className="mono">
                      <span style={{ color: 'var(--gold)' }}>{i + 1}. {s.step}:</span>{' '}
                      <span style={{ color: 'var(--muted)' }}>{s.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
