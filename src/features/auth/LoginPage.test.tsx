import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AuthError } from './authErrors';
import { LoginPage } from './LoginPage';

function renderLogin(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Home screen</h1>} />
    </Routes>,
    { route: '/login', user: null, ...options },
  );
}

describe('LoginPage', () => {
  beforeEach(() => window.localStorage.clear());

  it('offers Google and email sign-in', async () => {
    renderLogin();

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('signs in with Google and leaves the login screen', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(authService.signInWithGoogle).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Home screen' })).toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();

    await user.type(await screen.findByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(authService.signInWithEmail).toHaveBeenCalledWith({ email: 'reader@example.com', password: 'secret123' });
    expect(await screen.findByRole('heading', { name: 'Home screen' })).toBeInTheDocument();
  });

  it('shows a translated error and keeps the form', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();
    authService.signInWithEmail.mockRejectedValueOnce(new AuthError('invalidCredentials'));

    await user.type(await screen.findByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('says nothing when the Google popup is closed', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();
    authService.signInWithGoogle.mockRejectedValueOnce(new AuthError('cancelled'));

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(authService.signInWithGoogle).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('creates an account', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Create an account' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 6 characters');

    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(authService.signUpWithEmail).toHaveBeenCalledWith({
      displayName: 'Ana',
      email: 'ana@example.com',
      password: 'secret123',
    });
    expect(await screen.findByRole('heading', { name: 'Home screen' })).toBeInTheDocument();
  });

  it('sends a password reset link', async () => {
    const user = userEvent.setup();
    const { authService } = renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), ' ana@example.com ');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(authService.sendPasswordReset).toHaveBeenCalledWith('ana@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for ana@example.com');

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('redirects a signed-in user to where they came from', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shelves" element={<h1>Shelves screen</h1>} />
      </Routes>,
      { route: { pathname: '/login', state: { from: '/shelves' } } },
    );

    expect(await screen.findByRole('heading', { name: 'Shelves screen' })).toBeInTheDocument();
  });

  it('is translated', async () => {
    renderLogin({ language: 'pt-BR' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });
});
