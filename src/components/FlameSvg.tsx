import { Morphology } from '../engine/physics';

interface FlameSvgProps {
  gravityG: number;
  o2Pct: number;
  flowCmS: number;
  efieldKv: number;
  morph: Morphology;
  size?: number;
}

export function FlameSvg({
  gravityG,
  o2Pct,
  flowCmS,
  efieldKv,
  morph,
  size = 280,
}: FlameSvgProps) {
  const isMicro = gravityG < 0.08 && flowCmS < 2.0 && efieldKv < 1.0;
  const aspect = morph.aspect_ratio; // 1.0 (sphere) .. 3.5 (teardrop)
  const rxBase = isMicro ? 42 : Math.max(22, 46 - (aspect - 1) * 8);
  const ryBase = Math.min(82, 42 * (1 + (aspect - 1) * 0.42));
  const bright = Math.min(1.25, 0.55 + (o2Pct / 100) * 0.85);
  const tiltX = Math.min(26, flowCmS * 0.45);
  const cyOuter = 175 - ryBase * 0.72;
  const cyInner = 180 - ryBase * 0.52;

  const isBlue = morph.colour === '#4C8DFF';
  const isIon = morph.colour === '#8FA6C4';
  const c0 = isBlue ? '#dff0ff' : isIon ? '#e7f0ff' : '#fff6d1';
  const c1 = isBlue ? '#4C8DFF' : isIon ? '#8FA6C4' : '#ff9d2e';
  const c2 = isBlue ? '#1d4ed8' : isIon ? '#475569' : '#e63b12';

  const gradId = `flameGrad-${isBlue ? 'b' : isIon ? 'i' : 'o'}`;
  const speed = gravityG > 0.3 ? '0.95s' : '2.6s';

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.15}
      style={{
        ['--flame-speed' as string]: speed,
        filter: `drop-shadow(0 0 26px ${isBlue ? 'rgba(76,141,255,0.55)' : 'rgba(255,138,36,0.5)'})`,
      }}
      role="img"
      aria-label={`Conceptual flame visualization: ${morph.regime}`}
    >
      <defs>
        <filter id="flameBlur">
          <feGaussianBlur stdDeviation="5.5" />
        </filter>
        <radialGradient id={gradId} cx="50%" cy="58%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="52%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Airflow arrows when forced flow > 0 */}
      {flowCmS > 0.5 && (
        <g opacity="0.45" stroke="currentColor" strokeWidth="1.2" fill="none">
          <line x1="18" y1="120" x2="48" y2="120" />
          <polyline points="43,116 49,120 43,124" />
          <line x1="18" y1="150" x2="54" y2="150" />
          <polyline points="49,146 55,150 49,154" />
        </g>
      )}

      {/* E-field mesh hint */}
      {efieldKv > 0.5 && (
        <g opacity="0.55" stroke="#8FA6C4" strokeDasharray="3 3" strokeWidth="1.2">
          <line x1="40" y1="55" x2="160" y2="55" />
          <line x1="40" y1="195" x2="160" y2="195" />
        </g>
      )}

      <g className="flame-core">
        <ellipse
          cx={100 + tiltX * 0.5}
          cy={cyOuter}
          rx={rxBase * bright}
          ry={ryBase * bright}
          fill={`url(#${gradId})`}
          filter="url(#flameBlur)"
          opacity="0.9"
        />
        <ellipse
          cx={100 + tiltX * 0.35}
          cy={cyInner}
          rx={rxBase * 0.56 * bright}
          ry={ryBase * 0.62 * bright}
          fill={`url(#${gradId})`}
        />
      </g>

      {/* Burner / wick */}
      <rect x="92" y="190" width="16" height="34" rx="4" fill="#3b4963" />
      <rect x="82" y="220" width="36" height="6" rx="3" fill="#232d40" />
    </svg>
  );
}
