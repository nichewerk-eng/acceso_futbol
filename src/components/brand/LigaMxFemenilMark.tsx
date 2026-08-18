import Image from 'next/image';

type Props = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
};

const PX = { sm: 36, md: 72, lg: 220 } as const;

/** Official Liga MX Femenil mark for AF surfaces. */
export function LigaMxFemenilMark({
  className = '',
  size = 'md',
  priority = false,
}: Props) {
  const px = PX[size];

  return (
    <Image
      src="/liga_mx_feminil/Liga_MX_Femenil.png"
      alt="Liga MX Femenil"
      width={px}
      height={px}
      priority={priority}
      data-testid="lm-femenil-mark"
      className={['lm-mark', className].filter(Boolean).join(' ')}
    />
  );
}
