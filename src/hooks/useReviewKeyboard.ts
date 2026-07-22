import { useEffect, useRef } from 'react';
import { isEditableKeyboardTarget } from '../utils/platform';

export interface ReviewKeyboardHandlers {
  onStart?: () => void;
  onSave?: () => void;
  onSkip?: () => void;
  onOpen?: () => void;
  onDetails?: () => void;
  onExit?: () => void;
  onReviewSkipped?: () => void;
}

type ReviewKeyboardPhase = 'intro' | 'reviewing' | 'deferred' | 'complete';

export const useReviewKeyboard = (
  phase: ReviewKeyboardPhase | 'loading',
  handlers: ReviewKeyboardHandlers,
  enabled = true
): void => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || phase === 'loading') {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const key = event.key;
      const current = handlersRef.current;

      if (phase === 'intro') {
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          current.onStart?.();
        }
        return;
      }

      if (phase === 'deferred') {
        if (key === 'Enter') {
          event.preventDefault();
          current.onReviewSkipped?.();
          return;
        }
        if (key === 'Escape') {
          event.preventDefault();
          current.onExit?.();
        }
        return;
      }

      if (phase === 'complete') {
        if (key === 'Enter' || key === 'Escape') {
          event.preventDefault();
          current.onExit?.();
        }
        return;
      }

      if (phase !== 'reviewing') {
        return;
      }

      if (key === 'ArrowRight' || key === 's' || key === 'S' || key === 'l' || key === 'L') {
        event.preventDefault();
        current.onSave?.();
        return;
      }

      if (key === 'ArrowLeft' || key === 'x' || key === 'X' || key === 'h' || key === 'H') {
        event.preventDefault();
        current.onSkip?.();
        return;
      }

      if (key === 'Enter' || key === 'o' || key === 'O') {
        event.preventDefault();
        current.onOpen?.();
        return;
      }

      if (key === 'd' || key === 'D') {
        event.preventDefault();
        current.onDetails?.();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        current.onExit?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, enabled]);
};
