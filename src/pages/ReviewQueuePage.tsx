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
import { arrowBackOutline, arrowForwardOutline, checkmarkCircleOutline, playOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import ReviewSwipeCard from '../components/ReviewSwipeCard';
import { listCaptures } from '../services/capture.service';
import { getCaptureLink, openLink } from '../services/link.service';
import {
  estimateReviewSession,
  getCaptureReviewMeta,
  ReviewSessionEstimate
} from '../services/review-session.service';
import { useCaptureStore } from '../store/captureStore';
import { Capture } from '../types/capture';
import './ReviewQueuePage.css';

interface SessionStats {
  saved: number;
  skipped: number;
}

type ReviewPhase = 'loading' | 'intro' | 'reviewing' | 'deferred' | 'complete';

const ReviewQueuePage: React.FC = () => {
  const history = useHistory();
  const { updateCaptureStatus } = useCaptureStore();
  const [activeQueue, setActiveQueue] = useState<Capture[]>([]);
  const [deferredQueue, setDeferredQueue] = useState<Capture[]>([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ saved: 0, skipped: 0 });
  const [estimate, setEstimate] = useState<ReviewSessionEstimate | null>(null);
  const [remainingEstimate, setRemainingEstimate] = useState<ReviewSessionEstimate | null>(null);
  const [consumeLabel, setConsumeLabel] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setPhase('loading');
    const items = await listCaptures('INBOX');
    const sessionEstimate = await estimateReviewSession(items);

    setActiveQueue(items);
    setDeferredQueue([]);
    setInitialTotal(items.length);
    setStats({ saved: 0, skipped: 0 });
    setEstimate(sessionEstimate);

    if (items.length === 0) {
      setPhase('complete');
      return;
    }

    setPhase('intro');
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

  useEffect(() => {
    if (!current) {
      setConsumeLabel(null);
      return;
    }

    let cancelled = false;

    void getCaptureReviewMeta(current.id).then((meta) => {
      if (!cancelled) {
        setConsumeLabel(meta.consumeLabel);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  useEffect(() => {
    if (phase !== 'reviewing' || activeQueue.length === 0) {
      setRemainingEstimate(null);
      return;
    }

    let cancelled = false;
    const queueSnapshot = activeQueue;

    void estimateReviewSession(queueSnapshot).then((sessionEstimate) => {
      if (!cancelled) {
        setRemainingEstimate(sessionEstimate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phase, activeQueue]);

  const reviewedCount = useMemo(() => {
    if (initialTotal === 0) {
      return 0;
    }
    return initialTotal - activeQueue.length;
  }, [initialTotal, activeQueue.length]);

  const remainingCount = activeQueue.length;

  const removeCurrentFromActive = () => {
    setActiveQueue((prev) => prev.slice(1));
  };

  const handleSave = async () => {
    if (!current || busy) {
      return;
    }

    const captureId = current.id;
    setStats((prev) => ({ ...prev, saved: prev.saved + 1 }));
    removeCurrentFromActive();

    setBusy(true);
    try {
      await updateCaptureStatus(captureId, 'REVIEWED');
    } catch (error) {
      console.error('ReviewQueuePage: failed to save capture', error);
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
    if (!current || busy) {
      return;
    }

    if (captureLink) {
      try {
        await openLink(captureLink);
      } catch (error) {
        console.error('ReviewQueuePage: failed to open link', error);
      }
      return;
    }

    history.push(`/capture/${current.id}`);
  };

  const startReview = () => {
    setPhase('reviewing');
  };

  const startDeferredReview = () => {
    const skipped = deferredQueue;
    setActiveQueue(skipped);
    setDeferredQueue([]);
    setInitialTotal(skipped.length);
    setPhase('reviewing');
  };

  const exitToInbox = () => {
    history.replace('/');
  };

  const header = (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/" />
        </IonButtons>
        <IonTitle>Daily Review</IonTitle>
      </IonToolbar>
    </IonHeader>
  );

  if (phase === 'loading') {
    return (
      <IonPage>
        {header}
        <IonContent fullscreen className="ion-padding review-page">
          <div className="review-page__center">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (phase === 'intro' && estimate) {
    return (
      <IonPage>
        {header}
        <IonContent fullscreen className="ion-padding review-page">
          <div className="review-intro">
            <h1 className="review-intro__title">Daily Review</h1>
            <p className="review-intro__stats">
              {estimate.captureCount} capture{estimate.captureCount === 1 ? '' : 's'} remaining
            </p>
            <p className="review-intro__duration">This will take {estimate.durationLabel}.</p>

            <IonButton expand="block" color="primary" className="review-intro__start" onClick={startReview}>
              <IonIcon icon={playOutline} slot="start" />
              Start review
            </IonButton>

            <ul className="review-intro__gestures">
              <li>Swipe left — Skip</li>
              <li>Swipe right — Save</li>
              <li>Tap — Open</li>
            </ul>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (phase === 'deferred') {
    return (
      <IonPage>
        {header}
        <IonContent fullscreen className="ion-padding review-page">
          <div className="review-summary">
            <IonText>
              <h2 className="review-summary__title">Paused for now</h2>
            </IonText>
            <IonText color="medium">
              <p className="review-summary__copy">
                You skipped {deferredQueue.length} item{deferredQueue.length === 1 ? '' : 's'}. They stay in your
                inbox until you save them in a future review.
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
    return (
      <IonPage>
        {header}
        <IonContent fullscreen className="ion-padding review-page">
          <div className="review-summary review-summary--complete">
            <IonIcon icon={checkmarkCircleOutline} className="review-summary__icon" aria-hidden="true" />
            <IonText>
              <h2 className="review-summary__title">
                {initialTotal === 0 ? 'Inbox is clear' : 'Daily review complete'}
              </h2>
            </IonText>
            {initialTotal > 0 && (
              <>
                <IonText color="medium">
                  <p className="review-summary__copy">
                    You reviewed {initialTotal} capture{initialTotal === 1 ? '' : 's'}.
                  </p>
                </IonText>
                <ul className="review-summary__stats">
                  <li>Saved {stats.saved}</li>
                  <li>Skipped {stats.skipped}</li>
                </ul>
                {stats.saved > 0 && (
                  <IonText color="medium">
                    <p className="review-summary__copy">Saved items are in Reviewed on the inbox.</p>
                  </IonText>
                )}
              </>
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
          <IonTitle>
            <div className="review-session-title">
              <span className="review-session-title__primary">{remainingCount} remaining</span>
              <span className="review-session-title__secondary">
                {reviewedCount} reviewed
                {remainingEstimate ? ` · ${remainingEstimate.durationLabel} left` : ''}
              </span>
            </div>
          </IonTitle>
          {current && (
            <IonButtons slot="end">
              <IonButton fill="clear" color="medium" onClick={() => history.push(`/capture/${current.id}`)}>
                Details
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="review-page review-page--session">
        {current && (
          <div className="review-session">
            <ReviewSwipeCard
              key={current.id}
              capture={current}
              consumeLabel={consumeLabel}
              disabled={busy}
              onSave={handleSave}
              onSkip={handleSkip}
              onOpen={handleOpen}
            />

            <div className="review-session__actions">
              <IonButton fill="outline" color="medium" disabled={busy} onClick={handleSkip}>
                <IonIcon icon={arrowBackOutline} slot="start" />
                Skip
              </IonButton>
              <IonButton color="success" disabled={busy} onClick={handleSave}>
                Save
                <IonIcon icon={arrowForwardOutline} slot="end" />
              </IonButton>
            </div>

            <p className="review-session__legend">Swipe left to skip · Swipe right to save · Tap to open</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ReviewQueuePage;
