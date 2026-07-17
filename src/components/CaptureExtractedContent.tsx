import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  openOutline,
  refreshOutline
} from 'ionicons/icons';
import { CaptureProcessing } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { INSTAGRAM_RESTRICTED_MESSAGE } from '../services/extractors/social-text';

interface CaptureExtractedContentProps {
  processing: CaptureProcessing | null;
  document: ContentDocument | null;
  busy: boolean;
  missingThumbnail?: boolean;
  onRetry: () => void;
  onOpenLink?: () => void;
  openLinkLabel?: string;
}

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

export const getExtractedText = (document: ContentDocument): string => {
  return document.transcript?.trim() || document.articleText?.trim() || '';
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
  const [showFullText, setShowFullText] = useState(false);
  const fullText = document ? getExtractedText(document) : '';
  const failed = processing?.extractionStatus === 'failed' && !document;
  const empty = !document && !busy && processing?.extractionStatus !== 'processing';
  const showRetryCta = failed || empty || (!!document && missingThumbnail);
  const restricted =
    !!processing?.extractionError && processing.extractionError.includes('hid this post from scrapers');
  const errorText = processing?.extractionError ?? (failed ? INSTAGRAM_RESTRICTED_MESSAGE : null);

  useEffect(() => {
    setShowFullText(false);
  }, [document?.captureId, document?.extractedAt, fullText]);

  return (
    <>
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
          <div className="capture-extracted__success">
            <IonIcon
              icon={checkmarkCircleOutline}
              className="capture-extracted__success-icon"
              color="success"
              aria-hidden="true"
            />
            <div className="capture-extracted__success-copy">
              <p className="capture-extracted__success-title">Content extracted successfully</p>
              {missingThumbnail ? (
                <IonText color="medium">
                  <p className="capture-extracted__hint">
                    Preview image missing — Instagram sometimes blocks images. Open the link to view the post.
                  </p>
                </IonText>
              ) : (
                <IonText color="medium">
                  <p className="capture-extracted__success-subtitle">
                    {fullText ? 'Caption and transcript are ready to review.' : 'Preview refreshed from this link.'}
                  </p>
                </IonText>
              )}
            </div>
          </div>
        )}

        {document && fullText && (
          <IonButton
            className="capture-extracted__view-more"
            fill="clear"
            size="small"
            color="primary"
            onClick={() => setShowFullText(true)}
          >
            View full text
          </IonButton>
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

      <IonModal isOpen={showFullText} onDidDismiss={() => setShowFullText(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Extracted content</IonTitle>
            <IonButtons slot="end">
              <IonButton aria-label="Close" onClick={() => setShowFullText(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding capture-extracted__modal-content">
          <p className="capture-extracted__full-text">{fullText}</p>
        </IonContent>
      </IonModal>
    </>
  );
};

export default CaptureExtractedContent;
