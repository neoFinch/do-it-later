import {
  IonButton,
  IonChip,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonText
} from '@ionic/react';
import {
  alertCircleOutline,
  bulbOutline,
  codeSlashOutline,
  flaskOutline,
  refreshOutline,
  timeOutline
} from 'ionicons/icons';
import { AIAnalysis } from '../types/ai-analysis';
import { CaptureProcessing } from '../types/capture-processing';

interface CaptureUnderstandingProps {
  processing: CaptureProcessing | null;
  analysis: AIAnalysis | null;
  busy: boolean;
  onAnalyze: () => void;
}

const formatMinutes = (minutes: number | null): string | null => {
  if (!minutes) {
    return null;
  }
  return `${minutes} min`;
};

const analysisStatusMessage = (processing: CaptureProcessing | null, analysis: AIAnalysis | null): string => {
  if (analysis) {
    return 'Content understood';
  }

  if (!processing) {
    return 'Waiting to analyze…';
  }

  if (processing.analysisStatus === 'processing') {
    return 'Analyzing content…';
  }

  if (processing.analysisStatus === 'failed') {
    return processing.analysisError ?? 'Analysis failed';
  }

  if (processing.analysisStatus === 'skipped') {
    return processing.analysisError ?? 'Analysis skipped';
  }

  if (processing.analysisStatus === 'pending') {
    return 'Ready for AI analysis';
  }

  return 'No analysis yet';
};

const CaptureUnderstanding: React.FC<CaptureUnderstandingProps> = ({
  processing,
  analysis,
  busy,
  onAnalyze
}) => {
  const estimatedTime =
    formatMinutes(analysis?.estimatedWatchTime ?? null) ??
    formatMinutes(analysis?.estimatedReadingTime ?? null);

  return (
    <section className="capture-detail__section capture-understanding">
      <div className="capture-understanding__header">
        <h2 className="capture-detail__label">Understanding</h2>
        {!analysis && (
          <IonButton fill="clear" size="small" disabled={busy} onClick={onAnalyze}>
            {busy ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} slot="start" />}
            {busy ? 'Working…' : 'Analyze'}
          </IonButton>
        )}
      </div>

      {!analysis ? (
        <div className="capture-understanding__pending">
          {(busy || processing?.analysisStatus === 'processing') && <IonSpinner name="crescent" />}
          <IonText color="medium">
            <p>{analysisStatusMessage(processing, analysis)}</p>
          </IonText>
        </div>
      ) : (
        <>
          <p className="capture-understanding__summary">{analysis.summary}</p>

          <div className="capture-understanding__meta-row">
            <IonChip outline color="primary">
              {analysis.difficulty}
            </IonChip>
            <IonChip outline color="secondary">
              {analysis.contentType}
            </IonChip>
            {estimatedTime && (
              <IonChip outline color="medium">
                <IonIcon icon={timeOutline} />
                <IonLabel>{estimatedTime}</IonLabel>
              </IonChip>
            )}
            {analysis.containsCode && (
              <IonChip outline color="tertiary">
                <IonIcon icon={codeSlashOutline} />
                <IonLabel>Code</IonLabel>
              </IonChip>
            )}
            {analysis.containsHandsOn && (
              <IonChip outline color="success">
                <IonIcon icon={flaskOutline} />
                <IonLabel>Hands-on</IonLabel>
              </IonChip>
            )}
          </div>

          {analysis.topics.length > 0 && (
            <div className="capture-understanding__group">
              <h3>Topics</h3>
              <div className="capture-understanding__chips">
                {analysis.topics.map((topic) => (
                  <IonChip key={topic} color="primary">
                    {topic}
                  </IonChip>
                ))}
              </div>
            </div>
          )}

          {analysis.keyTakeaways.length > 0 && (
            <div className="capture-understanding__group">
              <h3>Key takeaways</h3>
              <IonList lines="none">
                {analysis.keyTakeaways.map((takeaway) => (
                  <IonItem key={takeaway}>
                    <IonIcon icon={bulbOutline} slot="start" color="warning" />
                    <IonLabel className="ion-text-wrap">{takeaway}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </div>
          )}

          {analysis.targetAudience.length > 0 && (
            <div className="capture-understanding__group">
              <h3>For</h3>
              <p>{analysis.targetAudience.join(' · ')}</p>
            </div>
          )}

          {analysis.reasoning && (
            <div className="capture-understanding__group">
              <h3>Why this matters</h3>
              <p>{analysis.reasoning}</p>
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
          <p className="capture-understanding__error">
            <IonIcon icon={alertCircleOutline} /> {processing.analysisError}
          </p>
        </IonText>
      )}
    </section>
  );
};

export default CaptureUnderstanding;
