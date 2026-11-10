import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import { FEED_SIZE } from '@/features/social/feed';
import { createTestProfile, createTestPublicRating, FakeSocialRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { FriendsPage } from './FriendsPage';

const me = createTestProfile({ uid: TEST_USER.uid, username: 'test_reader', displayName: 'Test Reader' });
const ana = createTestProfile({ uid: 'ana-uid', username: 'ana', displayName: 'Ana Lima' });
const rafa = createTestProfile({ uid: 'rafa-uid', username: 'rafa', displayName: null });

function ProfileScreen() {
  return <h1>Profile of {useParams().username}</h1>;
}

function renderFriends(social = new FakeSocialRepository(), options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/u/:username" element={<ProfileScreen />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { route: '/friends', social, ...options },
  );
}

describe('FriendsPage', () => {
  it('asks for a username of your own', async () => {
    renderFriends();

    expect(screen.getByRole('heading', { level: 1, name: 'Friends' })).toBeInTheDocument();
    const profile = screen.getByRole('region', { name: 'Public profile' });
    expect(await within(profile).findByRole('textbox', { name: 'Username' })).toBeInTheDocument();
  });

  it('shows the username once chosen', async () => {
    renderFriends(new FakeSocialRepository([me]));

    expect(await screen.findByText('@test_reader')).toBeInTheDocument();
  });

  it('finds a person by @username', async () => {
    const user = userEvent.setup();
    renderFriends();

    const find = screen.getByRole('search', { name: 'Find people' });
    await user.type(within(find).getByRole('textbox', { name: 'Their username' }), ' @Ana ');
    await user.click(within(find).getByRole('button', { name: 'Find' }));

    expect(await screen.findByRole('heading', { name: 'Profile of ana' })).toBeInTheDocument();
  });

  it('asks for a username before finding', async () => {
    const user = userEvent.setup();
    renderFriends();

    await user.click(screen.getByRole('button', { name: 'Find' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Type a username.');
    expect(screen.getByRole('textbox', { name: 'Their username' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('lists who you follow and who follows you', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([me, ana, rafa]);
    social.follows.add(`${me.uid}_${ana.uid}`);
    social.follows.add(`${rafa.uid}_${me.uid}`);
    renderFriends(social);

    const following = screen.getByRole('region', { name: 'Following' });
    expect(await within(following).findByRole('link', { name: /Ana Lima/ })).toHaveTextContent('@ana');
    const followers = screen.getByRole('region', { name: 'Followers' });
    await user.click(await within(followers).findByRole('link', { name: '@rafa' }));

    expect(await screen.findByRole('heading', { name: 'Profile of rafa' })).toBeInTheDocument();
  });

  it('says when nobody is followed yet', async () => {
    renderFriends(new FakeSocialRepository([me]));

    expect(await screen.findByText("You don't follow anyone yet.")).toBeInTheDocument();
    expect(await screen.findByText('Nobody follows you yet.')).toBeInTheDocument();
    expect(
      await screen.findByText('No ratings yet. Follow people by @username to see the ratings they make public.'),
    ).toBeInTheDocument();
  });

  it("shows followed users' public ratings, newest first", async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([me, ana, rafa]);
    social.follows.add(`${me.uid}_${ana.uid}`);
    social.follows.add(`${me.uid}_${rafa.uid}`);
    social.ratings.set(ana.uid, [
      createTestPublicRating({ bookId: 'b1', title: 'Circe', rating: 5, ratedAt: new Date('2026-11-05T12:00:00Z') }),
    ]);
    social.ratings.set(rafa.uid, [
      createTestPublicRating({ bookId: 'b2', title: 'Dune', rating: 4.5, ratedAt: new Date('2026-11-08T12:00:00Z') }),
    ]);
    renderFriends(social);

    const feed = screen.getByRole('region', { name: "Friends' ratings" });
    const [newest, older] = await within(feed).findAllByRole('article');
    if (!newest || !older) throw new Error('Expected two feed entries');
    expect(within(newest).getByRole('link', { name: 'Dune' })).toBeInTheDocument();
    expect(within(newest).getByRole('link', { name: '@rafa' })).toBeInTheDocument();
    expect(within(newest).getByText(/Nov 8, 2026/)).toBeInTheDocument();
    expect(within(newest).getByRole('img', { name: '4.5 out of 5' })).toBeInTheDocument();
    expect(within(older).getByRole('link', { name: '@ana' })).toBeInTheDocument();

    await user.click(within(older).getByRole('link', { name: 'Circe' }));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('reads only a few ratings per followed user and caps the feed', async () => {
    const social = new FakeSocialRepository([me, ana]);
    social.follows.add(`${me.uid}_${ana.uid}`);
    social.ratings.set(
      ana.uid,
      Array.from({ length: FEED_SIZE + 5 }, (_, index) => createTestPublicRating({ bookId: `b${index}` })),
    );
    renderFriends(social);

    const feed = screen.getByRole('region', { name: "Friends' ratings" });
    expect(await within(feed).findAllByRole('article')).toHaveLength(5);
    expect(social.listPublicRatings).toHaveBeenCalledWith(ana.uid, { pageSize: 5, after: null });
  });

  it('offers a retry when the feed fails', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([me, ana]);
    social.follows.add(`${me.uid}_${ana.uid}`);
    social.ratings.set(ana.uid, [createTestPublicRating({ title: 'Circe' })]);
    social.listPublicRatings.mockRejectedValueOnce(new Error('offline'));
    renderFriends(social);

    const feed = screen.getByRole('region', { name: "Friends' ratings" });
    expect(await within(feed).findByRole('alert')).toHaveTextContent("Couldn't load your friends' ratings.");
    await user.click(within(feed).getByRole('button', { name: 'Try again' }));
    expect(await within(feed).findByRole('link', { name: 'Circe' })).toBeInTheDocument();
  });

  it('is translated', async () => {
    renderFriends(new FakeSocialRepository([me]), { language: 'pt-BR' });

    expect(screen.getByRole('search', { name: 'Encontrar pessoas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Avaliações dos amigos' })).toBeInTheDocument();
    expect(await screen.findByText('Você ainda não segue ninguém.')).toBeInTheDocument();
  });
});
