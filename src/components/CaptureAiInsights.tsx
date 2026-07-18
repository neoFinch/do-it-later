import { useMemo } from 'react';
import { IonButton, IonIcon, IonSpinner, IonText } from '@ionic/react';
import { alertCircleOutline, colorWand } from 'ionicons/icons';
import { buildAiInsightsView } from '../services/ai/ai-insights.service';
import { AIAnalysis } from '../types/ai-analysis';
import { ANALYSIS_STAGES, CaptureProcessing } from '../types/capture-processing';
import './CaptureAiInsights.css';

interface CaptureAiInsightsProps {
  processing: CaptureProcessing | null;
  analysis: AIAnalysis | null;
  busy: boolean;
  onAnalyze: () => void;
}

const analysisStatusMessage = (processing: CaptureProcessing | null, analysis: AIAnalysis | null): string => {
  if (analysis) {
    return '';
  }

  if (!processing) {
    return 'Waiting to analyze…';
  }

  if (processing.analysisStatus === 'processing') {
    const completedStages = ANALYSIS_STAGES.filter(
      (stage) => processing[`${stage}Status`] === 'completed'
    ).length;
    if (completedStages > 0) {
      return `Generating insights (${completedStages}/${ANALYSIS_STAGES.length} stages)…`;
    }
    return 'Generating insights…';
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

  return 'No insights yet';
};

const recommendationClassName = (label: string): string => {
  const normalized = label.toLowerCase();
  if (normalized === 'read now') {
    return 'ai-insights__recommendation ai-insights__recommendation--now';
  }
  if (normalized === 'skip') {
    return 'ai-insights__recommendation ai-insights__recommendation--skip';
  }
  return 'ai-insights__recommendation ai-insights__recommendation--later';
};

const InsightCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <article className="ai-insights__card">
    <h3 className="ai-insights__card-title">{title}</h3>
    <div className="ai-insights__card-body">{children}</div>
  </article>
);

const CaptureAiInsights: React.FC<CaptureAiInsightsProps> = ({
  processing,
  analysis,
  busy,
  onAnalyze
}) => {
  const insights = useMemo(() => (analysis ? buildAiInsightsView(analysis) : null), [analysis]);
  const analyzeLabel = insights ? 'Re-analyze' : 'Analyze';
  const statusMessage = analysisStatusMessage(processing, analysis);
  const isProcessing = busy || processing?.analysisStatus === 'processing';

  return (
    <section className="capture-detail__section ai-insights">
      <div className="ai-insights__header">
        <div>
          <h2 className="capture-detail__label ai-insights__eyebrow">AI Insights</h2>
          <p className="ai-insights__subtitle">Understand, classify, enrich, and evaluate this capture.</p>
        </div>
        <IonButton
          fill="clear"
          size="small"
          color="medium"
          disabled={busy}
          aria-label={analyzeLabel}
          onClick={onAnalyze}
        >
          {busy ? (
            <IonSpinner name="crescent" />
          ) : (
            <IonIcon icon={colorWand} slot="icon-only" />
          )}
        </IonButton>
      </div>

      {!insights ? (
        <div className="ai-insights__pending">
          {isProcessing && <IonSpinner name="crescent" />}
          {statusMessage && (
            <IonText color="medium">
              <p>{statusMessage}</p>
            </IonText>
          )}
        </div>
      ) : (
        <div className="ai-insights__stack">
          <InsightCard title="Overview">
            {insights.understand.summary ? (
              <p className="ai-insights__summary">{insights.understand.summary}</p>
            ) : (
              <p className="ai-insights__muted">No summary available.</p>
            )}

            {insights.understand.topics.length > 0 && (
              <div className="ai-insights__chips" aria-label="Topics">
                {insights.understand.topics.map((topic) => (
                  <span className="ai-insights__chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            )}

            <div className="ai-insights__meta-row">
              {insights.understand.targetAudience.length > 0 && (
                <p className="ai-insights__meta">
                  <span className="ai-insights__meta-label">Audience</span>
                  {insights.understand.targetAudience.join(', ')}
                </p>
              )}
              {insights.understand.estimatedTimeLabel && (
                <p className="ai-insights__meta">
                  <span className="ai-insights__meta-label">Time</span>
                  {insights.understand.estimatedTimeLabel}
                </p>
              )}
            </div>
          </InsightCard>

          <InsightCard title="Classification">
            <div className="ai-insights__badges">
              <span className="ai-insights__badge">{insights.classify.lensLabel}</span>
              <span className="ai-insights__badge ai-insights__badge--muted">
                {insights.classify.contentTypeLabel}
              </span>
            </div>
          </InsightCard>

          {(insights.enrich.youWillGet.length > 0 ||
            insights.enrich.youWillNotGet.length > 0 ||
            insights.enrich.lensMetrics.length > 0) && (
            <InsightCard title="What to expect">
              {insights.enrich.youWillGet.length > 0 && (
                <div className="ai-insights__list-block">
                  <p className="ai-insights__list-heading">You&apos;ll get</p>
                  <ul className="ai-insights__list ai-insights__list--positive">
                    {insights.enrich.youWillGet.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.enrich.youWillNotGet.length > 0 && (
                <div className="ai-insights__list-block">
                  <p className="ai-insights__list-heading">You won&apos;t get</p>
                  <ul className="ai-insights__list ai-insights__list--negative">
                    {insights.enrich.youWillNotGet.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.enrich.lensMetrics.length > 0 && (
                <div className="ai-insights__metric-grid">
                  {insights.enrich.lensMetrics.map((metric) => (
                    <div className="ai-insights__metric" key={metric.label}>
                      <p className="ai-insights__metric-label">{metric.label}</p>
                      <p className="ai-insights__metric-value">{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </InsightCard>
          )}

          <InsightCard title="Recommendation">
            <p className={recommendationClassName(insights.evaluate.recommendationLabel)}>
              {insights.evaluate.recommendationLabel}
            </p>
            {insights.evaluate.recommendationText && (
              <p className="ai-insights__recommendation-copy">{insights.evaluate.recommendationText}</p>
            )}

            <div className="ai-insights__metric-grid ai-insights__metric-grid--evaluate">
              <div className="ai-insights__metric">
                <p className="ai-insights__metric-label">Expected value</p>
                <p className="ai-insights__metric-value">{insights.evaluate.expectedValueLabel}</p>
              </div>
              <div className="ai-insights__metric">
                <p className="ai-insights__metric-label">Disappointment risk</p>
                <p className="ai-insights__metric-value">{insights.evaluate.disappointmentLabel}</p>
              </div>
              <div className="ai-insights__metric">
                <p className="ai-insights__metric-label">Confidence</p>
                <p className="ai-insights__metric-value">{insights.evaluate.confidencePercent}%</p>
              </div>
            </div>

            {insights.evaluate.confidencePercent < 60 && (
              <p className="ai-insights__confidence-note">Based on limited extracted content.</p>
            )}

            {insights.evaluate.reasoning && (
              <p className="ai-insights__reasoning">{insights.evaluate.reasoning}</p>
            )}
          </InsightCard>
        </div>
      )}

      {processing?.analysisStatus === 'failed' && !analysis && (
        <IonText color="danger">
          <p className="ai-insights__error">
            <IonIcon icon={alertCircleOutline} /> {processing.analysisError}
          </p>
        </IonText>
      )}
    </section>
  );
};

export default CaptureAiInsights;
