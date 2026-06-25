import { useState } from 'react';
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
import { formatRelativeSavedAt } from '../utils/format-date';

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

const CaptureGridMedia: React.FC<{ capture: Capture }> = ({ capture }) => {
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
      ) : (
        <IonIcon icon={fallbackIcon} />
      )}
      <span className="capture-grid__badge" aria-label={badge.label} title={badge.label}>
        <IonIcon icon={SOURCE_ICONS[badge.variant]} aria-hidden="true" />
      </span>
    </div>
  );
};

const CaptureGrid: React.FC<CaptureGridProps> = ({ captures, onSelect }) => {
  return (
    <div className="capture-grid">
      {captures.map((capture) => (
        <button
          key={capture.id}
          type="button"
          className="capture-grid__item"
          onClick={() => onSelect(capture)}
        >
          <CaptureGridMedia capture={capture} />
          <div className="capture-grid__body">
            <h3 className="capture-grid__title">{getCaptureDisplayTitle(capture)}</h3>
            <span className="capture-grid__date">{formatRelativeSavedAt(capture.createdAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default CaptureGrid;
