import { useMemo, useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { alertCircleOutline, chevronDownOutline, chevronUpOutline, refreshOutline, colorWandOutline, colorWand } from 'ionicons/icons';
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
    return 'Ready for analysis';
  }

  return 'No scorecard yet';
};

const recommendationClassName = (label: string): string => {
  if (label === 'Read Now') {
    return 'attention-scorecard__verdict attention-scorecard__verdict--now';
  }
  if (label === 'Skip') {
    return 'attention-scorecard__verdict attention-scorecard__verdict--skip';
  }
  return 'attention-scorecard__verdict attention-scorecard__verdict--later';
};

const AttentionScorecard: React.FC<AttentionScorecardProps> = ({
  processing,
  analysis,
  busy,
  onAnalyze
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const scorecard = useMemo(() => (analysis ? buildAttentionScorecard(analysis) : null), [analysis]);

  const analyzeLabel = scorecard ? 'Re-analyze' : 'Analyze';

  return (
    <section className="capture-detail__section attention-scorecard">
      <div className="attention-scorecard__header">
        <h2 className="capture-detail__label attention-scorecard__title">Worth your time?</h2>
        <IonButton
          fill="clear"
          size="small"
          color="medium"
          disabled={busy}
          aria-label={analyzeLabel}
          onClick={onAnalyze}
        >
          {busy ?
            <IonSpinner name="crescent" /> :
            <span style={{ fontSize: '16px' }} >
              <IonIcon icon={colorWand} slot="icon-only" />
            </span>
          }
        </IonButton>
      </div>

      {!scorecard ? (
        <div className="attention-scorecard__pending">
          {(busy || processing?.analysisStatus === 'processing') && <IonSpinner name="crescent" />}
          <IonText color="medium">
            <p>{analysisStatusMessage(processing, analysis)}</p>
          </IonText>
        </div>
      ) : (
        <div className="attention-scorecard__panel">
          <div className="attention-scorecard__hero">
            <p className="attention-scorecard__stars" aria-label={`${scorecard.worthYourTimeStars} out of 5 stars`}>
              {renderStars(scorecard.worthYourTimeStars)}
            </p>
            <p className={recommendationClassName(scorecard.recommendationLabel)}>{scorecard.recommendationLabel}</p>
            {scorecard.recommendationText && (
              <p className="attention-scorecard__summary">{scorecard.recommendationText}</p>
            )}
            {scorecard.confidencePercent < 60 && (
              <p className="attention-scorecard__confidence-note">Based on limited extracted content.</p>
            )}
          </div>

          <IonButton
            fill="clear"
            size="small"
            color="medium"
            className="attention-scorecard__details-toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? 'Hide details' : 'More details'}
            <IonIcon icon={detailsOpen ? chevronUpOutline : chevronDownOutline} slot="end" />
          </IonButton>

          {detailsOpen && (
            <div className="attention-scorecard__details">
              <div className="attention-scorecard__grid">
                <div className="attention-scorecard__metric">
                  <p className="attention-scorecard__metric-label">Lens</p>
                  <p className="attention-scorecard__value">{scorecard.lensLabel}</p>
                </div>
                <div className="attention-scorecard__metric">
                  <p className="attention-scorecard__metric-label">Confidence</p>
                  <p className="attention-scorecard__value">{scorecard.confidencePercent}%</p>
                </div>
                <div className="attention-scorecard__metric">
                  <p className="attention-scorecard__metric-label">Time</p>
                  <p className="attention-scorecard__value">
                    {scorecard.estimatedTimeMinutes ? `${scorecard.estimatedTimeMinutes} min` : 'Unknown'}
                  </p>
                </div>
                {scorecard.highlightMetrics.map((metric) => (
                  <div className="attention-scorecard__metric" key={metric.label}>
                    <p className="attention-scorecard__metric-label">{metric.label}</p>
                    <p className="attention-scorecard__value">{metric.value}</p>
                  </div>
                ))}
                <div className="attention-scorecard__metric">
                  <p className="attention-scorecard__metric-label">Expected value</p>
                  <p
                    className="attention-scorecard__stars attention-scorecard__stars--compact"
                    aria-label={`${scorecard.expectedValueStars} out of 5 stars`}
                  >
                    {renderStars(scorecard.expectedValueStars)}
                  </p>
                </div>
                <div className="attention-scorecard__metric">
                  <p className="attention-scorecard__metric-label">Disappointment risk</p>
                  <p className="attention-scorecard__value">{scorecard.potentialDisappointmentLabel}</p>
                </div>
              </div>
            </div>
          )}
        </div>
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
