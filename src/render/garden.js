// 생성 에셋은 준비되면 미로 캐시를 다시 그립니다.
import backdropUrl from '../assets/garden/backdrop.webp';
import floorUrl from '../assets/garden/floor.webp';
import hedgeUrl from '../assets/garden/hedge.webp';

export function loadGardenAssets(onReady) {
  const assets = {};
  for (const [key, url] of Object.entries({ backdrop: backdropUrl, floor: floorUrl, hedge: hedgeUrl })) {
    const img = new Image();
    img.onload = () => { assets[key] = img; onReady(); };
    img.src = url;
  }
  return assets;
}

export function texturePattern(ctx, image, size) {
  if (!image) return null;
  const pattern = ctx.createPattern(image, 'repeat');
  pattern.setTransform(new DOMMatrix().scale(size / image.width));
  return pattern;
}
