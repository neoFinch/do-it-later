import { useEffect, useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import {
  alertCircleOutline,
  checkmarkOutline,
  lockClosedOutline,
  openOutline
} from 'ionicons/icons';
import { AIAnalysis } from '../types/ai-analysis';
import { ANALYSIS_STAGES, CaptureProcessing } from '../types/capture-processing';
import { ContentDocument } from '../types/content-document';
import { INSTAGRAM_RESTRICTED_MESSAGE } from '../services/extractors/social-text';
import { getExtractedText } from '../utils/extracted-content';
import {
  getAiStepState,
  getExtractionStepState,
  type AiStepState,
  type ExtractionStepState
} from '../utils/processing-timeline';
import AiInsightsCards from './AiInsightsCards';
import ExtractedTextModal from './ExtractedTextModal';
import './CaptureProcessingTimeline.css';

interface CaptureProcessingTimelineProps {
  processing: CaptureProcessing | null;
  document: ContentDocument | null;
  analysis: AIAnalysis | null;
  extractionBusy: boolean;
  analysisBusy: boolean;
  offline?: boolean;
  missingThumbnail?: boolean;
  onRetryExtraction: () => void;
  onAnalyze: () => void;
  onOpenLink?: () => void;
  openLinkLabel?: string;
}

const extractionStatusMessage = (
  state: ExtractionStepState,
  processing: CaptureProcessing | null,
  document: ContentDocument | null,
  missingThumbnail?: boolean
): string => {
  if (state === 'completed') {
    const fullText = document ? getExtractedText(document) : '';
    if (missingThumbnail) {
      return fullText
        ? 'Caption ready. Preview image is still missing.'
        : 'Preview refreshed. Image still unavailable.';
    }
    return fullText ? 'Caption and transcript are ready.' : 'Content extracted successfully.';
  }

  if (state === 'processing') {
    return 'Fetching preview and extracted content…';
  }

  if (state === 'failed') {
    return processing?.extractionError ?? 'Could not extract content from this link.';
  }

  if (state === 'skipped') {
    return processing?.extractionError ?? 'Extraction skipped';
  }

  if (state === 'pending') {
    return 'Waiting to extract content from this link.';
  }

  return 'No extracted content yet.';
};

const aiStatusMessage = (
  state: AiStepState,
  processing: CaptureProcessing | null,
  analysis: AIAnalysis | null,
  offline: boolean
): string => {
  if (state === 'locked') {
    return 'Extract content first to unlock AI insights.';
  }

  if (analysis || state === 'completed') {
    return '';
  }

  if (offline && state !== 'processing') {
    return "You're offline. Connect to the internet to analyze this capture.";
  }

  if (state === 'processing') {
    const completedStages = processing
      ? ANALYSIS_STAGES.filter((stage) => processing[`${stage}Status`] === 'completed').length
      : 0;
    if (completedStages > 0) {
      return `Generating insights (${completedStages}/${ANALYSIS_STAGES.length} stages)…`;
    }
    return 'Generating insights…';
  }

  if (state === 'failed') {
    return processing?.analysisError ?? 'Analysis failed';
  }

  if (state === 'skipped') {
    return processing?.analysisError ?? 'Configure an AI provider in Settings to analyze content.';
  }

  return 'Ready to generate insights from the extracted content.';
};

const TimelineStepIcon: React.FC<{
  state: ExtractionStepState | AiStepState;
  busy?: boolean;
}> = ({ state, busy = false }) => {
  if (busy || state === 'processing') {
    return (
      <span className="processing-timeline__icon processing-timeline__icon--active">
        <IonSpinner name="crescent" />
      </span>
    );
  }

  if (state === 'completed') {
    return (
      <span className="processing-timeline__icon processing-timeline__icon--completed">
        <IonIcon icon={checkmarkOutline} aria-hidden="true" />
      </span>
    );
  }

  if (state === 'failed') {
    return (
      <span className="processing-timeline__icon processing-timeline__icon--failed">
        <IonIcon icon={alertCircleOutline} aria-hidden="true" />
      </span>
    );
  }

  if (state === 'locked') {
    return (
      <span className="processing-timeline__icon processing-timeline__icon--locked">
        <IonIcon icon={lockClosedOutline} aria-hidden="true" />
      </span>
    );
  }

  return <span className="processing-timeline__icon processing-timeline__icon--active" aria-hidden="true" />;
};

const CaptureProcessingTimeline: React.FC<CaptureProcessingTimelineProps> = ({
  processing,
  document,
  analysis,
  extractionBusy,
  analysisBusy,
  offline = false,
  missingThumbnail = false,
  onRetryExtraction,
  onAnalyze,
  onOpenLink,
  openLinkLabel
}) => {
  const [showFullText, setShowFullText] = useState(false);
  const fullText = document ? getExtractedText(document) : '';

  const extractionState = getExtractionStepState(processing, document, extractionBusy);
  const aiState = getAiStepState(processing, document, analysis, analysisBusy);

  const extractionMessage = extractionStatusMessage(extractionState, processing, document, missingThumbnail);
  const aiMessage = aiStatusMessage(aiState, processing, analysis, offline);

  const extractionFailed = extractionState === 'failed' && !document;
  const extractionRestricted =
    !!processing?.extractionError && processing.extractionError.includes('hid this post from scrapers');
  const showExtractRetry =
    extractionState === 'pending' ||
    extractionState === 'failed' ||
    extractionState === 'skipped' ||
    (extractionState === 'completed' && missingThumbnail);
  const showExtractCta = showExtractRetry;
  const showOpenLink = onOpenLink && (extractionFailed || extractionRestricted || missingThumbnail);

  const showAnalyzeCta =
    aiState !== 'locked' &&
    aiState !== 'processing' &&
    aiState !== 'completed' &&
    !offline;

  const showReanalyzeCta = aiState === 'completed' && !analysisBusy && !offline;

  useEffect(() => {
    setShowFullText(false);
  }, [document?.captureId, document?.extractedAt, fullText]);

  return (
    <section className="capture-detail__section processing-timeline">
      <h2 className="capture-detail__label processing-timeline__section-label">Processing</h2>

      <div className="processing-timeline__steps">
        <article
          className={`processing-timeline__step${
            extractionState === 'completed' ? ' processing-timeline__step--completed' : ''
          }`}
        >
          <div className="processing-timeline__rail">
            <TimelineStepIcon state={extractionState} busy={extractionBusy} />
          </div>
          <span className="processing-timeline__connector" aria-hidden="true" />
          <div
            className={`processing-timeline__body processing-timeline__body--card${
              extractionState === 'completed'
                ? ' processing-timeline__body--extract-success'
                : extractionFailed
                  ? ' processing-timeline__body--failed'
                  : ''
            }`}
          >
            <h3 className="processing-timeline__title">Extract content</h3>
            <p
              className={`processing-timeline__message${
                extractionFailed ? ' processing-timeline__message--danger' : ''
              }`}
            >
              {extractionMessage}
            </p>

            {extractionState === 'completed' && fullText && (
              <IonButton
                className="processing-timeline__view-text"
                fill="clear"
                size="small"
                color="primary"
                onClick={() => setShowFullText(true)}
              >
                View full text
              </IonButton>
            )}

            {(showExtractCta || showOpenLink) && (
              <div className="processing-timeline__actions">
                {showOpenLink && (
                  <IonButton fill="solid" color="dark" disabled={extractionBusy} onClick={onOpenLink}>
                    <IonIcon icon={openOutline} slot="start" />
                    {openLinkLabel ?? 'Open link'}
                  </IonButton>
                )}
                {showExtractCta && (
                  <IonButton
                    fill={extractionFailed ? 'solid' : 'outline'}
                    color={extractionFailed ? 'primary' : 'medium'}
                    disabled={extractionBusy}
                    onClick={onRetryExtraction}
                  >
                    {extractionBusy ? (
                      <IonSpinner name="crescent" />
                    ) : extractionFailed ? (
                      extractionRestricted ? 'Check again' : 'Try again'
                    ) : extractionState === 'pending' ? (
                      'Extract content'
                    ) : (
                      'Refresh'
                    )}
                  </IonButton>
                )}
              </div>
            )}

            {extractionFailed && processing?.extractionError && (
              <IonText color="danger">
                <p className="capture-extracted__error">
                  <IonIcon icon={alertCircleOutline} />{' '}
                  {processing.extractionError.includes('hid this post from scrapers')
                    ? INSTAGRAM_RESTRICTED_MESSAGE
                    : processing.extractionError}
                </p>
              </IonText>
            )}
          </div>
          <span className="processing-timeline__connector processing-timeline__connector--between-steps" aria-hidden="true" />
        </article>

        <article
          className={`processing-timeline__step${
            aiState === 'completed' ? ' processing-timeline__step--completed' : ''
          }`}
        >
          <div className="processing-timeline__rail">
            <TimelineStepIcon state={aiState} busy={analysisBusy} />
          </div>
          <span className="processing-timeline__connector" aria-hidden="true" />
          <div
            className={`processing-timeline__body processing-timeline__body--card${
              aiState === 'locked'
                ? ' processing-timeline__body--locked'
                : aiState === 'completed'
                  ? ' processing-timeline__body--ai-success'
                  : aiState === 'failed'
                    ? ' processing-timeline__body--failed'
                    : ''
            }`}
          >
            <h3 className="processing-timeline__title">AI insights</h3>
            {aiMessage && <p className="processing-timeline__message">{aiMessage}</p>}

            {(showAnalyzeCta || showReanalyzeCta) && (
              <div className="processing-timeline__actions">
                <IonButton
                  fill="solid"
                  color="primary"
                  disabled={analysisBusy || offline}
                  onClick={onAnalyze}
                >
                  {analysisBusy ? (
                    <IonSpinner name="crescent" />
                  ) : showReanalyzeCta ? (
                    'Re-analyze'
                  ) : (
                    'Generate insights'
                  )}
                </IonButton>
              </div>
            )}

            {aiState === 'failed' && processing?.analysisError && !analysis && (
              <IonText color="danger">
                <p className="ai-insights__error">
                  <IonIcon icon={alertCircleOutline} /> {processing.analysisError}
                </p>
              </IonText>
            )}

            {analysis && (
              <div className="processing-timeline__insights">
                <AiInsightsCards analysis={analysis} />
              </div>
            )}
          </div>
        </article>
      </div>

      <ExtractedTextModal isOpen={showFullText} text={fullText} onClose={() => setShowFullText(false)} />
    </section>
  );
};

export default CaptureProcessingTimeline;
