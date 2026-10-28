// 빌드 설정 (기획서 8.8)
// - npm run build         : Vercel 배포용 (dist/). PWA라서 한 번 접속하면 인터넷이 끊겨도 실행됩니다.
// - npm run build:offline : USB용 HTML 파일 하나 (dist-offline/index.html). 더블클릭으로 실행됩니다.

import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

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
  return {
    base: offline ? './' : '/',
    plugins: [
      woff2Only(),
      offline
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.svg'],
            manifest: {
              name: '귀염뽀짝 미로 레이스',
              short_name: '미로 레이스',
              description: '한 컴퓨터에서 두 친구가 키보드를 나눠 쓰는 2인 대결 미로 게임',
              lang: 'ko',
              start_url: '.',
              display: 'fullscreen',
              background_color: '#fff4f7',
              theme_color: '#ff6b81',
              icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
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
