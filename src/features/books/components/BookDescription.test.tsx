import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BookDescription } from './BookDescription';

describe('BookDescription', () => {
  it('shows bold and italic text instead of the Markdown markers', () => {
    const { container } = renderWithProviders(
      <BookDescription text={"***'My name is Natalie'*** lives a **traditional** *lifestyle*."} />,
    );

    expect(container).not.toHaveTextContent('*');
    expect(screen.getByText("'My name is Natalie'").closest('strong')).not.toBeNull();
    expect(screen.getByText("'My name is Natalie'").tagName).toBe('EM');
    expect(screen.getByText('traditional').tagName).toBe('STRONG');
    expect(screen.getByText('lifestyle').tagName).toBe('EM');
  });

  it('renders each paragraph separately and never as HTML', () => {
    const { container } = renderWithProviders(<BookDescription text={'First part.\n\n<img src=x onerror=alert(1)> second.'} />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]).toHaveTextContent('<img src=x onerror=alert(1)> second.');
    expect(container.querySelector('img')).toBeNull();
  });

  it('collapses long descriptions until "Show more" is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookDescription text={`**${'Long text. '.repeat(50)}**`} />);

    const toggle = screen.getByRole('button', { name: 'Show more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not collapse short text, ignoring the markers in its length', () => {
    renderWithProviders(<BookDescription text={`***${'a'.repeat(390)}***`} />);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });
});
