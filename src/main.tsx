import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/queryClient';
import { appServices } from './app/services';
import { resolveInitialLanguage } from './features/preferences';
import { createI18n } from './shared/i18n';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const i18n = createI18n(resolveInitialLanguage());
const queryClient = createQueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders i18n={i18n} queryClient={queryClient} services={appServices}>
      <App />
    </AppProviders>
  </StrictMode>,
);
