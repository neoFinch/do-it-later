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
        <IonItem>
          <IonLabel>
            <h2>{capture.title ?? (capture.type === 'url' ? capture.url : 'Untitled note')}</h2>
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
        {capture.content && (
          <IonItem>
            <IonLabel>
              <h3>Note</h3>
              <p>{capture.content}</p>
            </IonLabel>
          </IonItem>
        )}
        {capture.source && (
          <IonItem>
            <IonLabel>
              <h3>Source</h3>
              <p>{capture.source}</p>
            </IonLabel>
          </IonItem>
        )}
        {capture.thumbnail && (
          <IonItem>
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
