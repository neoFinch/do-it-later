import { IonIcon } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => (
  <div className="offline-banner" role="status" aria-live="polite">
    <IonIcon icon={cloudOfflineOutline} aria-hidden="true" />
    <span>You're offline — connect to the internet for AI analysis and link previews.</span>
  </div>
);

export default OfflineBanner;
