import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
  IonToast
} from '@ionic/react';
import { colorWandOutline, openOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { getCapture } from '../services/capture.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImagePath, isLegacyLocalFilePath } from '../services/file.service';
import { getCaptureLink, getOpenLinkLabel, openLink } from '../services/link.service';
import { suggestTitle } from '../services/title.service';

const CapturePreview: React.FC<{ capture: Capture; onOpenLink?: () => void }> = ({ capture, onOpenLink }) => {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);
  const link = getCaptureLink(capture);
  const isClickable = !!link && !!onOpenLink;

  if (!previewUrl || hidden) {
    return null;
  }

  return (
    <IonItem
      lines="none"
      button={isClickable}
      detail={false}
      onClick={isClickable ? onOpenLink : undefined}
    >
      <img
        src={previewUrl}
        alt={capture.title ?? 'Capture preview'}
        style={{ width: '100%', borderRadius: 8, cursor: isClickable ? 'pointer' : 'default' }}
        onError={() => setHidden(true)}
      />
    </IonItem>
  );
};

const CaptureDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const { removeCapture, updateCaptureTitle } = useCaptureStore();

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      const result = await getCapture(id);
      setCapture(result);
      setTitleDraft(result?.title ?? '');
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

  if (!capture) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Capture Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <IonText color="medium">Loading capture…</IonText>
        </IonContent>
      </IonPage>
    );
  }

  const captureLink = getCaptureLink(capture);
  const showLegacyPath =
    capture.type === 'note' && !!capture.content && isLegacyLocalFilePath(capture.content);
  const savedTitle = capture.title ?? '';
  const titleChanged = titleDraft.trim() !== savedTitle.trim();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Capture Details</IonTitle>
          <IonButtons slot="end">
            <IonButton color="danger" onClick={deleteItem}>
              Delete
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <CapturePreview capture={capture} onOpenLink={captureLink ? handleOpenLink : undefined} />
        {captureLink && (
          <IonButton expand="block" onClick={handleOpenLink} className="ion-margin-bottom">
            <IonIcon icon={openOutline} slot="start" />
            {getOpenLinkLabel(captureLink)}
          </IonButton>
        )}
        <IonItem>
          <IonLabel position="stacked">Title</IonLabel>
          <IonInput
            value={titleDraft}
            placeholder="Add a title"
            onIonInput={(event) => setTitleDraft(event.detail.value ?? '')}
          />
        </IonItem>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <IonButton expand="block" fill="outline" onClick={handleCleanTitle}>
            <IonIcon icon={colorWandOutline} slot="start" />
            Clean up
          </IonButton>
          <IonButton expand="block" disabled={!titleChanged} onClick={handleSaveTitle}>
            Save title
          </IonButton>
        </div>
        <IonItem lines="none">
          <IonLabel>
            <p>Type: {capture.type}</p>
          </IonLabel>
        </IonItem>
        {capture.url && (
          <IonItem button detail={false} onClick={handleOpenLink}>
            <IonLabel>
              <h3>URL</h3>
              <p style={{ color: 'var(--ion-color-primary)' }}>{capture.url}</p>
            </IonLabel>
          </IonItem>
        )}
        {capture.type === 'file' && (
          <IonItem>
            <IonLabel>
              <h3>File</h3>
              <p>{capture.source ?? 'Shared file'}</p>
            </IonLabel>
          </IonItem>
        )}
        {capture.content && capture.type === 'note' && !showLegacyPath && (
          <IonItem>
            <IonLabel>
              <h3>Note</h3>
              <p>{capture.content}</p>
            </IonLabel>
          </IonItem>
        )}
        {showLegacyPath && (
          <IonItem>
            <IonLabel>
              <h3>Shared file</h3>
              <p>
                {isImagePath(capture.content!.trim().split('\n')[0])
                  ? 'Shared image'
                  : 'Local file saved before previews were supported.'}
              </p>
            </IonLabel>
          </IonItem>
        )}
        {capture.source && capture.type !== 'file' && (
          <IonItem>
            <IonLabel>
              <h3>Source</h3>
              <p>{capture.source}</p>
            </IonLabel>
          </IonItem>
        )}
        <IonText color="medium">Saved {new Date(capture.createdAt).toLocaleString()}</IonText>
        <IonToast isOpen={!!toastMessage} message={toastMessage} duration={1500} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default CaptureDetailPage;
