// client/src/components/brand/LogoMark.jsx
import { useId } from 'react';

/**
 * Original CampusMate Monogram "C" Mark:
 * - Monogram "C" made of three concentric open arcs (round caps, copper gradient).
 * - Small filled core dot at the center.
 * - Arcs draw in on load (stroke-dashoffset 900ms, once).
 * - Crisp rendering at 16, 32, 64, 256px.
 * - Supports oneColor variant (e.g. solid white or currentColor) and default copper gradient.
 */
export function LogoMark({
  size = 36,
  className = '',
  oneColor = false,
  color = '#FFF7F1',
  animate = true
}) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `cm-mark-grad-${uid}`;

  // Radii for three concentric arcs
  // Arc lengths for sweep 264 deg (from 48 deg to 312 deg):
  // r=15.5 -> len ~ 71.42
  // r=11.0 -> len ~ 50.68
  // r=6.5  -> len ~ 29.95
  // Core dot r=2.2 at center (24, 24)

  const strokeTarget = oneColor ? color : `url(#${gradientId})`;
  const fillTarget = oneColor ? color : `url(#${gradientId})`;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CampusMate Logo Mark"
      focusable="false"
      style={{ shapeRendering: 'geometricPrecision' }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="6"
          y1="6"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E59368" />
          <stop offset="50%" stopColor="#D4673F" />
          <stop offset="100%" stopColor="#B9482F" />
        </linearGradient>

        {animate ? (
          <style>{`
            @keyframes cmArcDrawIn {
              from { stroke-dashoffset: var(--cm-len); }
              to { stroke-dashoffset: 0; }
            }
            @media (prefers-reduced-motion: no-preference) {
              .cm-arc-outer {
                --cm-len: 72;
                stroke-dasharray: 72;
                stroke-dashoffset: 72;
                animation: cmArcDrawIn 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
              }
              .cm-arc-mid {
                --cm-len: 51;
                stroke-dasharray: 51;
                stroke-dashoffset: 51;
                animation: cmArcDrawIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 90ms forwards;
              }
              .cm-arc-inner {
                --cm-len: 30;
                stroke-dasharray: 30;
                stroke-dashoffset: 30;
                animation: cmArcDrawIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 180ms forwards;
              }
              .cm-dot-core {
                animation: cmDotPop 600ms cubic-bezier(0.22, 1, 0.36, 1) 280ms backwards;
              }
            }
            @keyframes cmDotPop {
              from { transform: scale(0); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        ) : null}
      </defs>

      {/* Outer concentric arc (r=15.5) */}
      <path
        d="M 34.37 35.52 A 15.5 15.5 0 1 1 34.37 12.48"
        stroke={strokeTarget}
        strokeWidth="3.2"
        strokeLinecap="round"
        className={animate ? 'cm-arc-outer' : undefined}
      />

      {/* Middle concentric arc (r=11.0) */}
      <path
        d="M 31.36 32.17 A 11 11 0 1 1 31.36 15.83"
        stroke={strokeTarget}
        strokeWidth="2.8"
        strokeLinecap="round"
        className={animate ? 'cm-arc-mid' : undefined}
      />

      {/* Inner concentric arc (r=6.5) */}
      <path
        d="M 28.35 28.83 A 6.5 6.5 0 1 1 28.35 19.17"
        stroke={strokeTarget}
        strokeWidth="2.4"
        strokeLinecap="round"
        className={animate ? 'cm-arc-inner' : undefined}
      />

      {/* Core filled center dot at (24, 24) */}
      <circle
        cx="24"
        cy="24"
        r="2.2"
        fill={fillTarget}
        className={animate ? 'cm-dot-core' : undefined}
        style={{ transformOrigin: '24px 24px' }}
      />
    </svg>
  );
}

export default LogoMark;
