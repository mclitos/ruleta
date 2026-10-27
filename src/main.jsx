import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource-variable/outfit';
import './index.css';
import App from './App.jsx';
import StreamView from './StreamView.jsx';
import { isStreamView } from './lib/stream';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <StrictMode>{isStreamView() ? <StreamView /> : <App />}</StrictMode>,
);
