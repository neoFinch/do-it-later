import { useRef, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/react';
import { downloadOutline, cloudUploadOutline } from 'ionicons/icons';
import { exportCaptures, importCaptures } from '../services/backup.service';
import { seedMockCaptures } from '../services/seed.service';
import { useCaptureStore } from '../store/captureStore';

const SettingsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { reload } = useCaptureStore();

  const handleExport = async () => {
    setBusy(true);
    try {
      const { count, fileName } = await exportCaptures();
      setToastMessage(`Exported ${count} capture${count === 1 ? '' : 's'} to ${fileName}.`);
    } catch (error) {
      console.error('Export failed', error);
      setToastMessage('Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSampleData = async (replace: boolean) => {
    setBusy(true);
    try {
      const result = await seedMockCaptures({ replace });
      await reload();
      const action = replace ? 'Replaced with' : 'Loaded';
      setToastMessage(
        `${action} sample data: ${result.imported} added, ${result.skipped} skipped, ${result.failed} invalid.`
      );
    } catch (error) {
      console.error('Sample data load failed', error);
      setToastMessage('Failed to load sample data.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusy(true);
    try {
      const json = await file.text();
      const result = await importCaptures(json);
      await reload();
      setToastMessage(
        `Import complete: ${result.imported} added, ${result.skipped} skipped, ${result.failed} invalid.`
      );
    } catch (error) {
      console.error('Import failed', error);
      setToastMessage('Import failed. Check that the file is a valid backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Data</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonText color="medium">
          <p>
            Export your captures to a JSON backup file, or import a backup to merge items into this
            device. Existing captures are kept; duplicates are skipped.
          </p>
        </IonText>
        <IonButton
          expand="block"
          fill="outline"
          color="secondary"
          disabled={busy}
          onClick={handleExport}
          className="ion-margin-top"
        >
          <IonIcon icon={downloadOutline} slot="start" />
          Export captures
        </IonButton>
        <IonButton
          expand="block"
          color="success"
          disabled={busy}
          onClick={handleImportClick}
          className="ion-margin-top"
        >
          <IonIcon icon={cloudUploadOutline} slot="start" />
          Import captures
        </IonButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportFile}
        />
        {import.meta.env.DEV && (
          <>
            <IonText color="medium">
              <p className="ion-margin-top">
                Development: load captures from <code>mock-data/mock-capture-data.json</code> for UI
                testing.
              </p>
            </IonText>
            <IonButton
              expand="block"
              fill="outline"
              color="tertiary"
              disabled={busy}
              onClick={() => handleLoadSampleData(false)}
              className="ion-margin-top"
            >
              Load sample data
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              color="warning"
              disabled={busy}
              onClick={() => handleLoadSampleData(true)}
              className="ion-margin-top"
            >
              Replace with sample data
            </IonButton>
          </>
        )}
        <IonToast isOpen={!!toastMessage} message={toastMessage} duration={2500} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
