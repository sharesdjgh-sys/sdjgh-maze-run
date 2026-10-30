// 빌드 설정 (기획서 8.8)
// - npm run build         : Vercel 배포용 (dist/). PWA라서 한 번 접속하면 인터넷이 끊겨도 실행됩니다.
// - npm run build:offline : USB용 HTML 파일 하나 (dist-offline/index.html). 더블클릭으로 실행됩니다.

import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { siteMetadata } from './scripts/site-metadata.mjs';

// 주아 글꼴 CSS에서 옛날 브라우저용 woff 파일을 빼고 woff2만 남깁니다. (용량 절반)
function woff2Only() {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/@fontsource[\\/]jua[\\/].*\.css$/.test(id)) return null;
      return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '');
    },
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    base: offline ? './' : '/',
    plugins: [
      woff2Only(),
      siteMetadata({ env, offline }),
      offline
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-studycrew-mazerun.jpg'],
            manifest: {
              name: 'StudyCrew × MazeRun',
              short_name: 'MazeRun',
              description: '학교에 들렀다가 우리 집으로! 키보드 하나로 둘이 즐기는 정원 미로 대결.',
              lang: 'ko',
              start_url: '.',
              display: 'fullscreen',
              background_color: '#fff4f7',
              theme_color: '#234c38',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
          }),
    ],
    build: offline ? { outDir: 'dist-offline' } : {},
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js'],
      // 미로 수백 개를 만들어 보는 테스트가 있어서, 컴퓨터가 바쁠 때도 시간 초과로 실패하지 않게 넉넉히
      testTimeout: 60000,
    },
  };
});
