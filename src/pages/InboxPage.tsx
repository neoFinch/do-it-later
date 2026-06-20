import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonThumbnail
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addOutline, documentOutline, documentTextOutline, imageOutline, linkOutline, refreshOutline } from 'ionicons/icons';
import { useCaptureStore } from '../store/captureStore';
import { Capacitor } from '@capacitor/core';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { isImageMime, isLegacyLocalFilePath } from '../services/file.service';

// Toast is optional - may not be available on web
let Toast: any = null;
if (Capacitor.getPlatform() !== 'web') {
  import('@capacitor/toast').then(module => {
    Toast = module.Toast;
  }).catch(e => {
    console.warn('Toast module not available', e);
  });
}

const getCaptureTitle = (capture: Capture): string => {
  if (capture.title?.trim()) {
    return capture.title;
  }
  if (capture.type === 'url') {
    return capture.url ?? 'Saved link';
  }
  if (capture.type === 'file') {
    return 'Shared file';
  }
  return 'Untitled note';
};

const getCaptureSubtitle = (capture: Capture): string => {
  if (capture.type === 'url') {
    return capture.url ?? '';
  }
  if (capture.type === 'file') {
    return isImageMime(capture.source) ? 'Image' : capture.source ?? 'File';
  }
  if (capture.content && isLegacyLocalFilePath(capture.content)) {
    return 'Shared file';
  }
  return capture.content ?? '';
};

const CaptureThumbnail: React.FC<{ capture: Capture }> = ({ capture }) => {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);

  if (previewUrl && !hidden) {
    return (
      <IonThumbnail slot="start">
        <img src={previewUrl} alt="" onError={() => setHidden(true)} />
      </IonThumbnail>
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
    <IonIcon
      slot="start"
      icon={icon}
      color="medium"
      style={{ fontSize: '1.5rem', marginInlineEnd: '0.75rem' }}
    />
  );
};

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
            {captures.map((capture) => (
              <IonItem button key={capture.id} onClick={() => history.push(`/capture/${capture.id}`)}>
                <CaptureThumbnail capture={capture} />
                <IonLabel>
                  <h2>{getCaptureTitle(capture)}</h2>
                  <p>{getCaptureSubtitle(capture)}</p>
                  {capture.source && capture.type !== 'file' && <IonNote color="medium">{capture.source}</IonNote>}
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
