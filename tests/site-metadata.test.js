import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { siteMetadata } from '../scripts/site-metadata.mjs';

const html = readFileSync('index.html', 'utf8');
const render = options => siteMetadata(options).transformIndexHtml.handler(html);

describe('브랜드와 링크 공유 메타 정보', () => {
  it('현재 게임 이름과 크롤러가 읽을 수 있는 OG 정보가 최초 HTML에 있다', () => {
    expect(html).toContain('<title>StudyCrew × MazeRun');
    expect(html).not.toContain('귀염뽀짝');
    for (const property of ['og:title', 'og:description', 'og:image', 'og:image:width', 'og:image:height']) {
      expect(html).toContain(`property="${property}"`);
    }
  });
  it('Vercel에서는 임시 배포 주소보다 실제 서비스 주소를 사용한다', () => {
    const output = render({env: {VERCEL_PROJECT_PRODUCTION_URL: 'maze.example.com', VERCEL_URL: 'preview.example.com'}});
    expect(output).toContain('content="https://maze.example.com/og-studycrew-mazerun.jpg"');
    expect(output).toContain('rel="canonical" href="https://maze.example.com/"');
    expect(output).not.toContain('__SITE_URL__');
    expect(output).not.toContain('preview.example.com');
  });
  it('명시한 공개 주소가 자동 감지한 주소보다 우선한다', () => {
    const output = render({env: {VITE_SITE_URL: 'https://custom.example.com/', VERCEL_PROJECT_PRODUCTION_URL: 'maze.example.com'}});
    expect(output).toContain('content="https://custom.example.com/"');
  });
  it('로컬에서는 가짜 서비스 주소를 넣지 않는다', () => {
    const output = render({});
    expect(output).not.toContain('__SITE_URL__');
    expect(output).not.toContain('rel="canonical"');
    expect(output).not.toContain('property="og:url"');
  });
  it('USB용 HTML은 아이콘을 파일 외부 요청 없이 표시한다', () => {
    const output = render({offline: true});
    expect(output).toContain('href="data:image/svg+xml;base64,');
    expect(output).toContain('href="data:image/png;base64,');
    expect(output).not.toMatch(/href="\/favicon/);
    expect(output).not.toContain('href="/apple-touch-icon');
  });
  it('공유 이미지와 설치 아이콘이 메타 정보에 맞는 크기로 존재한다', async () => {
    for (const [path, width, height] of [
      ['public/og-studycrew-mazerun.jpg',1200,630],
      ['public/favicon-32.png',32,32],
      ['public/apple-touch-icon.png',180,180],
      ['public/icon-192.png',192,192],
      ['public/icon-512.png',512,512],
    ]) {
      const metadata = await sharp(path).metadata();
      expect(metadata.width).toBe(width); expect(metadata.height).toBe(height);
    }
    const icon = readFileSync('public/favicon.ico');
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBe(3);
  });
});
