import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const registerSW = vi.fn();
vi.mock('virtual:pwa-register', () => ({ registerSW }));

/** Fresh module state per test (the install event and the update flag are module-level). */
async function loadPwa() {
  vi.resetModules();
  return import('./index');
}

/** A `beforeinstallprompt` event as Chromium sends it. */
function installEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(event, { prompt: vi.fn(async () => {}), userChoice: Promise.resolve({ outcome }) });
}

describe('InstallAppButton', () => {
  it('appears once the browser offers installing, and opens its dialog once', async () => {
    const user = userEvent.setup();
    const { InstallAppButton, listenForInstallPrompt } = await loadPwa();
    const target = new EventTarget() as Window;
    listenForInstallPrompt(target);
    renderWithProviders(<InstallAppButton />);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();

    const event = installEvent('accepted');
    act(() => {
      target.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Install app' }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('disappears once the app is installed', async () => {
    const { InstallAppButton, listenForInstallPrompt } = await loadPwa();
    const target = new EventTarget() as Window;
    listenForInstallPrompt(target);
    renderWithProviders(<InstallAppButton />);

    act(() => {
      target.dispatchEvent(installEvent('dismissed'));
    });
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
    act(() => {
      target.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    const { InstallAppButton, listenForInstallPrompt } = await loadPwa();
    const target = new EventTarget() as Window;
    listenForInstallPrompt(target);
    renderWithProviders(<InstallAppButton />, { language: 'pt-BR' });
    act(() => {
      target.dispatchEvent(installEvent('accepted'));
    });
    expect(screen.getByRole('button', { name: 'Instalar app' })).toBeInTheDocument();
  });
});

describe('PwaBanners', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows nothing while online and up to date', async () => {
    const { PwaBanners } = await loadPwa();
    const { container } = renderWithProviders(<PwaBanners />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says when the connection drops, and hides when it comes back', async () => {
    const { PwaBanners } = await loadPwa();
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderWithProviders(<PwaBanners />);

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers reloading when a new version waits, or hiding it until the next one', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => {});
    let onNeedRefresh: (() => void) | undefined;
    registerSW.mockImplementation((options: { onNeedRefresh: () => void }) => {
      onNeedRefresh = options.onNeedRefresh;
      return update;
    });
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { serviceWorker: {} }));
    const { PwaBanners, registerServiceWorker } = await loadPwa();
    await registerServiceWorker();
    vi.unstubAllGlobals();
    renderWithProviders(<PwaBanners />);

    act(() => onNeedRefresh?.());
    expect(screen.getByRole('status')).toHaveTextContent('A new version of Bestreads is ready.');
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(update).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
