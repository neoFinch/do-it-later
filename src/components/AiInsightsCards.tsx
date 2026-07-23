import { useMemo } from 'react';
import { buildAiInsightsView } from '../services/ai/ai-insights.service';
import { AIAnalysis } from '../types/ai-analysis';
import './CaptureAiInsights.css';

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

interface AiInsightsCardsProps {
  analysis: AIAnalysis;
}

const AiInsightsCards: React.FC<AiInsightsCardsProps> = ({ analysis }) => {
  const insights = useMemo(() => buildAiInsightsView(analysis), [analysis]);

  return (
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
  );
};

export default AiInsightsCards;
