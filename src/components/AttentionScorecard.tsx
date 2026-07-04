import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { alertCircleOutline, refreshOutline } from 'ionicons/icons';
import { useMemo } from 'react';
import { buildAttentionScorecard, renderStars } from '../services/ai/attention-scorecard.service';
import { AIAnalysis } from '../types/ai-analysis';
import { CaptureProcessing } from '../types/capture-processing';

interface AttentionScorecardProps {
  processing: CaptureProcessing | null;
  analysis: AIAnalysis | null;
  busy: boolean;
  onAnalyze: () => void;
}

const analysisStatusMessage = (processing: CaptureProcessing | null, analysis: AIAnalysis | null): string => {
  if (analysis) {
    return 'Scorecard ready';
  }

  if (!processing) {
    return 'Waiting to analyze…';
  }

  if (processing.analysisStatus === 'processing') {
    return 'Building scorecard…';
  }

  if (processing.analysisStatus === 'failed') {
    return processing.analysisError ?? 'Analysis failed';
  }

  if (processing.analysisStatus === 'skipped') {
    return processing.analysisError ?? 'Analysis skipped';
  }

  if (processing.analysisStatus === 'pending') {
    return 'Ready for attention scorecard';
  }

  return 'No scorecard yet';
};

const recommendationClassName = (label: string): string => {
  if (label === 'Read Now') {
    return 'attention-scorecard__recommendation attention-scorecard__recommendation--now';
  }
  if (label === 'Skip') {
    return 'attention-scorecard__recommendation attention-scorecard__recommendation--skip';
  }
  return 'attention-scorecard__recommendation attention-scorecard__recommendation--later';
};

const AttentionScorecard: React.FC<AttentionScorecardProps> = ({
  processing,
  analysis,
  busy,
  onAnalyze
}) => {
  const scorecard = useMemo(() => (analysis ? buildAttentionScorecard(analysis) : null), [analysis]);

  return (
    <section className="capture-detail__section attention-scorecard">
      <div className="attention-scorecard__header">
        <h2 className="capture-detail__label">Attention Scorecard</h2>
        {!analysis && (
          <IonButton fill="clear" size="small" disabled={busy} onClick={onAnalyze}>
            {busy ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} slot="start" />}
            {busy ? 'Working…' : 'Analyze'}
          </IonButton>
        )}
      </div>

      {!scorecard ? (
        <div className="attention-scorecard__pending">
          {(busy || processing?.analysisStatus === 'processing') && <IonSpinner name="crescent" />}
          <IonText color="medium">
            <p>{analysisStatusMessage(processing, analysis)}</p>
          </IonText>
        </div>
      ) : (
        <>
          <div className="attention-scorecard__panel">
            <div className="attention-scorecard__hero">
              <p className="attention-scorecard__label">Worth Your Time</p>
              <p className="attention-scorecard__stars" aria-label={`${scorecard.worthYourTimeStars} out of 5 stars`}>
                {renderStars(scorecard.worthYourTimeStars)}
              </p>
              <p className={recommendationClassName(scorecard.recommendationLabel)}>
                {scorecard.recommendationLabel}
              </p>
            </div>

            <div className="attention-scorecard__grid">
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Confidence</p>
                <p className="attention-scorecard__value">{scorecard.confidencePercent}%</p>
              </div>
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Time</p>
                <p className="attention-scorecard__value">
                  {scorecard.estimatedTimeMinutes ? `${scorecard.estimatedTimeMinutes} min` : 'Unknown'}
                </p>
              </div>
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Learning Style</p>
                <p className="attention-scorecard__value">{scorecard.learningStyleLabel}</p>
              </div>
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Implementation</p>
                <p className="attention-scorecard__value">{scorecard.implementationLevelLabel}</p>
              </div>
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Expected Learning</p>
                <p
                  className="attention-scorecard__stars attention-scorecard__stars--compact"
                  aria-label={`${scorecard.expectedLearningStars} out of 5 stars`}
                >
                  {renderStars(scorecard.expectedLearningStars)}
                </p>
              </div>
              <div className="attention-scorecard__metric">
                <p className="attention-scorecard__label">Potential Disappointment</p>
                <p className="attention-scorecard__value">{scorecard.potentialDisappointmentLabel}</p>
              </div>
            </div>
          </div>

          {scorecard.youWillLearn.length > 0 && (
            <div className="attention-scorecard__section">
              <h3>You&apos;ll Learn</h3>
              <ul className="attention-scorecard__list attention-scorecard__list--positive">
                {scorecard.youWillLearn.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {scorecard.youWillNotLearn.length > 0 && (
            <div className="attention-scorecard__section">
              <h3>You Won&apos;t Learn</h3>
              <ul className="attention-scorecard__list attention-scorecard__list--negative">
                {scorecard.youWillNotLearn.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {scorecard.recommendationText && (
            <div className="attention-scorecard__section">
              <h3>Recommendation</h3>
              <p className="attention-scorecard__recommendation-text">{scorecard.recommendationText}</p>
            </div>
          )}

          <IonButton expand="block" fill="outline" color="medium" disabled={busy} onClick={onAnalyze}>
            <IonIcon icon={refreshOutline} slot="start" />
            Re-analyze
          </IonButton>
        </>
      )}

      {processing?.analysisStatus === 'failed' && !analysis && (
        <IonText color="danger">
          <p className="attention-scorecard__error">
            <IonIcon icon={alertCircleOutline} /> {processing.analysisError}
          </p>
        </IonText>
      )}
    </section>
  );
};

export default AttentionScorecard;
