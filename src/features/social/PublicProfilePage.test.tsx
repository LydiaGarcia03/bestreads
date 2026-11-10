import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestProfile, createTestPublicRating, FakeSocialRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { PUBLIC_RATINGS_PAGE_SIZE } from './publicRating';
import { PublicProfilePage } from './PublicProfilePage';

const friend = createTestProfile({ uid: 'friend-uid', username: 'friend', displayName: 'Friendly Reader' });
const me = createTestProfile({ uid: TEST_USER.uid, username: 'test_reader', displayName: 'Test Reader' });

function renderProfile(route: string, social: FakeSocialRepository, options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
      <Route path="/friends" element={<h1>Friends screen</h1>} />
    </Routes>,
    { route, social, ...options },
  );
}

describe('PublicProfilePage', () => {
  it("shows someone's name, username, counts and public ratings", async () => {
    const social = new FakeSocialRepository([friend, me]);
    social.ratings.set(friend.uid, [
      createTestPublicRating({ bookId: 'b1', title: 'Dune', authors: ['Frank Herbert'], rating: 4.75 }),
      createTestPublicRating({ bookId: 'b2', title: 'Emma', authors: ['Jane Austen'], rating: 3 }),
    ]);
    social.follows.add(`other_${friend.uid}`);
    renderProfile('/u/friend', social);

    expect(await screen.findByRole('heading', { level: 1, name: 'Friendly Reader' })).toBeInTheDocument();
    expect(screen.getByText('@friend')).toBeInTheDocument();
    expect(await screen.findByText('1 follower · 0 following')).toBeInTheDocument();

    const ratings = screen.getByRole('region', { name: 'Public ratings' });
    expect(await within(ratings).findByRole('heading', { level: 3, name: 'Dune' })).toBeInTheDocument();
    expect(within(ratings).getByRole('img', { name: '4.75 out of 5' })).toBeInTheDocument();
    expect(within(ratings).getAllByText('Rated on Nov 1, 2026')).toHaveLength(2);
  });

  it('accepts @, uppercase and opens a rated book', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([friend, me]);
    social.ratings.set(friend.uid, [createTestPublicRating({ bookId: 'b1', title: 'Dune' })]);
    renderProfile('/u/@Friend', social);

    await user.click(await screen.findByRole('link', { name: /Dune/ }));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('follows and unfollows, updating the follower count', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([friend, me]);
    renderProfile('/u/friend', social);

    await user.click(await screen.findByRole('button', { name: 'Follow' }));

    const following = await screen.findByRole('button', { name: 'Following' });
    expect(following).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 follower · 0 following')).toBeInTheDocument();
    expect(social.follow).toHaveBeenCalledWith(TEST_USER.uid, friend.uid);

    await user.click(following);
    expect(await screen.findByRole('button', { name: 'Follow' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('0 followers · 0 following')).toBeInTheDocument();
    expect(social.unfollow).toHaveBeenCalledWith(TEST_USER.uid, friend.uid);
  });

  it('says when following fails', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([friend, me]);
    social.follow.mockRejectedValueOnce(new Error('offline'));
    renderProfile('/u/friend', social);

    await user.click(await screen.findByRole('button', { name: 'Follow' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't update. Try again.");
  });

  it('asks for a username of your own before following', async () => {
    const user = userEvent.setup();
    renderProfile('/u/friend', new FakeSocialRepository([friend]));

    expect(await screen.findByText(/Choose your own username to follow people./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Choose username' }));
    expect(await screen.findByRole('heading', { name: 'Friends screen' })).toBeInTheDocument();
  });

  it('shows your own profile without a follow button', async () => {
    renderProfile('/u/test_reader', new FakeSocialRepository([me]));

    expect(await screen.findByText('This is your public profile.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
    expect(await screen.findByText('No public ratings yet.')).toBeInTheDocument();
  });

  it('loads more ratings', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([friend, me]);
    social.ratings.set(
      friend.uid,
      Array.from({ length: PUBLIC_RATINGS_PAGE_SIZE + 1 }, (_, index) =>
        createTestPublicRating({ bookId: `b${index}`, title: `Book ${index}` }),
      ),
    );
    renderProfile('/u/friend', social);

    expect(await screen.findByRole('heading', { level: 3, name: 'Book 0' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: `Book ${PUBLIC_RATINGS_PAGE_SIZE}` })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(
      await screen.findByRole('heading', { level: 3, name: `Book ${PUBLIC_RATINGS_PAGE_SIZE}` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says when nobody has the username, or it is not a valid one', async () => {
    const social = new FakeSocialRepository([me]);
    const { unmount } = renderProfile('/u/nobody', social);
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile not found' })).toBeInTheDocument();
    expect(screen.getByText('Nobody uses @nobody. Check the spelling.')).toBeInTheDocument();
    unmount();

    renderProfile('/u/a%20b', social);
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile not found' })).toBeInTheDocument();
    expect(social.findProfileByUsername).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the profile fails to load', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([friend, me]);
    social.findProfileByUsername.mockRejectedValueOnce(new Error('offline'));
    renderProfile('/u/friend', social);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this profile.");
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Friendly Reader' })).toBeInTheDocument();
  });

  it('is translated', async () => {
    renderProfile('/u/friend', new FakeSocialRepository([friend, me]), { language: 'pt-BR' });

    expect(await screen.findByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Avaliações públicas' })).toBeInTheDocument();
    expect(await screen.findByText('0 seguidores · seguindo 0')).toBeInTheDocument();
  });
});
