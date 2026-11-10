import { useCallback, useState } from 'react';
import { readLocalValue, writeLocalValue } from '@/shared/storage/localStorage';
import { DEFAULT_SEARCH_VIEW, isSearchView, type SearchView } from './searchView';

export const SEARCH_VIEW_STORAGE_KEY = 'bestreads.searchView';

function loadSearchView(): SearchView {
  const stored = readLocalValue(SEARCH_VIEW_STORAGE_KEY);
  return isSearchView(stored) ? stored : DEFAULT_SEARCH_VIEW;
}

/** List or grid, remembered on this device. */
export function useSearchView(): [SearchView, (view: SearchView) => void] {
  const [view, setViewState] = useState<SearchView>(loadSearchView);

  const setView = useCallback((next: SearchView) => {
    writeLocalValue(SEARCH_VIEW_STORAGE_KEY, next);
    setViewState(next);
  }, []);

  return [view, setView];
}
