import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { AuthProvider } from './components/AuthProvider';
import { msalInstance } from './lib/msal';
import './index.css';

// Process any redirect response from Microsoft before rendering (handles
// the /auth/callback round-trip automatically — no dedicated route needed).
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().catch(console.error);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
});
