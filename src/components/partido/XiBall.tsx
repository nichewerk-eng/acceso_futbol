'use client';

export type XiSpot = { x: number; y: number };

export function passDuration(from: XiSpot | undefined, to: XiSpot): number {
  if (!from) return 0;
  const d = Math.hypot(from.x - to.x, from.y - to.y);
  return Math.round(280 + d * 5);
}

export function XiBall({
  pin,
  passMs,
  passKey,
}: {
  pin: XiSpot;
  passMs: number;
  passKey: number;
}) {
  return (
    <span
      className="xi-ball"
      aria-hidden
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        ['--xi-pass-ms' as string]: `${passMs}ms`,
      }}
    >
      <span key={passKey} className={passKey > 0 ? 'xi-ball-fly' : undefined}>
        <span className="xi-ball-sprite">
          <i />
        </span>
      </span>
    </span>
  );
}
