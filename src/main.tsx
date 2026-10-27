import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { webStorageDriver } from './data/storage';
import { FinanceProvider } from './state/FinanceProvider';
import { App } from './web/App';
import { createCloud } from './web/cloud';
import './web/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FinanceProvider driver={webStorageDriver} createCloud={createCloud}>
      <App />
    </FinanceProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
}
