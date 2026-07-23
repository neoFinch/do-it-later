import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonToast
} from '@ionic/react';
import {
  archiveOutline,
  arrowUndoOutline,
  checkmarkCircleOutline,
  closeOutline,
  expandOutline,
  openOutline,
  refreshOutline,
  trashOutline
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { getCapture } from '../services/capture.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture, CaptureStatus } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { isImageMime, isImagePath, isLegacyLocalFilePath } from '../services/file.service';
import { getCaptureLink, getOpenLinkLabel, openLink, detectLinkPlatform } from '../services/link.service';
import { getCaptureDisplayTitle, titlesAreEquivalent } from '../services/title.service';
import { getCaptureSourceBadge } from '../utils/capture-source';
import { formatRelativeSavedAt } from '../utils/format-date';
import { getContentConsumeLabel } from '../utils/content-duration';
import { getCaptureUnderstanding, analyzeCapture } from '../services/processing.service';
import { OFFLINE_ERROR_MESSAGE } from '../services/network.service';
import { refreshCaptureMedia, refreshCaptureThumbnail } from '../services/capture-refresh.service';
import { AIAnalysis } from '../types/ai-analysis';
import { CaptureProcessing } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import CaptureProcessingTimeline from '../components/CaptureProcessingTimeline';
import './CaptureDetailPage.css';

const STATUS_LABELS: Record<CaptureStatus, string> = {
  INBOX: 'Inbox',
  REVIEWED: 'Reviewed',
  ARCHIVED: 'Archived'
};

const CaptureHero: React.FC<{
  capture: Capture;
  onOpenLink?: () => void;
  openLinkLabel?: string;
  onRetryThumbnail?: () => void;
  thumbnailRetryBusy?: boolean;
}> = ({ capture, onOpenLink, openLinkLabel, onRetryThumbnail, thumbnailRetryBusy = false }) => {
  const previewUrl = useCapturePreview(capture);
  const [imageBroken, setImageBroken] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const isUrlCapture = capture.type === 'url' && !!capture.url;
  const isPrimaryImage =
    (capture.type === 'file' && isImageMime(capture.source)) ||
    (capture.type === 'note' &&
      !!capture.content &&
      isImagePath(capture.content.trim().split('\n')[0]));
  const showPlaceholder = isUrlCapture && (!previewUrl || imageBroken);
  const isInstagram = detectLinkPlatform(capture.url ?? '') === 'instagram';

  useEffect(() => {
    setImageBroken(false);
    setImageExpanded(false);
  }, [capture.id, capture.thumbnail]);

  if (!previewUrl && !isUrlCapture) {
    return null;
  }

  if (showPlaceholder) {
    return (
      <div className="capture-detail__hero capture-detail__hero--placeholder">
        <img
          className="capture-detail__hero-art"
          src="/placeholders/instagram-unavailable.svg"
          alt=""
        />
        <div className="capture-detail__hero-overlay">
          <p className="capture-detail__hero-kicker">
            {isInstagram ? 'Instagram preview unavailable' : 'Preview unavailable'}
          </p>
          <p className="capture-detail__hero-copy">
            {isInstagram
              ? 'Instagram sometimes hides reels from scrapers. Your link is saved — open it to watch.'
              : 'We could not load a preview image. Your link is still saved.'}
          </p>
          <div className="capture-detail__hero-actions">
            {onRetryThumbnail && (
              <IonButton
                className="capture-detail__hero-retry"
                fill="solid"
                disabled={thumbnailRetryBusy}
                onClick={onRetryThumbnail}
              >
                {thumbnailRetryBusy ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <IonIcon icon={refreshOutline} slot="start" />
                )}
                Retry preview
              </IonButton>
            )}
            {onOpenLink && (
              <IonButton className="capture-detail__hero-cta" fill="solid" onClick={onOpenLink}>
                <IonIcon icon={openOutline} slot="start" />
                {openLinkLabel ?? (isInstagram ? 'Open in Instagram' : 'Open link')}
              </IonButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  const heroClassName = [
    'capture-detail__hero',
    'capture-detail__hero--expandable',
    isPrimaryImage ? 'capture-detail__hero--primary-image' : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={heroClassName}>
        <button
          type="button"
          className="capture-detail__hero-image-button"
          aria-label="View full image"
          onClick={() => setImageExpanded(true)}
        >
          <img
            src={previewUrl!}
            alt={getCaptureDisplayTitle(capture)}
            onError={() => setImageBroken(true)}
          />
          <span className="capture-detail__hero-expand-hint" aria-hidden="true">
            <IonIcon icon={expandOutline} />
          </span>
        </button>
        {onOpenLink && (
          <IonButton
            className="capture-detail__hero-open"
            fill="solid"
            aria-label={openLinkLabel ?? 'Open link'}
            onClick={onOpenLink}
          >
            <IonIcon icon={openOutline} slot="icon-only" />
          </IonButton>
        )}
      </div>

      <IonModal
        isOpen={imageExpanded}
        className="capture-detail__image-modal"
        onDidDismiss={() => setImageExpanded(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>{getCaptureDisplayTitle(capture)}</IonTitle>
            <IonButtons slot="end">
              <IonButton aria-label="Close" onClick={() => setImageExpanded(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="capture-detail__image-modal-content">
          <div className="capture-detail__image-modal-frame">
            <img src={previewUrl!} alt={getCaptureDisplayTitle(capture)} />
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

const CaptureDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [processing, setProcessing] = useState<CaptureProcessing | null>(null);
  const [document, setDocument] = useState<ContentDocument | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [extractionBusy, setExtractionBusy] = useState(false);
  const [thumbnailRetryBusy, setThumbnailRetryBusy] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const { online } = useNetworkStatus();
  const { removeCapture, updateCaptureTitle, updateCaptureStatus } = useCaptureStore();

  const loadUnderstanding = async (captureId: string) => {
    const result = await getCaptureUnderstanding(captureId);
    setProcessing(result.processing);
    setDocument(result.document);
    setAnalysis(result.analysis);
  };

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      const result = await getCapture(id);
      setCapture(result);
      setTitleDraft(result ? getCaptureDisplayTitle(result) : '');
      if (result) {
        await loadUnderstanding(result.id);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!id || !capture || capture.type === 'file') {
      return;
    }

    const isActive =
      processing?.extractionStatus === 'pending' ||
      processing?.extractionStatus === 'processing' ||
      processing?.analysisStatus === 'pending' ||
      processing?.analysisStatus === 'processing' ||
      processing?.understandStatus === 'processing' ||
      processing?.classifyStatus === 'processing' ||
      processing?.enrichStatus === 'processing' ||
      processing?.evaluateStatus === 'processing';

    if (!isActive) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadUnderstanding(id);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [id, capture, processing?.extractionStatus, processing?.analysisStatus, processing?.understandStatus, processing?.classifyStatus, processing?.enrichStatus, processing?.evaluateStatus]);

  const deleteItem = async () => {
    if (!capture) {
      return;
    }
    await removeCapture(capture.id);
    setToastMessage('Capture deleted.');
    history.push('/');
  };

  const handleOpenLink = async () => {
    if (!capture) {
      return;
    }

    const link = getCaptureLink(capture);
    if (!link) {
      return;
    }

    try {
      await openLink(link);
    } catch (error) {
      console.error('Failed to open capture link', error);
      setToastMessage('Could not open link.');
    }
  };

  const handleSaveTitle = async () => {
    if (!capture) {
      return;
    }

    try {
      await updateCaptureTitle(capture.id, titleDraft);
      setCapture({ ...capture, title: titleDraft.trim() || null });
      setToastMessage('Title saved.');
    } catch (error) {
      console.error('Failed to save title', error);
      setToastMessage('Could not save title.');
    }
  };

  const handleStatusChange = async (status: CaptureStatus, message: string) => {
    if (!capture) {
      return;
    }

    try {
      await updateCaptureStatus(capture.id, status);
      setCapture({ ...capture, status });
      setToastMessage(message);
    } catch (error) {
      console.error('Failed to update capture status', error);
      setToastMessage('Could not update status.');
    }
  };

  const handleRetryThumbnail = async () => {
    if (!capture) {
      return;
    }

    setThumbnailRetryBusy(true);
    try {
      const result = await refreshCaptureThumbnail(capture.id);
      if (result.capture) {
        setCapture(result.capture);
      }
      setToastMessage(result.userMessage);
    } catch (error) {
      console.error('Failed to refresh capture thumbnail', error);
      setToastMessage(
        error instanceof Error ? error.message : 'Could not refresh preview image. Try again.'
      );
    } finally {
      setThumbnailRetryBusy(false);
    }
  };

  const handleRetryExtraction = async () => {
    if (!capture) {
      return;
    }

    setExtractionBusy(true);
    try {
      const result = await refreshCaptureMedia(capture.id);
      if (result.capture) {
        setCapture(result.capture);
        setTitleDraft(getCaptureDisplayTitle(result.capture));
      }
      if (result.document) {
        setDocument(result.document);
      }
      await loadUnderstanding(capture.id);
      setToastMessage(result.userMessage);
    } catch (error) {
      console.error('Failed to refresh capture media', error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : 'Could not refresh this capture. Check your connection and try again.'
      );
      await loadUnderstanding(capture.id);
    } finally {
      setExtractionBusy(false);
    }
  };

  const handleAnalyze = async () => {
    if (!capture) {
      return;
    }

    if (!online) {
      setToastMessage(OFFLINE_ERROR_MESSAGE);
      return;
    }

    setAnalysisBusy(true);
    try {
      await analyzeCapture(capture.id, { force: true });
      const understanding = await getCaptureUnderstanding(capture.id);
      setProcessing(understanding.processing);
      setAnalysis(understanding.analysis);

      if (understanding.processing?.analysisStatus === 'failed') {
        setToastMessage(understanding.processing.analysisError ?? 'Analysis failed.');
        return;
      }

      setToastMessage('Content analysis updated.');
    } catch (error) {
      console.error('Failed to analyze capture', error);
      setToastMessage(error instanceof Error ? error.message : 'Analysis failed.');
    } finally {
      setAnalysisBusy(false);
    }
  };

  if (!capture) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const showUnderstanding = capture.type !== 'file';

  const captureLink = getCaptureLink(capture);
  const badge = getCaptureSourceBadge(capture);
  const showLegacyPath =
    capture.type === 'note' && !!capture.content && isLegacyLocalFilePath(capture.content);
  const titleChanged = !titlesAreEquivalent(titleDraft, capture.title);
  const consumeLabel = document ? getContentConsumeLabel(document) : null;
  const metaParts = [
    badge.label,
    STATUS_LABELS[capture.status],
    formatRelativeSavedAt(capture.createdAt),
    consumeLabel
  ].filter(Boolean);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Details</IonTitle>
          <IonButtons slot="end">
            <IonButton color="danger" aria-label="Delete capture" onClick={deleteItem}>
              <IonIcon icon={trashOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="capture-detail">
          <CaptureHero
            capture={capture}
            onOpenLink={captureLink ? handleOpenLink : undefined}
            openLinkLabel={captureLink ? getOpenLinkLabel(captureLink) : undefined}
            onRetryThumbnail={capture.type === 'url' && capture.url ? handleRetryThumbnail : undefined}
            thumbnailRetryBusy={thumbnailRetryBusy}
          />

          {/* {captureLink && (
            <IonButton expand="block" color="primary" onClick={handleOpenLink}>
              <IonIcon icon={openOutline} slot="start" />
              {getOpenLinkLabel(captureLink)}
            </IonButton>
          )} */}

          <div className="capture-detail__meta">
            <span className="capture-detail__meta-text">{metaParts.join(' · ')}</span>
          </div>

          <div className="capture-detail__title-block">
            <IonTextarea
              className="capture-detail__title-input"
              value={titleDraft}
              autoGrow
              rows={1}
              placeholder="Add a title"
              onIonInput={(event) => setTitleDraft(event.detail.value ?? '')}
            />
            {titleChanged && (
              <div className="capture-detail__title-actions">
                <IonButton size="small" color="primary" onClick={handleSaveTitle}>
                  Save
                </IonButton>
              </div>
            )}
          </div>

          {showUnderstanding && (
            <CaptureProcessingTimeline
              processing={processing}
              document={document}
              analysis={analysis}
              extractionBusy={extractionBusy}
              analysisBusy={analysisBusy}
              offline={!online}
              missingThumbnail={capture.type === 'url' && !capture.thumbnail}
              onRetryExtraction={handleRetryExtraction}
              onAnalyze={handleAnalyze}
              onOpenLink={captureLink ? handleOpenLink : undefined}
              openLinkLabel={captureLink ? getOpenLinkLabel(captureLink) : undefined}
            />
          )}

          <section className="capture-detail__section">
            <h2 className="capture-detail__label">Actions</h2>
            <div className="capture-detail__actions">
              {capture.status === 'INBOX' && (
                <>
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={() => handleStatusChange('REVIEWED', 'Marked as reviewed.')}
                  >
                    <IonIcon icon={checkmarkCircleOutline} slot="start" />
                    Mark reviewed
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="medium"
                    onClick={() => handleStatusChange('ARCHIVED', 'Capture archived.')}
                  >
                    <IonIcon icon={archiveOutline} slot="start" />
                    Archive
                  </IonButton>
                </>
              )}
              {capture.status === 'REVIEWED' && (
                <>
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="primary"
                    onClick={() => handleStatusChange('INBOX', 'Moved back to inbox.')}
                  >
                    <IonIcon icon={arrowUndoOutline} slot="start" />
                    Move to inbox
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="medium"
                    onClick={() => handleStatusChange('ARCHIVED', 'Capture archived.')}
                  >
                    <IonIcon icon={archiveOutline} slot="start" />
                    Archive
                  </IonButton>
                </>
              )}
              {capture.status === 'ARCHIVED' && (
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={() => handleStatusChange('INBOX', 'Capture restored to inbox.')}
                >
                  <IonIcon icon={arrowUndoOutline} slot="start" />
                  Restore to inbox
                </IonButton>
              )}
            </div>
          </section>

          {(capture.content && capture.type === 'note' && !showLegacyPath) ||
          capture.url ||
          capture.type === 'file' ||
          showLegacyPath ? (
            <section className="capture-detail__section">
              <h2 className="capture-detail__label">Details</h2>
              {capture.content && capture.type === 'note' && !showLegacyPath && (
                <p className="capture-detail__note">{capture.content}</p>
              )}
              {capture.url && (
                <button type="button" className="capture-detail__url-button" onClick={handleOpenLink}>
                  <p className="capture-detail__url">{capture.url}</p>
                </button>
              )}
              {capture.type === 'file' && (
                <p className="capture-detail__file-info">
                  {isImageMime(capture.source) ? 'Shared image' : capture.source ?? 'Shared file'}
                </p>
              )}
              {showLegacyPath && (
                <p className="capture-detail__file-info">
                  {isImagePath(capture.content!.trim().split('\n')[0])
                    ? 'Shared image'
                    : 'Local file saved before previews were supported.'}
                </p>
              )}
            </section>
          ) : null}
        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={1500}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default CaptureDetailPage;
