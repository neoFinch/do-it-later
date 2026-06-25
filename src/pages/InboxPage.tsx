import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonList,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addOutline, gridOutline, listOutline, playOutline, refreshOutline, settingsOutline } from 'ionicons/icons';
import { useCaptureStore } from '../store/captureStore';
import { Capture, CaptureStatus } from '../types/capture';
import CaptureListItem from '../components/CaptureListItem';
import CaptureGrid from '../components/CaptureGrid';
import './InboxPage.css';

type InboxViewMode = 'list' | 'grid';

const VIEW_MODE_KEY = 'later:inbox-view-mode';

const STATUS_LABELS: Record<CaptureStatus, string> = {
  INBOX: 'Inbox',
  REVIEWED: 'Reviewed',
  ARCHIVED: 'Archived'
};

const getEmptyStateMessage = (status: CaptureStatus): string => {
  if (status === 'INBOX') {
    return 'No captures yet. Use Quick Add or share a URL to save content.';
  }
  if (status === 'REVIEWED') {
    return 'No reviewed captures yet. Mark items as reviewed from their detail page.';
  }
  return 'No archived captures yet. Archive items you want to keep but hide from your inbox.';
};

const readViewMode = (): InboxViewMode => {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
};

const InboxPage: React.FC = () => {
  const history = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<InboxViewMode>(readViewMode);
  const { captures, loading, init, search, reload, statusFilter, statusCounts, setStatusFilter } = useCaptureStore();

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

  const onStatusChange = async (event: CustomEvent) => {
    const value = event.detail.value as CaptureStatus;
    if (!value || value === statusFilter) {
      return;
    }
    setSearchTerm('');
    await setStatusFilter(value);
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

  const toggleViewMode = () => {
    setViewMode((current) => {
      const next = current === 'list' ? 'grid' : 'list';
      try {
        localStorage.setItem(VIEW_MODE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const openCapture = (capture: Capture) => {
    history.push(`/capture/${capture.id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>LATER</IonTitle>
          <IonButtons slot="end">
            <IonButton color="medium" onClick={() => history.push('/settings')} aria-label="Data settings">
              <IonIcon icon={settingsOutline} slot="icon-only" />
            </IonButton>
            <IonButton color="medium" onClick={handleRefreshClick} aria-label="Refresh">
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            <IonButton color="primary" onClick={() => history.push('/quick-add')} aria-label="Add capture">
              <IonIcon icon={addOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={statusFilter} onIonChange={onStatusChange}>
            {(Object.keys(STATUS_LABELS) as CaptureStatus[]).map((status) => (
              <IonSegmentButton key={status} value={status}>
                <IonLabel>
                  {STATUS_LABELS[status]} ({statusCounts[status]})
                </IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
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
        <div className="inbox-search-row">
          <IonSearchbar
            className="inbox-search-row__search"
            value={searchTerm}
            onIonChange={onSearch}
            placeholder="Search saved capture"
          />
          {statusCounts.INBOX > 0 && (
            <IonButton
              fill="clear"
              color="tertiary"
              className="inbox-search-row__action"
              aria-label={`Review inbox (${statusCounts.INBOX})`}
              onClick={() => history.push('/review')}
            >
              <IonIcon icon={playOutline} slot="icon-only" />
            </IonButton>
          )}
          <IonButton
            fill="clear"
            color="medium"
            className="inbox-search-row__action"
            aria-label={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            onClick={toggleViewMode}
          >
            <IonIcon icon={viewMode === 'list' ? gridOutline : listOutline} slot="icon-only" />
          </IonButton>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : captures.length === 0 ? (
          <div style={{ padding: '1.5rem' }}>
            <IonText color="medium">{getEmptyStateMessage(statusFilter)}</IonText>
          </div>
        ) : viewMode === 'grid' ? (
          <CaptureGrid captures={captures} onSelect={openCapture} />
        ) : (
          <IonList lines="full">
            {captures.map((capture) => (
              <CaptureListItem key={capture.id} capture={capture} onSelect={openCapture} />
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default InboxPage;
