import { readFileSync } from 'node:fs';

// 크롤러가 JavaScript를 실행하지 않아도 읽도록 최초 HTML에 절대 주소를 넣습니다.
export function siteMetadata({ env = {}, offline = false } = {}) {
  const domain = env.VITE_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  let siteUrl = '';
  if (domain) {
    const url = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('VITE_SITE_URL에는 공개된 HTTP(S) 주소를 입력하세요.');
    }
    siteUrl = url.origin;
  }
  return {
    name: 'site-metadata',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // 주소를 설정하지 않은 로컬 빌드는 상대 이미지 경로만 유지합니다.
        if (!siteUrl || offline) {
          html = html.replace(/^.*<link rel="canonical"[^>]*>\s*$/gm, '')
            .replace(/^.*<meta property="og:url"[^>]*>\s*$/gm, '');
        }
        html = html.replaceAll('__SITE_URL__', siteUrl);
        if (offline) {
          html = html.replace(/(<link rel="(?:icon|apple-touch-icon)" href=")([^"?]+)(?:\?[^" ]*)?(")/g,
            (_, before, path, after) => {
              const mime = path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.ico') ? 'image/x-icon' : 'image/png';
              const data = readFileSync(new URL(`../public${path}`, import.meta.url)).toString('base64');
              return `${before}data:${mime};base64,${data}${after}`;
            });
        }
        return html;
      },
    },
  };
}
