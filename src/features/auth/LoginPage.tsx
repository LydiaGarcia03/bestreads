import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { PageHeading } from '@/shared/ui/PageHeading';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useAuth } from './AuthContext';
import { resolveRedirectTarget } from './authRedirect';
import { AuthUnavailable } from './components/AuthUnavailable';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';

type LoginMode = 'signIn' | 'signUp' | 'reset';

const TITLE_KEYS = {
  signIn: 'auth.signInTitle',
  signUp: 'auth.signUpTitle',
  reset: 'auth.resetTitle',
} as const satisfies Record<LoginMode, string>;

const linkButtonClass = 'min-h-11 font-bold text-accent hover:text-accent-hover';

/** Login screen: Google, email/password sign-in, sign-up and password reset. */
export function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();

  switch (status) {
    case 'loading':
      return <PageLoader />;
    case 'unavailable':
      return <AuthUnavailable />;
    case 'signedIn':
      return <Navigate to={resolveRedirectTarget(location.state)} replace />;
    case 'signedOut':
      return <LoginPanel />;
  }
}

function LoginPanel() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LoginMode>('signIn');

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 lg:rounded-lg lg:border lg:border-border lg:bg-surface lg:p-8">
      <div className="flex flex-col gap-2">
        <PageHeading>{t(TITLE_KEYS[mode])}</PageHeading>
        <p className="text-sm text-fg-muted">{t(mode === 'reset' ? 'auth.resetIntro' : 'auth.intro')}</p>
      </div>

      {mode !== 'reset' && (
        <>
          <GoogleSignInButton />
          <div className="flex items-center gap-3 text-xs text-fg-muted" role="separator">
            <span className="h-px flex-1 bg-border" />
            {t('auth.orWithEmail')}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {mode === 'signIn' && <SignInForm onForgotPassword={() => setMode('reset')} />}
      {mode === 'signUp' && <SignUpForm />}
      {mode === 'reset' && <ResetPasswordForm />}

      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm">
        {mode === 'signIn' && (
          <>
            <span className="text-fg-muted">{t('auth.noAccount')}</span>
            <button type="button" onClick={() => setMode('signUp')} className={linkButtonClass}>
              {t('auth.createAccount')}
            </button>
          </>
        )}
        {mode === 'signUp' && (
          <>
            <span className="text-fg-muted">{t('auth.haveAccount')}</span>
            <button type="button" onClick={() => setMode('signIn')} className={linkButtonClass}>
              {t('auth.signIn')}
            </button>
          </>
        )}
        {mode === 'reset' && (
          <button type="button" onClick={() => setMode('signIn')} className={linkButtonClass}>
            {t('auth.backToSignIn')}
          </button>
        )}
      </p>
    </div>
  );
}
