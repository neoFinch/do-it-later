import { useCallback, useRef, useState } from 'react';
import { IonIcon, IonText } from '@ionic/react';
import { arrowBackOutline, arrowForwardOutline } from 'ionicons/icons';
import { Capture } from '../types/capture';
import { useCapturePreview } from '../hooks/useCapturePreview';
import { getCaptureDisplayTitle } from '../services/title.service';
import { formatRelativeSavedAt } from '../utils/format-date';
import './ReviewSwipeCard.css';

const SWIPE_THRESHOLD_PX = 88;
const TAP_MOVE_THRESHOLD_PX = 10;
const EXIT_ANIMATION_MS = 240;

type SwipeDirection = 'left' | 'right';

interface ReviewSwipeCardProps {
  capture: Capture;
  consumeLabel?: string | null;
  disabled?: boolean;
  onSave: () => void;
  onSkip: () => void;
  onOpen: () => void;
}

const ReviewSwipeCard: React.FC<ReviewSwipeCardProps> = ({
  capture,
  consumeLabel,
  disabled = false,
  onSave,
  onSkip,
  onOpen
}) => {
  const previewUrl = useCapturePreview(capture);
  const [hiddenPreview, setHiddenPreview] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const moved = useRef(false);
  const committed = useRef(false);

  const getExitOffset = (direction: SwipeDirection) => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 420;
    return direction === 'right' ? width * 0.95 : -width * 0.95;
  };

  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (disabled || committed.current) {
        return;
      }

      committed.current = true;
      setIsDragging(false);
      setIsAnimating(true);
      setDragX(getExitOffset(direction));

      window.setTimeout(() => {
        if (direction === 'right') {
          onSave();
        } else {
          onSkip();
        }
      }, EXIT_ANIMATION_MS);
    },
    [disabled, onSave, onSkip]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || committed.current || isAnimating) {
      return;
    }

    pointerStartX.current = event.clientX;
    pointerStartY.current = event.clientY;
    moved.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || committed.current) {
      return;
    }

    const deltaX = event.clientX - pointerStartX.current;
    const deltaY = event.clientY - pointerStartY.current;

    if (Math.abs(deltaX) > TAP_MOVE_THRESHOLD_PX || Math.abs(deltaY) > TAP_MOVE_THRESHOLD_PX) {
      moved.current = true;
    }

    // Slight resistance so the card doesn't feel overly sensitive.
    setDragX(deltaX * 0.92);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || committed.current) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    const deltaX = event.clientX - pointerStartX.current;

    if (!moved.current) {
      setDragX(0);
      onOpen();
      return;
    }

    if (deltaX >= SWIPE_THRESHOLD_PX) {
      commitSwipe('right');
      return;
    }

    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      commitSwipe('left');
      return;
    }

    setIsAnimating(true);
    setDragX(0);
    window.setTimeout(() => setIsAnimating(false), EXIT_ANIMATION_MS);
  };

  const onPointerCancel = () => {
    if (committed.current) {
      return;
    }
    setIsDragging(false);
    setIsAnimating(true);
    setDragX(0);
    window.setTimeout(() => setIsAnimating(false), EXIT_ANIMATION_MS);
  };

  const rotation = Math.max(-10, Math.min(10, dragX * 0.035));
  const saveOpacity = Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD_PX));
  const skipOpacity = Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD_PX));
  const cardTransition = isDragging ? 'none' : `transform ${EXIT_ANIMATION_MS}ms ease-out, opacity ${EXIT_ANIMATION_MS}ms ease-out`;
  const cardOpacity = committed.current ? 0 : 1;

  return (
    <div className="review-swipe">
      <div className="review-swipe__hint review-swipe__hint--skip" style={{ opacity: skipOpacity }}>
        <IonIcon icon={arrowBackOutline} aria-hidden="true" />
        Skip
      </div>
      <div className="review-swipe__hint review-swipe__hint--save" style={{ opacity: saveOpacity }}>
        Save
        <IonIcon icon={arrowForwardOutline} aria-hidden="true" />
      </div>

      <div
        className={[
          'review-swipe__card',
          isDragging ? 'review-swipe__card--dragging' : '',
          committed.current ? 'review-swipe__card--committed' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          transition: cardTransition,
          opacity: cardOpacity
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {previewUrl && !hiddenPreview ? (
          <div className="review-swipe__preview">
            <img src={previewUrl} alt="" onError={() => setHiddenPreview(true)} />
          </div>
        ) : (
          <div className="review-swipe__preview review-swipe__preview--placeholder" aria-hidden="true" />
        )}

        <div className="review-swipe__body">
          <IonText>
            <h2 className="review-swipe__title">{getCaptureDisplayTitle(capture)}</h2>
          </IonText>
          <div className="review-swipe__meta">
            {consumeLabel && <span>{consumeLabel}</span>}
            {consumeLabel && <span aria-hidden="true"> · </span>}
            <span>{formatRelativeSavedAt(capture.createdAt)}</span>
          </div>
        </div>

        <p className="review-swipe__tap-hint">Tap to open</p>
      </div>
    </div>
  );
};

export default ReviewSwipeCard;
