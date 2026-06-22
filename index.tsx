
import './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { initWebVitals } from './utils/webVitals';
import { registerSW } from 'virtual:pwa-register';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{padding:'2rem',textAlign:'center'}}>Something went wrong. Please refresh.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

initWebVitals();