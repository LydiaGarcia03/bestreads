import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { SearchResultList } from './components/SearchResultList';
import { normalizeQuery, SEARCH_QUERY_PARAM } from './searchQuery';
import { isSearchableQuery, MIN_QUERY_LENGTH, useBookSearch } from './useBookSearch';

/** Search screen: results for the `q` URL parameter. */
export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = normalizeQuery(searchParams.get(SEARCH_QUERY_PARAM));

  return (
    <section className="flex flex-col gap-4 lg:gap-6">
      <PageHeading>{query ? t('search.resultsFor', { query }) : t('search.title')}</PageHeading>
      <SearchResults query={query} />
    </section>
  );
}

function SearchResults({ query }: { query: string }) {
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

  if (search.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('search.error')}</p>
        <Button variant="secondary" onClick={() => void search.refetch()}>
          {t('search.retry')}
        </Button>
      </div>
    );
  }

  if (search.data.length === 0) return <p className="text-fg-muted">{t('search.noResults')}</p>;

  return <SearchResultList results={search.data} />;
}
