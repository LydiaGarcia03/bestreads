import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { SearchResultList } from './components/SearchResultList';
import { SearchViewToggle } from './components/SearchViewToggle';
import { normalizeQuery, SEARCH_QUERY_PARAM } from './searchQuery';
import type { SearchView } from './searchView';
import { isSearchableQuery, MIN_QUERY_LENGTH, useBookSearch } from './useBookSearch';
import { useSearchView } from './useSearchView';

/** Search screen: results for the `q` URL parameter, as a list or a grid, loaded page by page. */
export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = normalizeQuery(searchParams.get(SEARCH_QUERY_PARAM));
  const [view, setView] = useSearchView();

  return (
    <section className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeading>{query ? t('search.resultsFor', { query }) : t('search.title')}</PageHeading>
        {query && <SearchViewToggle view={view} onChange={setView} />}
      </div>
      <SearchResults query={query} view={view} />
    </section>
  );
}

function SearchResults({ query, view }: { query: string; view: SearchView }) {
  const { t } = useTranslation();
  const search = useBookSearch(query);

  if (!query) return <p className="text-fg-muted">{t('search.empty')}</p>;
  if (!isSearchableQuery(query)) return <p className="text-fg-muted">{t('search.tooShort', { min: MIN_QUERY_LENGTH })}</p>;

  if (search.isPending) {
    return (
      <p role="status" className="text-fg-muted">
        {t('search.searching')}
      </p>
    );
  }

  if (search.isError && !search.isFetchNextPageError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('search.error')}</p>
        <Button variant="secondary" onClick={() => void search.refetch()}>
          {t('search.retry')}
        </Button>
      </div>
    );
  }

  if (search.data.length === 0 && !search.isPlaceholderData) {
    return <p className="text-fg-muted">{t('search.noResults')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Previous results stay visible (dimmed) while the new query loads. */}
      <div aria-busy={search.isPlaceholderData} className={search.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
        {search.isPlaceholderData && (
          <p role="status" className="sr-only">
            {t('search.searching')}
          </p>
        )}
        <SearchResultList results={search.data} view={view} />
      </div>

      {search.isFetchNextPageError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('search.error')}
        </p>
      )}

      {search.hasNextPage && !search.isPlaceholderData && (
        <Button
          variant="secondary"
          disabled={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
          className="self-center"
        >
          {search.isFetchingNextPage ? t('search.loadingMore') : t('search.loadMore')}
        </Button>
      )}
    </div>
  );
}
