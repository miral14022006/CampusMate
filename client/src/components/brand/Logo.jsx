// client/src/components/brand/Logo.jsx
import LogoMark from './LogoMark';

const SIZES = {
  xs: 22,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64
};

function resolveSize(size) {
  return typeof size === 'number' ? size : SIZES[size] || SIZES.md;
}

/**
 * CampusMate brand logo.
 * variant: "mark" (monogram mark only) | "full" (mark + wordmark)
 * size: xs | sm | md | lg | xl | number (px)
 * oneColor: boolean (renders in single color instead of copper gradient)
 */
export function Logo({
  variant = 'full',
  size = 'md',
  className = '',
  oneColor = false,
  color = '#FFF7F1',
  animate = true,
  subtitle
}) {
  const px = resolveSize(size);
  const wordmark = Math.round(px * 0.52);

  const mark = (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[26%] bg-surface-2 p-[2px] shadow-soft"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <LogoMark
        size={Math.round(px * 0.88)}
        oneColor={oneColor}
        color={color}
        animate={animate}
      />
    </span>
  );

  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center ${className}`} role="img" aria-label="CampusMate">
        {mark}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="flex flex-col leading-none">
        <span
          className="font-semibold tracking-[-0.03em] text-ink"
          style={{ fontSize: wordmark, lineHeight: 1.05 }}
        >
          CampusMate
        </span>
        {subtitle ? (
          <span className="mt-1 text-[11px] font-medium text-ink-muted">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}

export default Logo;
