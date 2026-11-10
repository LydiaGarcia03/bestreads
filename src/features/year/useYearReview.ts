import { useMemo } from 'react';
import { useShelfBooks, type ShelfFilter } from '@/features/books/lazy';
import { buildYearReview, readingYears } from './yearReview';

/** Finished reads live on books that are read now, or being re-read (same queries as Home). */
const READ: ShelfFilter = { kind: 'status', status: 'read' };
const READING: ShelfFilter = { kind: 'status', status: 'reading' };

/** The review of `year`, the years with finished books, and the loading state of both shelves. */
export function useYearReview(year: number) {
  const read = useShelfBooks(READ);
  const reading = useShelfBooks(READING);
  const currentYear = new Date().getFullYear();

  const books = useMemo(() => [...(read.data ?? []), ...(reading.data ?? [])], [read.data, reading.data]);
  const review = useMemo(() => buildYearReview(books, year), [books, year]);
  const years = useMemo(() => {
    const known = readingYears(books, currentYear);
    return known.includes(year) ? known : [...known, year].sort((a, b) => b - a);
  }, [books, currentYear, year]);

  return {
    review,
    years,
    isPending: read.isPending || reading.isPending,
    isError: read.isError || reading.isError,
    refetch: () => Promise.all([read.refetch(), reading.refetch()]),
  };
}
