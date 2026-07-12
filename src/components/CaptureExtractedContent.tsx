import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { alertCircleOutline, openOutline, refreshOutline } from 'ionicons/icons';
import { CaptureProcessing } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { INSTAGRAM_RESTRICTED_MESSAGE } from '../services/extractors/social-text';

// TODO(product): Consider hiding this section from end users. Extraction should
// still run for AI analysis, but the raw transcript/article preview may be
// noise on the detail screen. Parked — keep for debugging until UX is settled.

interface CaptureExtractedContentProps {
  processing: CaptureProcessing | null;
  document: ContentDocument | null;
  busy: boolean;
  missingThumbnail?: boolean;
  onRetry: () => void;
  onOpenLink?: () => void;
  openLinkLabel?: string;
}

const PREVIEW_LIMIT = 600;

const extractionStatusMessage = (
  processing: CaptureProcessing | null,
  document: ContentDocument | null,
  missingThumbnail?: boolean
): string => {
  if (document) {
    if (missingThumbnail) {
      return 'Content extracted. Preview image is still missing — try refresh again later.';
    }
    return 'Content extracted';
  }

  if (!processing) {
    return 'Waiting to extract…';
  }

  if (processing.extractionStatus === 'processing') {
    return 'Fetching preview and extracted content…';
  }

  if (processing.extractionStatus === 'failed') {
    return 'Could not extract content from this link.';
  }

  if (processing.extractionStatus === 'skipped') {
    return processing.extractionError ?? 'Extraction skipped';
  }

  if (processing.extractionStatus === 'pending') {
    return 'Queued for extraction…';
  }

  return 'No extracted content yet. Tap Try again to fetch it.';
};

const getPreviewText = (document: ContentDocument): string => {
  const text = document.transcript?.trim() || document.articleText?.trim() || '';
  if (text.length <= PREVIEW_LIMIT) {
    return text;
  }
  return `${text.slice(0, PREVIEW_LIMIT)}…`;
};

const CaptureExtractedContent: React.FC<CaptureExtractedContentProps> = ({
  processing,
  document,
  busy,
  missingThumbnail = false,
  onRetry,
  onOpenLink,
  openLinkLabel
}) => {
  const preview = document ? getPreviewText(document) : '';
  const failed = processing?.extractionStatus === 'failed' && !document;
  const empty = !document && !busy && processing?.extractionStatus !== 'processing';
  const showRetryCta = failed || empty || (!!document && missingThumbnail);
  const restricted =
    !!processing?.extractionError && processing.extractionError.includes('hid this post from scrapers');
  const errorText = processing?.extractionError ?? (failed ? INSTAGRAM_RESTRICTED_MESSAGE : null);

  return (
    <section className="capture-detail__section capture-extracted">
      <div className="capture-extracted__header">
        <h2 className="capture-detail__label">Extracted content</h2>
        <IonButton
          fill="clear"
          size="small"
          color="medium"
          disabled={busy}
          aria-label="Refresh preview and extraction"
          onClick={onRetry}
        >
          {busy ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} slot="icon-only" />}
        </IonButton>
      </div>

      {!document ? (
        <div className="capture-extracted__pending">
          {(busy || processing?.extractionStatus === 'processing') && <IonSpinner name="crescent" />}
          <IonText color={failed ? 'danger' : 'medium'}>
            <p>{extractionStatusMessage(processing, document, missingThumbnail)}</p>
          </IonText>
        </div>
      ) : (
        <>
          {preview && <p className="capture-extracted__preview">{preview}</p>}
          {missingThumbnail && (
            <IonText color="medium">
              <p className="capture-extracted__hint">
                Preview image missing — Instagram sometimes blocks images. Open the link to view the post.
              </p>
            </IonText>
          )}
        </>
      )}

      {failed && errorText && (
        <IonText color="danger">
          <p className="capture-extracted__error">
            <IonIcon icon={alertCircleOutline} /> {errorText}
          </p>
        </IonText>
      )}

      <div className="capture-extracted__actions">
        {onOpenLink && (failed || restricted || missingThumbnail) && (
          <IonButton expand="block" fill="solid" color="dark" disabled={busy} onClick={onOpenLink}>
            <IonIcon icon={openOutline} slot="start" />
            {openLinkLabel ?? 'Open link'}
          </IonButton>
        )}
        {showRetryCta && (
          <IonButton
            className="capture-extracted__retry"
            expand="block"
            fill="outline"
            color="medium"
            disabled={busy}
            onClick={onRetry}
          >
            {busy ? <IonSpinner name="crescent" /> : restricted ? 'Check again' : 'Try again'}
          </IonButton>
        )}
      </div>
    </section>
  );
};

export default CaptureExtractedContent;
