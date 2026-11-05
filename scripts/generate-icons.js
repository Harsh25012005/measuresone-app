/**
 * Regenerates every app icon asset from assets/truefit.png.
 *
 * The source art is the TrueFit "TF" mark: a white glyph on a rounded square in the brand blue
 * (#2563EB), on a white page. From it this script derives:
 *   - icon.png            full-bleed blue square with the white glyph (the OS applies its own corner mask)
 *   - splash-icon.png     the rounded-square mark on a transparent background
 *   - favicon.png         the rounded-square mark, small
 *   - iconlogo.png        the rounded-square mark, large
 *   - android-icon-*.png  adaptive icon layers: flat blue background + white glyph, plus a monochrome glyph
 *
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'truefit.png');
const BLUE = [37, 99, 235];

const isWhite = (r, g, b) => r > 235 && g > 235 && b > 235;

/** How "white" a pixel is on the blue→white ramp, 0..1 (the source only contains those two colours). */
const whiteness = (r) => Math.min(1, Math.max(0, (r - BLUE[0]) / (255 - BLUE[0])));

function bounds(width, height, test) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (test(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Pixels reachable from the image edge through white: the page around the rounded square. */
function outsideMask(image) {
  const { width, height, data } = image.bitmap;
  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (seen[i]) return;
    const o = i * 4;
    if (!isWhite(data[o], data[o + 1], data[o + 2])) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width, y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return seen;
}

/** The rounded-square mark cropped tight, with the page around it made transparent. */
function roundedMark(source, outside) {
  const { width, height, data } = source.bitmap;
  const box = bounds(width, height, (x, y) => !outside[y * width + x]);
  const mark = source.clone();
  const md = mark.bitmap.data;
  for (let i = 0; i < width * height; i++) {
    if (!outside[i]) continue;
    const o = i * 4;
    // soft edge: the more white, the more transparent; colour is the pure brand blue
    md[o] = BLUE[0]; md[o + 1] = BLUE[1]; md[o + 2] = BLUE[2];
    md[o + 3] = Math.round(255 * (1 - whiteness(data[o])));
  }
  return mark.crop(box.x, box.y, box.w, box.h);
}

/** The white glyph alone (transparent elsewhere), cropped tight. */
function glyphOnly(source, mark) {
  const { width, height, data } = mark.bitmap;
  const inset = Math.round(width * 0.16); // keep clear of the rounded corners
  const white = (x, y) => {
    if (x < inset || y < inset || x >= width - inset || y >= height - inset) return false;
    const o = (y * width + x) * 4;
    return data[o + 3] > 200 && whiteness(data[o]) > 0.5;
  };
  const box = bounds(width, height, white);
  const glyph = new Jimp(box.w, box.h, 0x00000000);
  const gd = glyph.bitmap.data;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const sx = box.x + x, sy = box.y + y;
      const o = (sy * width + sx) * 4;
      const a = whiteness(data[o]);
      const g = (y * box.w + x) * 4;
      gd[g] = gd[g + 1] = gd[g + 2] = 255;
      gd[g + 3] = Math.round(255 * a);
    }
  }
  return glyph;
}

/** Glyph fitted to `fraction` of `size` on its longest side, centred on a transparent canvas. */
function placeGlyph(glyph, size, fraction, base) {
  const scale = (size * fraction) / Math.max(glyph.bitmap.width, glyph.bitmap.height);
  const gw = Math.round(glyph.bitmap.width * scale);
  const gh = Math.round(glyph.bitmap.height * scale);
  const canvas = new Jimp(size, size, base);
  canvas.composite(glyph.clone().resize(gw, gh), Math.round((size - gw) / 2), Math.round((size - gh) / 2));
  return canvas;
}

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Missing source art: ${SOURCE}`);
  const source = await Jimp.read(SOURCE);
  const outside = outsideMask(source);
  const mark = roundedMark(source, outside);
  const glyph = glyphOnly(source, mark);
  console.log(`mark ${mark.bitmap.width}x${mark.bitmap.height}, glyph ${glyph.bitmap.width}x${glyph.bitmap.height}`);

  const blue = Jimp.rgbaToInt(BLUE[0], BLUE[1], BLUE[2], 255);

  // icon.png: full-bleed brand blue with the glyph
  await placeGlyph(glyph, 1024, 0.6, blue).writeAsync(path.join(ASSETS, 'icon.png'));

  // splash + favicon: the rounded-square mark itself
  await mark.clone().resize(512, 512).writeAsync(path.join(ASSETS, 'splash-icon.png'));
  await mark.clone().resize(48, 48).writeAsync(path.join(ASSETS, 'favicon.png'));
  await mark.clone().resize(1024, 1024).writeAsync(path.join(ASSETS, 'iconlogo.png'));

  // Android adaptive icon: flat blue background, white glyph kept inside the safe zone
  await new Jimp(512, 512, blue).writeAsync(path.join(ASSETS, 'android-icon-background.png'));
  await placeGlyph(glyph, 512, 0.5, 0x00000000).writeAsync(path.join(ASSETS, 'android-icon-foreground.png'));
  await placeGlyph(glyph, 432, 0.5, 0x00000000).writeAsync(path.join(ASSETS, 'android-icon-monochrome.png'));

  console.log('icons written');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
