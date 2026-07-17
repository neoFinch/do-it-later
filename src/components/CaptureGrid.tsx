import { memo, useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
  documentOutline,
  documentTextOutline,
  imageOutline,
  linkOutline,
  logoInstagram,
  logoLinkedin,
  logoReddit,
  logoTiktok,
  logoX,
  logoYoutube
} from 'ionicons/icons';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImageMime } from '../services/file.service';
import { getCaptureDisplayTitle } from '../services/title.service';
import { getCaptureSourceBadge, SourceBadgeVariant } from '../utils/capture-source';
import { isSameCaptureDisplay } from '../utils/capture-display';
import { formatRelativeSavedAt } from '../utils/format-date';
import { detectLinkPlatform } from '../services/link.service';

const SOURCE_ICONS: Record<SourceBadgeVariant, string> = {
  youtube: logoYoutube,
  instagram: logoInstagram,
  tiktok: logoTiktok,
  twitter: logoX,
  reddit: logoReddit,
  linkedin: logoLinkedin,
  generic: linkOutline,
  note: documentTextOutline,
  image: imageOutline,
  file: documentOutline
};

interface CaptureGridProps {
  captures: Capture[];
  onSelect: (capture: Capture) => void;
}

const CaptureGridMedia = memo<{ capture: Capture }>(function CaptureGridMedia({ capture }) {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);
  const badge = getCaptureSourceBadge(capture);

  const fallbackIcon =
    capture.type === 'url'
      ? linkOutline
      : capture.type === 'file' && isImageMime(capture.source)
        ? imageOutline
        : capture.type === 'file'
          ? documentOutline
          : documentTextOutline;

  return (
    <div className="capture-grid__media">
      {previewUrl && !hidden ? (
        <img src={previewUrl} alt="" onError={() => setHidden(true)} />
      ) : capture.type === 'url' && detectLinkPlatform(capture.url ?? '') === 'instagram' ? (
        <img src="/placeholders/instagram-unavailable.svg" alt="" />
      ) : (
        <IonIcon icon={fallbackIcon} />
      )}
      <span className="capture-grid__badge" aria-label={badge.label} title={badge.label}>
        <IonIcon icon={SOURCE_ICONS[badge.variant]} aria-hidden="true" />
      </span>
    </div>
  );
}, (prev, next) => isSameCaptureDisplay(prev.capture, next.capture));

const CaptureGridItem = memo<{
  capture: Capture;
  onSelect: (capture: Capture) => void;
}>(function CaptureGridItem({ capture, onSelect }) {
  return (
    <button type="button" className="capture-grid__item" onClick={() => onSelect(capture)}>
      <CaptureGridMedia capture={capture} />
      <div className="capture-grid__body">
        <h3 className="capture-grid__title">{getCaptureDisplayTitle(capture)}</h3>
        <span className="capture-grid__date">{formatRelativeSavedAt(capture.createdAt)}</span>
      </div>
    </button>
  );
}, (prev, next) => prev.onSelect === next.onSelect && isSameCaptureDisplay(prev.capture, next.capture));

const CaptureGrid = memo<CaptureGridProps>(function CaptureGrid({ captures, onSelect }) {
  return (
    <div className="capture-grid">
      {captures.map((capture) => (
        <CaptureGridItem key={capture.id} capture={capture} onSelect={onSelect} />
      ))}
    </div>
  );
}, (prev, next) => prev.onSelect === next.onSelect && prev.captures === next.captures);

export default CaptureGrid;
