export default function Logo({ size = 26 }: { size?: number }) {
  const r = 5;
  const g = 2; // gap
  const c = (size - g) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect x="0" y="0" width={c} height={c} rx={r} fill="#2f6bff" />
      <rect x={c + g} y="0" width={c} height={c} rx={r} fill="#ff5a5f" />
      <rect x="0" y={c + g} width={c} height={c} rx={r} fill="#ffb020" />
      <rect x={c + g} y={c + g} width={c} height={c} rx={r} fill="#21c17a" />
    </svg>
  );
}
