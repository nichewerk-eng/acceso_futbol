'use client';

import { RecordingShare } from '@/components/living-room/RecordingShare';
import {
  recordingFileName,
  tomaShareCopy,
  tomaSharePath,
} from '@/lib/share/recordingShare';

export type TomaShareCut = {
  id: string;
  title: string;
  cue: string;
  audioUrl: string;
  shareText?: string;
  jornadaNum?: number;
};

export function TomaShare({ cut }: { cut?: TomaShareCut | null }) {
  const copy = cut
    ? tomaShareCopy({
        title: cut.title,
        cue: cut.cue,
        jornadaNum: cut.jornadaNum,
        transcript: cut.shareText,
      })
    : { title: 'AF://TOMA · Acceso Futbol', text: 'La toma de la jornada.' };

  return (
    <RecordingShare
      title={copy.title}
      text={copy.text}
      path={cut ? tomaSharePath(cut.id) : '/toma'}
      fileUrl={cut?.audioUrl}
      fileName={cut ? recordingFileName('toma', cut.id) : undefined}
      className="toma-share"
      testId="toma-share"
    />
  );
}
