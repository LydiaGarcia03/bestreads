import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BookCover } from './BookCover';

describe('BookCover', () => {
  it('shows the cover image lazily with alt text', () => {
    renderWithProviders(<BookCover src="https://img/cover.jpg" title="Dune" />);
    const image = screen.getByRole('img', { name: 'Cover of Dune' });
    expect(image).toHaveAttribute('src', 'https://img/cover.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('shows a placeholder when there is no cover', () => {
    renderWithProviders(<BookCover src={null} title="Dune" />);
    expect(screen.getByRole('img', { name: 'No cover for Dune' })).toBeInTheDocument();
  });

  it('falls back to the placeholder when the image fails to load', () => {
    renderWithProviders(<BookCover src="https://img/missing.jpg" title="Dune" />);
    fireEvent.error(screen.getByRole('img', { name: 'Cover of Dune' }));
    expect(screen.getByRole('img', { name: 'No cover for Dune' })).toBeInTheDocument();
  });

  it('tries again when the cover source changes', () => {
    const { rerender } = renderWithProviders(<BookCover src="https://img/missing.jpg" title="Dune" />);
    fireEvent.error(screen.getByRole('img', { name: 'Cover of Dune' }));
    rerender(<BookCover src="https://img/other.jpg" title="Dune" />);
    expect(screen.getByRole('img', { name: 'Cover of Dune' })).toHaveAttribute('src', 'https://img/other.jpg');
  });
});
