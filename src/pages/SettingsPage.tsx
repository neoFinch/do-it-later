import { useRef, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { downloadOutline, cloudUploadOutline } from 'ionicons/icons';
import {
  exportCaptures,
  importCaptures,
  isImportPickCanceled,
  pickBackupFileText,
  readBackupFileText
} from '../services/backup.service';
import { DEFAULT_AI_CONFIG, getAiConfig, saveAiConfig } from '../services/ai/ai-config.service';
import { OLLAMA_DEFAULT_MODEL } from '../services/ai/providers/ollama.provider';
import { listProviders } from '../services/ai/provider-registry';
import { ProviderId } from '../services/ai/ai-provider.types';
import { seedMockCaptures } from '../services/seed.service';
import { processStaleCaptures } from '../services/processing.service';
import { useCaptureStore } from '../store/captureStore';

const SettingsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [providerId, setProviderId] = useState<ProviderId>(() => getAiConfig().providerId);
  const [apiKey, setApiKey] = useState(() => getAiConfig().apiKey);
  const [model, setModel] = useState(() => getAiConfig().model);
  const [baseUrl, setBaseUrl] = useState(() => getAiConfig().baseUrl);
  const [autoAnalyze, setAutoAnalyze] = useState(() => getAiConfig().autoAnalyze);
  const { reload, repairDatabase } = useCaptureStore();
  const providers = listProviders();

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

  const handleImportBackup = async () => {
    let backupJson: string;
    try {
      backupJson = await pickBackupFileText();
    } catch (error) {
      if (isImportPickCanceled(error)) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Import pick failed', error);
      if (message.includes('pickFiles failed')) {
        setToastMessage('Could not open file picker. Reinstall the app and try again.');
      } else {
        setToastMessage('Could not read backup file.');
      }
      return;
    }

    setBusy(true);
    try {
      const result = await importCaptures(backupJson);
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

  const handleImportClick = async () => {
    if (Capacitor.isNativePlatform()) {
      await handleImportBackup();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusy(true);
    try {
      const json = await readBackupFileText(file);
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

  const handleRepairDatabase = async () => {
    setBusy(true);
    try {
      await repairDatabase();
      setToastMessage('Database repaired. Try saving again.');
    } catch (error) {
      console.error('Database repair failed', error);
      setToastMessage('Database repair failed. Clear app storage in Android settings.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAiSettings = async () => {
    saveAiConfig({
      providerId,
      apiKey: apiKey.trim(),
      model: model.trim() || DEFAULT_AI_CONFIG.model,
      baseUrl: baseUrl.trim(),
      autoAnalyze
    });
    setToastMessage('AI settings saved.');
    void processStaleCaptures(10);
  };

  const handleClearAiKey = () => {
    setApiKey('');
    saveAiConfig({
      providerId,
      apiKey: '',
      model: model.trim() || DEFAULT_AI_CONFIG.model,
      baseUrl: baseUrl.trim(),
      autoAnalyze
    });
    setToastMessage('API key cleared.');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonText color="medium">
          <h2>AI understanding</h2>
          <p>
            V2.0 extracts article text or YouTube transcripts, then analyzes content through a
            pluggable AI provider to produce structured metadata on each capture.
          </p>
        </IonText>
        <IonItem className="ion-margin-top">
          <IonSelect
            label="Provider"
            labelPlacement="stacked"
            value={providerId}
            onIonChange={(event) => setProviderId(event.detail.value as ProviderId)}
          >
            {providers.map((provider) => (
              <IonSelectOption key={provider.id} value={provider.id}>
                {provider.displayName}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        {providerId === 'openai' && (
          <IonItem>
            <IonInput
              label="OpenAI API key"
              labelPlacement="stacked"
              type="password"
              value={apiKey}
              placeholder="sk-..."
              onIonInput={(event) => setApiKey(event.detail.value ?? '')}
            />
          </IonItem>
        )}
        <IonItem>
          <IonInput
            label="Model"
            labelPlacement="stacked"
            value={model}
            placeholder={providerId === 'ollama' ? OLLAMA_DEFAULT_MODEL : DEFAULT_AI_CONFIG.model}
            onIonInput={(event) => setModel(event.detail.value ?? '')}
          />
        </IonItem>
        {providerId === 'ollama' && (
          <IonItem>
            <IonInput
              label="Ollama base URL"
              labelPlacement="stacked"
              value={baseUrl}
              placeholder="http://localhost:11434"
              onIonInput={(event) => setBaseUrl(event.detail.value ?? '')}
            />
          </IonItem>
        )}
        <IonItem lines="none">
          <IonLabel>Analyze new captures automatically</IonLabel>
          <IonToggle checked={autoAnalyze} onIonChange={(event) => setAutoAnalyze(event.detail.checked)} />
        </IonItem>
        <IonButton expand="block" color="primary" disabled={busy} onClick={handleSaveAiSettings}>
          Save AI settings
        </IonButton>
        {providerId === 'openai' && (
          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            disabled={busy || !apiKey}
            onClick={handleClearAiKey}
            className="ion-margin-top"
          >
            Clear API key
          </IonButton>
        )}

        <IonText color="medium">
          <h2 className="ion-margin-top">Data</h2>
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
          accept=".json,application/json,text/plain"
          hidden
          onChange={handleImportFile}
        />
        <IonButton
          expand="block"
          fill="outline"
          color="danger"
          disabled={busy}
          onClick={handleRepairDatabase}
          className="ion-margin-top"
        >
          Repair database
        </IonButton>
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
