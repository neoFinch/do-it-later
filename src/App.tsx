import { Redirect, Route, Switch } from 'react-router-dom';
import {
  IonApp,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import InboxPage from './pages/InboxPage';
import QuickAddPage from './pages/QuickAddPage';
import CaptureDetailPage from './pages/CaptureDetailPage';
import SettingsPage from './pages/SettingsPage';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

console.log('App: setupIonicReact called');

const App: React.FC = () => {
  console.log('App: render');
  return (
    <IonApp>
      <IonReactRouter>
        <Switch>
          <Route exact path="/">
            <InboxPage />
          </Route>
          <Route exact path="/quick-add">
            <QuickAddPage />
          </Route>
          <Route exact path="/capture/:id">
            <CaptureDetailPage />
          </Route>
          <Route exact path="/settings">
            <SettingsPage />
          </Route>
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
