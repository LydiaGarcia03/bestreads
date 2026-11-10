// Public API used by code in the initial bundle (routes). Keep it small: everything re-exported here
// ships in the initial JS. The My Year screen is lazy-loaded by the routes; Home uses `./lazy.ts`.
export { YEAR_PATH } from './yearPath';
