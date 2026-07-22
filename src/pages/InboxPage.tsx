import { useCallback, useEffect, useMemo, useState } from 'react';
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
  IonToast
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addOutline, archiveOutline, checkmarkCircleOutline, fileTrayFullOutline, gridOutline, listOutline, playOutline, refreshOutline, settingsOutline } from 'ionicons/icons';
import { useCaptureStore } from '../store/captureStore';
import { Capture, CaptureStatus } from '../types/capture';
import { useShallow } from 'zustand/react/shallow';
import CaptureListItem from '../components/CaptureListItem';
import CaptureGrid from '../components/CaptureGrid';
import { useDesktopCapture } from '../hooks/useDesktopCapture';
import { prefersDesktopUx, isWebRuntime } from '../utils/platform';
import { formatSaveError } from '../utils/save-error';
import './InboxPage.css';

type InboxViewMode = 'list' | 'grid';

const VIEW_MODE_KEY = 'later:inbox-view-mode';

const STATUS_TABS: { status: CaptureStatus; icon: string; label: string }[] = [
  { status: 'INBOX', icon: fileTrayFullOutline, label: 'Inbox' },
  { status: 'REVIEWED', icon: checkmarkCircleOutline, label: 'Reviewed' },
  { status: 'ARCHIVED', icon: archiveOutline, label: 'Archived' }
];

const getEmptyStateMessage = (status: CaptureStatus, desktopUx: boolean): string => {
  if (status === 'INBOX') {
    return desktopUx
      ? 'No captures yet. Paste a URL, drop a link, or use Quick Add.'
      : 'No captures yet. Use Quick Add or share a URL to save content.';
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
  const [toastMessage, setToastMessage] = useState('');
  const [capturing, setCapturing] = useState(false);
  const desktopUx = prefersDesktopUx();
  const { captures, loading, init, search, reload, statusFilter, statusCounts, setStatusFilter, addUrlCapture } =
    useCaptureStore(
      useShallow((state) => ({
        captures: state.captures,
        loading: state.loading,
        init: state.init,
        search: state.search,
        reload: state.reload,
        statusFilter: state.statusFilter,
        statusCounts: state.statusCounts,
        setStatusFilter: state.setStatusFilter,
        addUrlCapture: state.addUrlCapture
      }))
    );

  const captureUrl = useCallback(
    async (url: string) => {
      if (capturing) {
        return;
      }
      setCapturing(true);
      try {
        await addUrlCapture(url);
        setToastMessage('Link saved to inbox.');
        if (statusFilter !== 'INBOX') {
          await setStatusFilter('INBOX');
        } else {
          await reload({ silent: true });
        }
      } catch (error) {
        console.error('InboxPage: desktop capture failed', error);
        setToastMessage(formatSaveError(error));
      } finally {
        setCapturing(false);
      }
    },
    [addUrlCapture, capturing, reload, setStatusFilter, statusFilter]
  );

  const desktopCaptureHandlers = useMemo(
    () => ({
      onUrl: captureUrl,
      onFiles: async () => {
        setToastMessage('File drop is not supported yet — paste a URL or use Quick Add.');
      }
    }),
    [captureUrl]
  );

  const { isDragging } = useDesktopCapture(desktopCaptureHandlers, { enabled: isWebRuntime() });

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

  const openCapture = useCallback(
    (capture: Capture) => {
      history.push(`/capture/${capture.id}`);
    },
    [history]
  );

  return (
    <IonPage className={desktopUx ? 'inbox-page inbox-page--desktop' : 'inbox-page'}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="app-brand-title">Offload</IonTitle>
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
          <IonSegment className="inbox-status-segment" value={statusFilter} onIonChange={onStatusChange}>
            {STATUS_TABS.map(({ status, icon, label }) => (
              <IonSegmentButton
                key={status}
                value={status}
                aria-label={`${label} (${statusCounts[status]})`}
              >
                <div className="inbox-status-tab">
                  <IonIcon icon={icon} aria-hidden="true" />
                  <span className="inbox-status-tab__count">{statusCounts[status]}</span>
                </div>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Inbox</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="inbox-body">
          {desktopUx && (
            <p className="inbox-desktop-hint">Paste a URL anywhere, or drop a link onto this page.</p>
          )}
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
                aria-label={`Start review (${statusCounts.INBOX} captures)`}
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
          {loading || capturing ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <IonSpinner name="crescent" />
            </div>
          ) : captures.length === 0 ? (
            <div style={{ padding: '1.5rem' }}>
              <IonText color="medium">{getEmptyStateMessage(statusFilter, desktopUx)}</IonText>
            </div>
          ) : viewMode === 'grid' ? (
            <CaptureGrid captures={captures} onSelect={openCapture} />
          ) : (
            <IonList lines="none">
              {captures.map((capture) => (
                <CaptureListItem key={capture.id} capture={capture} onSelect={openCapture} />
              ))}
            </IonList>
          )}
        </div>
        {isDragging && (
          <div className="inbox-drop-overlay" aria-live="polite">
            Drop link to save
          </div>
        )}
        <IonToast
          isOpen={Boolean(toastMessage)}
          message={toastMessage}
          duration={2200}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default InboxPage;
