import { useEffect, useRef, useState } from 'react';
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
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { cloudUploadOutline, downloadOutline } from 'ionicons/icons';
import {
  exportCaptures,
  importCaptures,
  isImportPickCanceled,
  pickBackupFileText,
  readBackupFileText
} from '../services/backup.service';
import { DEFAULT_AI_CONFIG, getAiConfig, saveAiConfig } from '../services/ai/ai-config.service';
import { OLLAMA_DEFAULT_MODEL } from '../services/ai/providers/ollama.provider';
import {
  downloadLocalLlmModel,
  getCachedLocalLlmAvailability,
  refreshLocalLlmAvailability
} from '../services/ai/providers/local-llm.provider';
import { listProviders } from '../services/ai/provider-registry';
import { LocalLlmAvailability, ProviderId } from '../services/ai/ai-provider.types';
import { seedMockCaptures } from '../services/seed.service';
import { processStaleCaptures } from '../services/processing.service';
import { useCaptureStore } from '../store/captureStore';
import { getActiveTheme, saveTheme } from '../services/theme.service';
import './SettingsPage.css';

const localLlmStatusLabel = (status: LocalLlmAvailability): string => {
  switch (status) {
    case 'available':
      return 'Ready on this device';
    case 'downloadable':
      return 'Model can be downloaded';
    case 'notready':
      return 'Model is downloading or initializing';
    case 'unavailable':
      return 'Not available on this device / platform';
    default:
      return 'Checking availability…';
  }
};

const SettingsPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [providerId, setProviderId] = useState<ProviderId>(() => getAiConfig().providerId);
  const [apiKey, setApiKey] = useState(() => getAiConfig().apiKey);
  const [model, setModel] = useState(() => getAiConfig().model);
  const [baseUrl, setBaseUrl] = useState(() => getAiConfig().baseUrl);
  const [autoAnalyze, setAutoAnalyze] = useState(() => getAiConfig().autoAnalyze);
  const [darkMode, setDarkMode] = useState(() => getActiveTheme() === 'dark');
  const [replaceSampleData, setReplaceSampleData] = useState(false);
  const [localLlmStatus, setLocalLlmStatus] = useState<LocalLlmAvailability>(() =>
    getCachedLocalLlmAvailability()
  );
  const { reload, repairDatabase } = useCaptureStore();
  const providers = listProviders();
  const aiSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistAiConfig = (next: {
    providerId?: ProviderId;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    autoAnalyze?: boolean;
  }) => {
    const config = {
      providerId: next.providerId ?? providerId,
      apiKey: (next.apiKey ?? apiKey).trim(),
      model: (next.model ?? model).trim() || DEFAULT_AI_CONFIG.model,
      baseUrl: (next.baseUrl ?? baseUrl).trim(),
      autoAnalyze: next.autoAnalyze ?? autoAnalyze
    };
    saveAiConfig(config);
    void processStaleCaptures(10);
  };

  const scheduleAiSave = (next: {
    providerId?: ProviderId;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    autoAnalyze?: boolean;
  }) => {
    if (aiSaveTimer.current) {
      clearTimeout(aiSaveTimer.current);
    }
    aiSaveTimer.current = setTimeout(() => {
      persistAiConfig(next);
      setToastMessage('AI settings saved.');
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (aiSaveTimer.current) {
        clearTimeout(aiSaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshLocalLlmAvailability().then((status) => {
      if (!cancelled) {
        setLocalLlmStatus(status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadLocalLlm = async () => {
    setBusy(true);
    try {
      await downloadLocalLlmModel();
      const status = await refreshLocalLlmAvailability();
      setLocalLlmStatus(status);
      setToastMessage(
        status === 'available' ? 'On-device model ready.' : `On-device model status: ${status}`
      );
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

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

  const handleLoadSampleData = async () => {
    setBusy(true);
    try {
      const result = await seedMockCaptures({ replace: replaceSampleData });
      await reload();
      const action = replaceSampleData ? 'Replaced with' : 'Loaded';
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

  const handleDarkModeChange = (checked: boolean) => {
    setDarkMode(checked);
    saveTheme(checked ? 'dark' : 'light');
  };

  const handleAutoAnalyzeChange = (checked: boolean) => {
    setAutoAnalyze(checked);
    persistAiConfig({ autoAnalyze: checked });
    setToastMessage(checked ? 'Auto-analyze on.' : 'Auto-analyze off.');
  };

  const handleClearAiKey = () => {
    setApiKey('');
    persistAiConfig({ apiKey: '' });
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
      <IonContent fullscreen className="settings-page">
        <section className="settings-section">
          <h2 className="settings-section__title">Appearance</h2>
          <p className="settings-section__desc">Theme preference is saved on this device.</p>
          <IonList className="settings-section__list" lines="none">
            <IonItem lines="none">
              <IonLabel>Dark mode</IonLabel>
              <IonToggle
                slot="end"
                checked={darkMode}
                onIonChange={(event) => handleDarkModeChange(event.detail.checked)}
              />
            </IonItem>
          </IonList>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">AI understanding</h2>
          <p className="settings-section__desc">
            Extract and analyze captures through a pluggable AI provider. OpenAI and Ollama are the
            default path; on-device Local LLM is experimental and falls back when unavailable.
            Changes save automatically.
          </p>
          <IonList className="settings-section__list" lines="full">
            <IonItem>
              <IonSelect
                label="Provider"
                labelPlacement="stacked"
                interface="popover"
                value={providerId}
                onIonChange={(event) => {
                  const next = event.detail.value as ProviderId;
                  setProviderId(next);
                  scheduleAiSave({ providerId: next });
                  if (next === 'local-llm') {
                    void refreshLocalLlmAvailability().then(setLocalLlmStatus);
                  }
                }}
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
                  onIonInput={(event) => {
                    const next = event.detail.value ?? '';
                    setApiKey(next);
                    scheduleAiSave({ apiKey: next });
                  }}
                />
              </IonItem>
            )}
            {providerId !== 'local-llm' && (
              <IonItem>
                <IonInput
                  label="Model"
                  labelPlacement="stacked"
                  value={model}
                  placeholder={providerId === 'ollama' ? OLLAMA_DEFAULT_MODEL : DEFAULT_AI_CONFIG.model}
                  onIonInput={(event) => {
                    const next = event.detail.value ?? '';
                    setModel(next);
                    scheduleAiSave({ model: next });
                  }}
                />
              </IonItem>
            )}
            {providerId === 'ollama' && (
              <IonItem>
                <IonInput
                  label="Ollama base URL"
                  labelPlacement="stacked"
                  value={baseUrl}
                  placeholder="http://localhost:11434"
                  onIonInput={(event) => {
                    const next = event.detail.value ?? '';
                    setBaseUrl(next);
                    scheduleAiSave({ baseUrl: next });
                  }}
                />
              </IonItem>
            )}
            {providerId === 'local-llm' && (
              <IonItem lines="none">
                <IonLabel className="ion-text-wrap">
                  <h3>On-device status</h3>
                  <p>{localLlmStatusLabel(localLlmStatus)}</p>
                </IonLabel>
              </IonItem>
            )}
            <IonItem lines="none">
              <IonLabel>Analyze new captures automatically</IonLabel>
              <IonToggle
                slot="end"
                checked={autoAnalyze}
                onIonChange={(event) => handleAutoAnalyzeChange(event.detail.checked)}
              />
            </IonItem>
          </IonList>
          {providerId === 'local-llm' && localLlmStatus === 'downloadable' && (
            <IonButton
              fill="clear"
              color="medium"
              className="settings-link-button"
              disabled={busy}
              onClick={() => void handleDownloadLocalLlm()}
            >
              Download on-device model
            </IonButton>
          )}
          {providerId === 'openai' && apiKey && (
            <IonButton
              fill="clear"
              color="medium"
              className="settings-link-button"
              disabled={busy}
              onClick={handleClearAiKey}
            >
              Clear API key
            </IonButton>
          )}
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Data</h2>
          <p className="settings-section__desc">
            Export a JSON backup, or import one to merge captures. Duplicates are skipped.
          </p>
          <div className="settings-section__actions">
            <IonButton expand="block" fill="outline" color="medium" disabled={busy} onClick={handleExport}>
              <IonIcon icon={downloadOutline} slot="start" />
              Export captures
            </IonButton>
            <IonButton expand="block" fill="solid" color="primary" disabled={busy} onClick={handleImportClick}>
              <IonIcon icon={cloudUploadOutline} slot="start" />
              Import captures
            </IonButton>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain"
            hidden
            onChange={handleImportFile}
          />
          <p className="settings-section__hint">
            Need a reset? Repair rebuilds the local database if saves start failing.
          </p>
          <IonButton
            fill="clear"
            color="danger"
            className="settings-link-button"
            disabled={busy}
            onClick={handleRepairDatabase}
          >
            Repair database
          </IonButton>
        </section>

        {import.meta.env.DEV && (
          <section className="settings-section">
            <h2 className="settings-section__title">Development</h2>
            <p className="settings-section__desc">
              Load captures from <code>mock-data/mock-capture-data.json</code> for UI testing.
            </p>
            <IonList className="settings-section__list" lines="none">
              <IonItem>
                <IonLabel>Replace existing captures</IonLabel>
                <IonToggle
                  slot="end"
                  checked={replaceSampleData}
                  onIonChange={(event) => setReplaceSampleData(event.detail.checked)}
                />
              </IonItem>
            </IonList>
            <div className="settings-section__actions">
              <IonButton expand="block" fill="outline" color="medium" disabled={busy} onClick={handleLoadSampleData}>
                {replaceSampleData ? 'Replace with sample data' : 'Load sample data'}
              </IonButton>
            </div>
          </section>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={2500}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
