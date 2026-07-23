import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';

interface ExtractedTextModalProps {
  isOpen: boolean;
  text: string;
  onClose: () => void;
}

const ExtractedTextModal: React.FC<ExtractedTextModalProps> = ({ isOpen, text, onClose }) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Extracted content</IonTitle>
        <IonButtons slot="end">
          <IonButton aria-label="Close" onClick={onClose}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding capture-extracted__modal-content">
      <p className="capture-extracted__full-text">{text}</p>
    </IonContent>
  </IonModal>
);

export default ExtractedTextModal;
