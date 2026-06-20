import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addOutline, refreshOutline } from 'ionicons/icons';
import { useCaptureStore } from '../store/captureStore';
import { Capacitor } from '@capacitor/core';

// Toast is optional - may not be available on web
let Toast: any = null;
if (Capacitor.getPlatform() !== 'web') {
  import('@capacitor/toast').then(module => {
    Toast = module.Toast;
  }).catch(e => {
    console.warn('Toast module not available', e);
  });
}

const InboxPage: React.FC = () => {
  const history = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const { captures, loading, init, search, reload } = useCaptureStore();

  useEffect(() => {
    (async () => {
      try {
        await init();
      } catch (err) {
        console.error('InboxPage: init error', err);
      }
    })();
  }, [init]);

  const onSearch = async (event: CustomEvent) => {
    const value = (event.detail.value ?? '').toString();
    setSearchTerm(value);
    await search(value);
  };

  const doRefresh = async (event: CustomEvent) => {
    try {
      await reload();
    } catch (err) {
      console.error('InboxPage: refresh error', err);
    } finally {
      event.detail.complete();
    }
  };

  const handleRefreshClick = async () => {
    try {
      await reload();
    } catch (err) {
      console.error('InboxPage: refresh error', err);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Capture Inbox</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleRefreshClick} aria-label="Refresh">
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            <IonButton onClick={() => history.push('/quick-add')} aria-label="Add capture">
              <IonIcon icon={addOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Capture Inbox</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <IonSearchbar value={searchTerm} onIonChange={onSearch} placeholder="Search saved capture" />
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : captures.length === 0 ? (
          <div style={{ padding: '1.5rem' }}>
            <IonText color="medium">No captures yet. Use Quick Add or share a URL to save content.</IonText>
          </div>
        ) : (
          <IonList>
            {captures.map((capture: typeof captures[number]) => (
              <IonItem button key={capture.id} onClick={() => history.push(`/capture/${capture.id}`)}>
                <IonLabel>
                  <h2>{capture.title ?? (capture.type === 'url' ? capture.url : 'Untitled note')}</h2>
                  <p>{capture.type === 'url' ? capture.url : capture.content}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default InboxPage;
