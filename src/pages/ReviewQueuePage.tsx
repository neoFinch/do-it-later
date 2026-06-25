import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  checkmarkCircleOutline,
  chevronForwardOutline,
  openOutline,
  trashOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { listCaptures } from '../services/capture.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { getCaptureLink, openLink } from '../services/link.service';

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

const formatSavedAt = (createdAt: number): string => {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Saved today';
  }
  if (diffDays === 1) {
    return 'Saved yesterday';
  }
  if (diffDays < 7) {
    return `Saved ${diffDays} days ago`;
  }
  return `Saved ${date.toLocaleDateString()}`;
};

const ReviewPreview: React.FC<{
  capture: Capture;
  captureLink?: string | null;
  onOpen?: () => void;
  disabled?: boolean;
}> = ({ capture, captureLink, onOpen, disabled }) => {
  const previewUrl = useCapturePreview(capture);
  const [hidden, setHidden] = useState(false);
  const canOpen = !!captureLink && !!onOpen;

  const openOverlay = canOpen ? (
    <IonButton
      fill="solid"
      disabled={disabled}
      aria-label="Open link"
      onClick={onOpen}
      style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        margin: 0,
        '--background': 'rgba(20, 20, 20, 0.92)',
        '--background-hover': 'rgba(20, 20, 20, 0.96)',
        '--background-activated': '#141414',
        '--color': '#ffffff',
        '--padding-start': '0.7rem',
        '--padding-end': '0.7rem',
        '--padding-top': '0.7rem',
        '--padding-bottom': '0.7rem',
        '--border-radius': '50%',
        '--box-shadow': '0 2px 8px rgba(0, 0, 0, 0.35)'
      }}
    >
      <IonIcon icon={openOutline} slot="icon-only" style={{ color: '#ffffff', fontSize: '1.2rem' }} />
    </IonButton>
  ) : null;

  if (!previewUrl || hidden) {
    if (!canOpen) {
      return null;
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IonButton
          fill="solid"
          disabled={disabled}
          aria-label="Open link"
          onClick={onOpen}
          style={{
            margin: 0,
            '--background': 'rgba(20, 20, 20, 0.92)',
            '--background-hover': 'rgba(20, 20, 20, 0.96)',
            '--background-activated': '#141414',
            '--color': '#ffffff',
            '--padding-start': '0.7rem',
            '--padding-end': '0.7rem',
            '--padding-top': '0.7rem',
            '--padding-bottom': '0.7rem',
            '--border-radius': '50%',
            '--box-shadow': '0 2px 8px rgba(0, 0, 0, 0.35)'
          }}
        >
          <IonIcon icon={openOutline} slot="icon-only" style={{ color: '#ffffff', fontSize: '1.2rem' }} />
        </IonButton>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <img
        src={previewUrl}
        alt=""
        onError={() => setHidden(true)}
        style={{ width: '100%', maxHeight: '40vh', objectFit: 'cover', display: 'block' }}
      />
      {openOverlay}
    </div>
  );
};

interface SessionStats {
  kept: number;
  dismissed: number;
  skipped: number;
}

type ReviewPhase = 'loading' | 'reviewing' | 'deferred' | 'complete';

const ReviewQueuePage: React.FC = () => {
  const history = useHistory();
  const { updateCaptureStatus, removeCapture } = useCaptureStore();
  const [activeQueue, setActiveQueue] = useState<Capture[]>([]);
  const [deferredQueue, setDeferredQueue] = useState<Capture[]>([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ kept: 0, dismissed: 0, skipped: 0 });

  const loadQueue = useCallback(async () => {
    setPhase('loading');
    const items = await listCaptures('INBOX');
    setActiveQueue(items);
    setDeferredQueue([]);
    setInitialTotal(items.length);
    setStats({ kept: 0, dismissed: 0, skipped: 0 });
    setPhase(items.length === 0 ? 'complete' : 'reviewing');
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (phase !== 'reviewing' || activeQueue.length > 0) {
      return;
    }
    if (deferredQueue.length > 0) {
      setPhase('deferred');
      return;
    }
    setPhase('complete');
  }, [phase, activeQueue.length, deferredQueue.length]);

  const current = activeQueue[0] ?? null;
  const captureLink = current ? getCaptureLink(current) : null;

  const position = useMemo(() => {
    if (initialTotal === 0 || !current) {
      return 0;
    }
    return initialTotal - activeQueue.length + 1;
  }, [initialTotal, activeQueue.length, current]);

  const removeCurrentFromActive = () => {
    setActiveQueue((prev) => prev.slice(1));
  };

  const handleKeep = async () => {
    if (!current || busy) {
      return;
    }
    setBusy(true);
    try {
      await updateCaptureStatus(current.id, 'REVIEWED');
      setStats((prev) => ({ ...prev, kept: prev.kept + 1 }));
      removeCurrentFromActive();
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async () => {
    if (!current || busy) {
      return;
    }
    setBusy(true);
    try {
      await removeCapture(current.id);
      setStats((prev) => ({ ...prev, dismissed: prev.dismissed + 1 }));
      removeCurrentFromActive();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (!current || busy) {
      return;
    }
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    setDeferredQueue((prev) => [...prev, current]);
    removeCurrentFromActive();
  };

  const handleOpen = async () => {
    if (!captureLink || busy) {
      return;
    }
    try {
      await openLink(captureLink);
    } catch (error) {
      console.error('ReviewQueuePage: failed to open link', error);
    }
  };

  const startDeferredReview = () => {
    setActiveQueue(deferredQueue);
    setDeferredQueue([]);
    setPhase('reviewing');
  };

  const exitToInbox = () => {
    history.replace('/');
  };

  if (phase === 'loading') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Review Queue</IonTitle>
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

  if (phase === 'deferred') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Review Queue</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '2rem' }}>
            <IonText>
              <h2 style={{ marginTop: 0 }}>Paused for now</h2>
            </IonText>
            <IonText color="medium">
              <p style={{ margin: 0 }}>
                You skipped {deferredQueue.length} item{deferredQueue.length === 1 ? '' : 's'}. They stay in your inbox
                until you keep or dismiss them.
              </p>
            </IonText>
            <IonButton expand="block" color="primary" onClick={exitToInbox}>
              Back to inbox
            </IonButton>
            <IonButton expand="block" fill="outline" color="medium" onClick={startDeferredReview}>
              Review skipped ({deferredQueue.length})
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (phase === 'complete') {
    const processed = stats.kept + stats.dismissed;
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Review Queue</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '2rem' }}>
            <IonText>
              <h2 style={{ marginTop: 0 }}>{initialTotal === 0 ? 'Inbox is clear' : 'Review complete'}</h2>
            </IonText>
            {initialTotal > 0 && (
              <IonText color="medium">
                <p style={{ margin: 0 }}>
                  Kept {stats.kept} · Dismissed {stats.dismissed} · Skipped {stats.skipped}
                </p>
                {processed > 0 && (
                  <p style={{ marginTop: '0.5rem' }}>
                    Processed {processed} item{processed === 1 ? '' : 's'}.
                  </p>
                )}
              </IonText>
            )}
            <IonButton expand="block" color="primary" onClick={exitToInbox}>
              Back to inbox
            </IonButton>
          </div>
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
          <IonTitle>Review Queue</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" color="medium" onClick={() => history.push(`/capture/${current!.id}`)}>
              Details
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonTitle size="small" color="medium">
            {position} of {initialTotal}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480, margin: '0 auto' }}>
            <ReviewPreview
              capture={current}
              captureLink={captureLink}
              disabled={busy}
              onOpen={captureLink ? handleOpen : undefined}
            />
            <div>
              <IonText>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', lineHeight: 1.3 }}>{getCaptureTitle(current)}</h2>
              </IonText>
              {current.source && current.type !== 'file' && (
                <IonText color="medium">
                  <p style={{ margin: 0 }}>{current.source}</p>
                </IonText>
              )}
              <IonText color="medium">
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{formatSavedAt(current.createdAt)}</p>
              </IonText>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <IonButton color="success" disabled={busy} onClick={handleKeep}>
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Keep
              </IonButton>
              <IonButton fill="outline" color="primary" disabled={busy} onClick={handleSkip}>
                Skip
                <IonIcon icon={chevronForwardOutline} slot="end" />
              </IonButton>
              <IonButton fill="outline" color="danger" disabled={busy} onClick={handleDismiss}>
                <IonIcon icon={trashOutline} slot="start" />
                Dismiss
              </IonButton>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ReviewQueuePage;
