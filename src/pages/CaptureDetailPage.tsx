import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
  IonToast
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { getCapture } from '../services/capture.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImagePath, isLegacyLocalFilePath } from '../services/file.service';

const CapturePreview: React.FC<{ capture: Capture }> = ({ capture }) => {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);

  if (!previewUrl || hidden) {
    return null;
  }

  return (
    <IonItem lines="none">
      <img
        src={previewUrl}
        alt={capture.title ?? 'Capture preview'}
        style={{ width: '100%', borderRadius: 8 }}
        onError={() => setHidden(true)}
      />
    </IonItem>
  );
};

const CaptureDetailPage: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const { removeCapture } = useCaptureStore();

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      const result = await getCapture(id);
      setCapture(result);
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

  const showLegacyPath =
    capture.type === 'note' && !!capture.content && isLegacyLocalFilePath(capture.content);

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
        <CapturePreview capture={capture} />
        <IonItem>
          <IonLabel>
            <h2>{capture.title ?? (capture.type === 'url' ? capture.url : 'Untitled capture')}</h2>
            <p>Type: {capture.type}</p>
          </IonLabel>
        </IonItem>
        {capture.url && (
          <IonItem>
            <IonLabel>
              <h3>URL</h3>
              <p>{capture.url}</p>
            </IonLabel>
          </IonItem>
        )}
        {capture.type === 'file' && (
          <IonItem>
            <IonLabel>
              <h3>File</h3>
              <p>{capture.title ?? 'Shared file'}</p>
              {capture.source && <p>{capture.source}</p>}
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
        {capture.thumbnail && capture.type === 'url' && (
          <IonItem lines="none">
            <img src={capture.thumbnail} alt="Thumbnail" style={{ width: '100%', borderRadius: 8 }} />
          </IonItem>
        )}
        <IonText color="medium">Saved {new Date(capture.createdAt).toLocaleString()}</IonText>
        <IonToast isOpen={!!toastMessage} message={toastMessage} duration={1500} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default CaptureDetailPage;
