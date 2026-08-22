import Link from 'next/link';
import { RecordingShare } from '@/components/living-room/RecordingShare';
import { transcriptParagraphs } from '@/lib/share/recordingShare';

type Props = {
  kicker: string;
  title: string;
  dek: string;
  audioUrl: string;
  downloadUrl: string;
  fileName: string;
  shareTitle: string;
  shareText: string;
  sharePath: string;
  transcript: string;
  backHref: string;
  backLabel: string;
};

export function RecordingListen({
  kicker,
  title,
  dek,
  audioUrl,
  downloadUrl,
  fileName,
  shareTitle,
  shareText,
  sharePath,
  transcript,
  backHref,
  backLabel,
}: Props) {
  const paragraphs = transcriptParagraphs(transcript);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href={backHref}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-foreground"
      >
        ← {backLabel}
      </Link>
      <p className="mt-8 af-tele text-foreground">
        <span className="text-signal">AF</span>
        {kicker}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-wide sm:text-5xl">
        {title}
      </h1>
      {dek ? <p className="mt-4 text-base leading-7 text-muted">{dek}</p> : null}

      <audio className="mt-8 w-full" controls preload="metadata" src={audioUrl}>
        Tu navegador no reproduce audio. Baja el MP3.
      </audio>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <RecordingShare
          title={shareTitle}
          text={shareText}
          path={sharePath}
          fileUrl={audioUrl}
          fileName={fileName}
          className="toma-share"
          testId="listen-share"
        />
        <a href={downloadUrl} className="af-cta-ghost !py-2" download={fileName}>
          Bajar MP3
        </a>
      </div>
      <p className="mt-3 af-tele">
        WhatsApp y Telegram mandan el audio. Instagram o TikTok: baja el MP3.
      </p>

      {paragraphs.length > 0 ? (
        <div className="mt-10 space-y-5" data-testid="listen-script">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[17px] leading-8 text-muted">
              {p}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}
