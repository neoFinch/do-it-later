import { IonButton, IonChip, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { alertCircleOutline, refreshOutline, timeOutline } from 'ionicons/icons';
import { CaptureProcessing } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { estimateReadingMinutes } from '../services/extractors/article-text';
import { estimateWatchMinutes } from '../services/extractors/youtube.extractor';

interface CaptureExtractedContentProps {
  processing: CaptureProcessing | null;
  document: ContentDocument | null;
  busy: boolean;
  onRetry: () => void;
}

const PREVIEW_LIMIT = 600;

const extractionStatusMessage = (processing: CaptureProcessing | null, document: ContentDocument | null): string => {
  if (document) {
    return 'Content extracted';
  }

  if (!processing) {
    return 'Waiting to extract…';
  }

  if (processing.extractionStatus === 'processing') {
    return 'Extracting content…';
  }

  if (processing.extractionStatus === 'failed') {
    return processing.extractionError ?? 'Extraction failed';
  }

  if (processing.extractionStatus === 'skipped') {
    return processing.extractionError ?? 'Extraction skipped';
  }

  if (processing.extractionStatus === 'pending') {
    return 'Queued for extraction…';
  }

  return 'No extracted content yet';
};

const getPreviewText = (document: ContentDocument): string => {
  const text = document.transcript?.trim() || document.articleText?.trim() || '';
  if (text.length <= PREVIEW_LIMIT) {
    return text;
  }
  return `${text.slice(0, PREVIEW_LIMIT)}…`;
};

const getEstimatedTime = (document: ContentDocument): string | null => {
  if (document.transcript) {
    const minutes = estimateWatchMinutes(document.duration);
    return minutes ? `${minutes} min watch` : null;
  }

  const text = document.articleText?.trim();
  if (text) {
    return `${estimateReadingMinutes(text)} min read`;
  }

  return null;
};

const CaptureExtractedContent: React.FC<CaptureExtractedContentProps> = ({
  processing,
  document,
  busy,
  onRetry
}) => {
  const preview = document ? getPreviewText(document) : '';
  const estimatedTime = document ? getEstimatedTime(document) : null;

  return (
    <section className="capture-detail__section capture-extracted">
      <div className="capture-extracted__header">
        <h2 className="capture-detail__label">Extracted content</h2>
        <IonButton fill="clear" size="small" disabled={busy} onClick={onRetry}>
          {busy ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} slot="start" />}
          {busy ? 'Working…' : 'Retry'}
        </IonButton>
      </div>

      {!document ? (
        <div className="capture-extracted__pending">
          {(busy || processing?.extractionStatus === 'processing') && <IonSpinner name="crescent" />}
          <IonText color="medium">
            <p>{extractionStatusMessage(processing, document)}</p>
          </IonText>
        </div>
      ) : (
        <>
          <div className="capture-extracted__meta-row">
            <IonChip outline color="secondary">{document.source}</IonChip>
            {estimatedTime && (
              <IonChip outline color="medium">
                <IonIcon icon={timeOutline} />
                {estimatedTime}
              </IonChip>
            )}
          </div>
          {preview && <p className="capture-extracted__preview">{preview}</p>}
        </>
      )}

      {processing?.extractionStatus === 'failed' && !document && (
        <IonText color="danger">
          <p className="capture-extracted__error">
            <IonIcon icon={alertCircleOutline} /> {processing.extractionError}
          </p>
        </IonText>
      )}
    </section>
  );
};

export default CaptureExtractedContent;
