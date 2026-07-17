import { memo, useState } from 'react';
import { IonButton, IonIcon, IonItem } from '@ionic/react';
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
  logoYoutube,
  openOutline
} from 'ionicons/icons';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImageMime } from '../services/file.service';
import { openLink, detectLinkPlatform } from '../services/link.service';
import { getCaptureDisplayTitle } from '../services/title.service';
import { getCaptureSourceBadge, SourceBadgeVariant } from '../utils/capture-source';
import { isSameCaptureDisplay } from '../utils/capture-display';
import { formatRelativeSavedAt } from '../utils/format-date';
import './CaptureListItem.css';

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

interface CaptureListItemProps {
  capture: Capture;
  onSelect: (capture: Capture) => void;
}

const CaptureListMedia = memo<{ capture: Capture }>(function CaptureListMedia({ capture }) {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);

  if (previewUrl && !hidden) {
    return (
      <div className="capture-list-item__media">
        <img src={previewUrl} alt="" onError={() => setHidden(true)} />
      </div>
    );
  }

  if (capture.type === 'url' && detectLinkPlatform(capture.url ?? '') === 'instagram') {
    return (
      <div className="capture-list-item__media capture-list-item__media--placeholder">
        <img src="/placeholders/instagram-unavailable.svg" alt="" />
      </div>
    );
  }

  const icon =
    capture.type === 'url'
      ? linkOutline
      : capture.type === 'file' && isImageMime(capture.source)
        ? imageOutline
        : capture.type === 'file'
          ? documentOutline
          : documentTextOutline;

  return (
    <div className="capture-list-item__media">
      <IonIcon icon={icon} />
    </div>
  );
}, (prev, next) => isSameCaptureDisplay(prev.capture, next.capture));

const CaptureListItem = memo<CaptureListItemProps>(function CaptureListItem({ capture, onSelect }) {
  const badge = getCaptureSourceBadge(capture);
  const canOpenLink = capture.type === 'url' && !!capture.url;

  const handleOpenLink = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!capture.url) {
      return;
    }

    try {
      await openLink(capture.url);
    } catch (error) {
      console.error('CaptureListItem: failed to open link', error);
    }
  };

  return (
    <IonItem button detail={false} lines="none" className="capture-list-item" onClick={() => onSelect(capture)}>
      <div className="capture-list-item__content">
        <CaptureListMedia capture={capture} />
        <div className="capture-list-item__body">
          <h2 className="capture-list-item__title">{getCaptureDisplayTitle(capture)}</h2>
          <div className="capture-list-item__meta">
            <span
              className={`capture-list-item__badge capture-list-item__badge--${badge.variant}`}
              aria-label={badge.label}
              title={badge.label}
            >
              <IonIcon icon={SOURCE_ICONS[badge.variant]} aria-hidden="true" />
            </span>
            <span className="capture-list-item__date">{formatRelativeSavedAt(capture.createdAt)}</span>
          </div>
        </div>
      </div>
      {canOpenLink && (
        <IonButton
          slot="end"
          fill="clear"
          color="medium"
          className="capture-list-item__open"
          aria-label="Open link"
          onClick={handleOpenLink}
        >
          <IonIcon icon={openOutline} slot="icon-only" />
        </IonButton>
      )}
    </IonItem>
  );
}, (prev, next) => prev.onSelect === next.onSelect && isSameCaptureDisplay(prev.capture, next.capture));

export default CaptureListItem;
