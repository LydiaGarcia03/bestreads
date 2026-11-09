import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';

/** GitHub Pages has no SPA rewrites, so routing uses the URL hash. */
export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
