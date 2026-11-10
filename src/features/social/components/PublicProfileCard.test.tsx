import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestProfile, FakeSocialRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PublicProfileCard } from './PublicProfileCard';

const usernameField = () => screen.getByRole('textbox', { name: 'Username' });

describe('PublicProfileCard', () => {
  it('shows the username when the user has one', async () => {
    const social = new FakeSocialRepository([createTestProfile({ uid: TEST_USER.uid, username: 'test_reader' })]);
    renderWithProviders(<PublicProfileCard />, { social });

    expect(await screen.findByText('@test_reader')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View your public profile' })).toHaveAttribute('href', '/u/test_reader');
  });

  it('claims a username with the account name and photo', async () => {
    const user = userEvent.setup();
    const { social } = renderWithProviders(<PublicProfileCard />);

    await user.type(await screen.findByRole('textbox', { name: 'Username' }), '@Test_Reader');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(await screen.findByText('@test_reader')).toBeInTheDocument();
    expect(social.claimUsername).toHaveBeenCalledWith(TEST_USER.uid, 'test_reader', {
      displayName: 'Test Reader',
      photoURL: null,
    });
  });

  it('explains invalid usernames without saving', async () => {
    const user = userEvent.setup();
    const { social } = renderWithProviders(<PublicProfileCard />);

    await user.click(await screen.findByRole('button', { name: 'Choose username' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Type a username.');

    await user.type(usernameField(), 'ab');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 3 characters.');
    expect(usernameField()).toHaveAttribute('aria-invalid', 'true');

    await user.clear(usernameField());
    await user.type(usernameField(), 'ana reads');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use only lowercase letters, numbers and _.');

    await user.clear(usernameField());
    await user.type(usernameField(), 'admin');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This username is reserved.');

    expect(social.claimUsername).not.toHaveBeenCalled();
  });

  it('says when the username is taken, and clears the message on typing', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository([createTestProfile({ username: 'taken' })]);
    renderWithProviders(<PublicProfileCard />, { social });

    await user.type(await screen.findByRole('textbox', { name: 'Username' }), 'taken');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone already has this username.');

    await user.type(usernameField(), '2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says when saving fails', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository();
    social.claimUsername.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PublicProfileCard />, { social });

    await user.type(await screen.findByRole('textbox', { name: 'Username' }), 'reader');
    await user.click(screen.getByRole('button', { name: 'Choose username' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your username.");
  });

  it('offers a retry when the profile fails to load', async () => {
    const user = userEvent.setup();
    const social = new FakeSocialRepository();
    social.getPublicProfile.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PublicProfileCard />, { social });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your public profile.");
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('textbox', { name: 'Username' })).toBeInTheDocument();
  });

  it('is translated', async () => {
    renderWithProviders(<PublicProfileCard />, { language: 'pt-BR' });

    expect(await screen.findByRole('textbox', { name: 'Nome de usuário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher nome de usuário' })).toBeInTheDocument();
  });
});
