import { BandPoint } from '../engine/physics';

interface MonteCarloChartProps {
  band: BandPoint[];
  activeGravity: number;
}

export function MonteCarloChart({ band, activeGravity }: MonteCarloChartProps) {
  const w = 680;
  const h = 290;
  const padL = 54;
  const padR = 24;
  const padT = 26;
  const padB = 42;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxY = Math.max(2.5, ...band.map((b) => b.p90)) * 1.08;
  const xOf = (g: number) => padL + g * plotW;
  const yOf = (val: number) => padT + plotH - (val / maxY) * plotH;

  const upper = band.map((b) => `${xOf(b.gravity_g).toFixed(1)},${yOf(b.p90).toFixed(1)}`).join(' ');
  const lower = [...band]
    .reverse()
    .map((b) => `${xOf(b.gravity_g).toFixed(1)},${yOf(b.p10).toFixed(1)}`)
    .join(' ');
  const polyPoints = `${upper} ${lower}`;
  const medianPoints = band
    .map((b) => `${xOf(b.gravity_g).toFixed(1)},${yOf(b.median).toFixed(1)}`)
    .join(' ');

  const markers = [
    { g: 0.16, label: 'Moon (0.16 g)', color: '#5fa3ff' },
    { g: 0.38, label: 'Mars (0.38 g)', color: '#ff7a1a' },
    { g: activeGravity, label: `Active (${activeGravity.toFixed(2)} g)`, color: '#dfc07c' },
  ];

  const yTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].filter((v) => v <= maxY);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Empirical data gap shading (0.02g .. 0.98g) */}
      <rect
        x={xOf(0.02)}
        y={padT}
        width={xOf(0.98) - xOf(0.02)}
        height={plotH}
        fill="rgba(242, 92, 84, 0.06)"
      />
      <text
        x={xOf(0.5)}
        y={padT + 18}
        textAnchor="middle"
        fontSize="11"
        fill="var(--accent-red)"
        fontWeight="600"
      >
        NO EMPIRICAL PSI DATA IN THIS REGION (LUCI / FM2 NOT FLOWN)
      </text>

      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={padL}
            y1={yOf(v)}
            x2={w - padR}
            y2={yOf(v)}
            stroke="var(--border-subtle)"
            strokeDasharray="3 3"
          />
          <text
            x={padL - 8}
            y={yOf(v) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted)"
            fontFamily="JetBrains Mono, monospace"
          >
            {v.toFixed(1)}×
          </text>
        </g>
      ))}

      {[0, 0.16, 0.38, 0.5, 0.75, 1.0].map((g) => (
        <text
          key={g}
          x={xOf(g)}
          y={h - 14}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted)"
          fontFamily="JetBrains Mono, monospace"
        >
          {g}g
        </text>
      ))}

      {/* 10-90% uncertainty band */}
      <polygon points={polyPoints} fill="rgba(223, 192, 124, 0.22)" />

      {/* Median curve */}
      <polyline
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        points={medianPoints}
      />

      {/* Vertical regime markers */}
      {markers.map((m, idx) => (
        <g key={`${m.label}-${idx}`}>
          <line
            x1={xOf(m.g)}
            y1={padT}
            x2={xOf(m.g)}
            y2={padT + plotH}
            stroke={m.color}
            strokeWidth={idx === 2 ? 2 : 1.4}
            strokeDasharray={idx === 2 ? undefined : '4 4'}
          />
          <text
            x={Math.min(w - 50, Math.max(padL + 38, xOf(m.g)))}
            y={padT + plotH - 8 - idx * 14}
            textAnchor="middle"
            fontSize="10.5"
            fill={m.color}
            fontWeight="600"
          >
            {m.label}
          </text>
        </g>
      ))}

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border-subtle)" />
      <line
        x1={padL}
        y1={padT + plotH}
        x2={w - padR}
        y2={padT + plotH}
        stroke="var(--border-subtle)"
      />
    </svg>
  );
}
