import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonToast
} from '@ionic/react';
import {
  archiveOutline,
  arrowUndoOutline,
  checkmarkCircleOutline,
  colorWandOutline,
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
  openOutline,
  trashOutline
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { getCapture } from '../services/capture.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture, CaptureStatus } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImageMime, isImagePath, isLegacyLocalFilePath } from '../services/file.service';
import { getCaptureLink, getOpenLinkLabel, openLink } from '../services/link.service';
import { getCaptureDisplayTitle, suggestTitle, titlesAreEquivalent } from '../services/title.service';
import { getCaptureSourceBadge, SourceBadgeVariant } from '../utils/capture-source';
import { formatRelativeSavedAt } from '../utils/format-date';
import './CaptureDetailPage.css';

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

const STATUS_LABELS: Record<CaptureStatus, string> = {
  INBOX: 'Inbox',
  REVIEWED: 'Reviewed',
  ARCHIVED: 'Archived'
};

const CaptureHero: React.FC<{ capture: Capture; onOpenLink?: () => void }> = ({ capture, onOpenLink }) => {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);

  if (!previewUrl || hidden) {
    return null;
  }

  return (
    <div className="capture-detail__hero">
      <img
        src={previewUrl}
        alt={getCaptureDisplayTitle(capture)}
        onError={() => setHidden(true)}
      />
      {onOpenLink && (
        <IonButton
          className="capture-detail__hero-open"
          fill="solid"
          aria-label="Open link"
          onClick={onOpenLink}
        >
          <IonIcon icon={openOutline} slot="icon-only" />
        </IonButton>
      )}
    </div>
  );
};

const CaptureDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const { removeCapture, updateCaptureTitle, updateCaptureStatus } = useCaptureStore();

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      const result = await getCapture(id);
      setCapture(result);
      setTitleDraft(result ? getCaptureDisplayTitle(result) : '');
    };

    load();
  }, [id]);

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

  const handleCleanTitle = () => {
    const source = titleDraft || capture?.title || capture?.content || '';
    const cleaned = suggestTitle(source);
    if (!cleaned) {
      setToastMessage('Nothing to clean up.');
      return;
    }
    setTitleDraft(cleaned);
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

  if (!capture) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Capture</IonTitle>
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

  const captureLink = getCaptureLink(capture);
  const badge = getCaptureSourceBadge(capture);
  const showLegacyPath =
    capture.type === 'note' && !!capture.content && isLegacyLocalFilePath(capture.content);
  const titleChanged = !titlesAreEquivalent(titleDraft, capture.title);
  const statusClass = capture.status.toLowerCase();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Capture</IonTitle>
          <IonButtons slot="end">
            <IonButton color="danger" aria-label="Delete capture" onClick={deleteItem}>
              <IonIcon icon={trashOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="capture-detail">
          <CaptureHero capture={capture} onOpenLink={captureLink ? handleOpenLink : undefined} />

          {captureLink && (
            <IonButton expand="block" color="primary" onClick={handleOpenLink}>
              <IonIcon icon={openOutline} slot="start" />
              {getOpenLinkLabel(captureLink)}
            </IonButton>
          )}

          <div className="capture-detail__meta">
            <span
              className={`capture-detail__badge capture-detail__badge--${badge.variant}`}
              aria-label={badge.label}
              title={badge.label}
            >
              <IonIcon icon={SOURCE_ICONS[badge.variant]} aria-hidden="true" />
            </span>
            <span className={`capture-detail__status capture-detail__status--${statusClass}`}>
              {STATUS_LABELS[capture.status]}
            </span>
            <span className="capture-detail__date">{formatRelativeSavedAt(capture.createdAt)}</span>
          </div>

          <section className="capture-detail__section">
            <h2 className="capture-detail__label">Title</h2>
            <IonInput
              className="capture-detail__title-input"
              value={titleDraft}
              placeholder="Add a title"
              onIonInput={(event) => setTitleDraft(event.detail.value ?? '')}
            />
            <div className="capture-detail__title-actions">
              <IonButton fill="outline" color="tertiary" aria-label="Clean up title" onClick={handleCleanTitle}>
                <IonIcon icon={colorWandOutline} slot="icon-only" />
              </IonButton>
              <IonButton expand="block" color="primary" disabled={!titleChanged} onClick={handleSaveTitle}>
                Save title
              </IonButton>
            </div>
          </section>

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
