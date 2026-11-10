import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * PWA icons generated from the "shelf" logo (`npm run generate-pwa-assets`); the PNGs are committed
 * in `public/`. Maskable and Apple icons get the logo's dark brown behind them, so the safe zone
 * crop keeps the shelf whole.
 */
const LOGO_BACKGROUND = '#382110';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: LOGO_BACKGROUND } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: LOGO_BACKGROUND } },
  },
  images: ['public/favicon.svg'],
});
