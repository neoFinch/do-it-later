import { useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonToast,
  IonIcon
} from '@ionic/react';
import { useCaptureStore } from '../store/captureStore';
import { useHistory } from 'react-router-dom';
import { arrowBackOutline } from 'ionicons/icons';
import { readIonInputValue, readIonTextareaValue } from '../utils/ion-field';
import { formatSaveError } from '../utils/save-error';

type CaptureMode = 'link' | 'note';

const QuickAddPage: React.FC = () => {
  const history = useHistory();
  const { addUrlCapture, addNoteCapture, init } = useCaptureStore();
  const [mode, setMode] = useState<CaptureMode>('link');
  const [urlTitle, setUrlTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const urlTitleRef = useRef<HTMLIonInputElement>(null);
  const urlRef = useRef<HTMLIonInputElement>(null);
  const noteRef = useRef<HTMLIonTextareaElement>(null);

  useEffect(() => {
    void init().catch((error) => {
      console.error('QuickAddPage: init failed', error);
    });
  }, [init]);

  const saveUrl = async () => {
    const nextUrl = await readIonInputValue(urlRef, url);
    if (!nextUrl) {
      setToastMessage('Enter a URL to save.');
      return;
    }

    const nextTitle = await readIonInputValue(urlTitleRef, urlTitle);

    setBusy(true);
    try {
      await addUrlCapture(nextUrl, nextTitle || null);
      setUrlTitle('');
      setUrl('');
      setToastMessage('Link saved to inbox.');
      history.push('/');
    } catch (error) {
      console.error('QuickAddPage: save URL failed', error);
      setToastMessage(formatSaveError(error));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    const nextNote = await readIonTextareaValue(noteRef, note);
    if (!nextNote) {
      setToastMessage('Enter note content before saving.');
      return;
    }

    setBusy(true);
    try {
      await addNoteCapture(nextNote);
      setNote('');
      setToastMessage('Note saved to inbox.');
      history.push('/');
    } catch (error) {
      console.error('QuickAddPage: save note failed', error);
      setToastMessage(formatSaveError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Quick Add</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="start" color="primary"></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value as CaptureMode)}>
            <IonSegmentButton value="link">
              <IonLabel>Link</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="note">
              <IonLabel>Note</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {mode === 'link' ? (
          <>
            <IonText color="medium">
              <p>Save a URL to read or watch later.</p>
            </IonText>
            <IonItem>
              <IonLabel position="stacked">Title (optional)</IonLabel>
              <IonInput
                ref={urlTitleRef}
                value={urlTitle}
                placeholder="e.g. Great React tutorial"
                onIonInput={(e) => setUrlTitle(e.detail.value ?? '')}
                onIonChange={(e) => setUrlTitle(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem className="ion-margin-top">
              <IonLabel position="stacked">URL</IonLabel>
              <IonInput
                ref={urlRef}
                value={url}
                inputMode="url"
                placeholder="https://"
                onIonInput={(e) => setUrl(e.detail.value ?? '')}
                onIonChange={(e) => setUrl(e.detail.value ?? '')}
              />
            </IonItem>
            <IonButton
              expand="block"
              color="primary"
              disabled={busy}
              onClick={() => void saveUrl()}
              className="ion-margin-top"
            >
              {busy ? <IonSpinner name="crescent" /> : 'Save Link'}
            </IonButton>
          </>
        ) : (
          <>
            <IonText color="medium">
              <p>Save a quick text note — no link required.</p>
            </IonText>
            <IonItem>
              <IonLabel position="stacked">Note</IonLabel>
              <IonTextarea
                ref={noteRef}
                value={note}
                placeholder="Write a quick note"
                autoGrow
                onIonInput={(e) => setNote(e.detail.value ?? '')}
                onIonChange={(e) => setNote(e.detail.value ?? '')}
              />
            </IonItem>
            <IonButton
              expand="block"
              color="success"
              disabled={busy}
              onClick={() => void saveNote()}
              className="ion-margin-top"
            >
              {busy ? <IonSpinner name="crescent" /> : 'Save Note'}
            </IonButton>
          </>
        )}
        <IonToast isOpen={!!toastMessage} message={toastMessage} duration={2000} onDidDismiss={() => setToastMessage('')} />
      </IonContent>
    </IonPage>
  );
};

export default QuickAddPage;
