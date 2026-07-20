const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src =
  'C:/Users/user/.cursor/projects/c-Users-user-Documents-blob-survivor/assets/c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_blob_survivors_images__1_-9cb37976-1d09-482a-b3cd-b580b251b699.png';

const names = [
  'icon_diamond_lime',
  'icon_diamond_cyan',
  'icon_diamond_magenta',
  'icon_diamond_navy',
  'icon_diamond_red',
  'icon_diamond_black',
];

const outDirs = ['images', 'public/images', 'docs/images'];
for (const d of outDirs) fs.mkdirSync(d, { recursive: true });

function isBg(r, g, b) {
  return r >= 240 && g >= 240 && b >= 240;
}

function floodClearBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const stack = [];
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const p = i * 4;
    if (!isBg(data[p], data[p + 1], data[p + 2])) return;
    visited[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    data[i * 4 + 3] = 0;
    const x = i % width;
    const y = (i / width) | 0;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
}

(async () => {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  const isFg = (i) => {
    const p = i * 4;
    return !isBg(data[p], data[p + 1], data[p + 2]);
  };

  const visited = new Uint8Array(W * H);
  const comps = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = y * W + x;
      if (visited[s] || !isFg(s)) continue;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      const stack = [s];
      visited[s] = 1;
      while (stack.length) {
        const i = stack.pop();
        count += 1;
        const cx = i % W;
        const cy = (i / W) | 0;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (visited[ni] || !isFg(ni)) continue;
          visited[ni] = 1;
          stack.push(ni);
        }
      }
      if (count > 500) comps.push({ minX, minY, maxX, maxY, count });
    }
  }

  comps.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  if (comps.length !== 6) throw new Error(`Expected 6 icons, found ${comps.length}`);

  for (let i = 0; i < 6; i++) {
    const c = comps[i];
    const pad = 8;
    const left = Math.max(0, c.minX - pad);
    const top = Math.max(0, c.minY - pad);
    const width = Math.min(W - left, c.maxX - c.minX + 1 + pad * 2);
    const height = Math.min(H - top, c.maxY - c.minY + 1 + pad * 2);

    const extracted = await sharp(src)
      .extract({ left, top, width, height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    floodClearBackground(extracted.data, extracted.info.width, extracted.info.height);

    const side = Math.max(extracted.info.width, extracted.info.height, 160);
    const png = await sharp(extracted.data, {
      raw: { width: extracted.info.width, height: extracted.info.height, channels: 4 },
    })
      .extend({
        top: Math.floor((side - extracted.info.height) / 2),
        bottom: Math.ceil((side - extracted.info.height) / 2),
        left: Math.floor((side - extracted.info.width) / 2),
        right: Math.ceil((side - extracted.info.width) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    for (const d of outDirs) {
      fs.writeFileSync(path.join(d, `${names[i]}.png`), png);
    }
    console.log(`${names[i]}.png ${side}x${side} from (${left},${top}) ${width}x${height}`);
  }
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
