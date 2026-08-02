import Link from 'next/link';
import { slot as getSlot, type RitualSlot as Slot } from '@/config/ritualInventory';

export function RitualSlot({
  placement,
  compact = false,
}: {
  placement: Slot['placement'];
  compact?: boolean;
}) {
  const s = getSlot(placement);
  if (!s) return null;

  const inner = (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        {s.sponsor ? `${s.label} · ${s.sponsor}` : s.label}
      </span>
      <span className={compact ? 'text-xs text-muted' : 'mt-1 block text-sm text-muted'}>
        {s.line}
      </span>
    </>
  );

  if (s.href) {
    return (
      <Link
        href={s.href}
        className="block border border-line px-4 py-3 transition hover:border-foreground/25"
      >
        {inner}
      </Link>
    );
  }

  return <div className="border border-line px-4 py-3">{inner}</div>;
}
