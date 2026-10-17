import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const svgContent = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'icon.svg'), 'utf-8');
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${svgContent}</body></html>`);
  
  await page.setViewportSize({ width: 64, height: 64 });
  const svgElement = await page.$('svg');
  
  // 64x64 PNG
  const png64Buffer = await svgElement.screenshot({ omitBackground: true });
  fs.writeFileSync(path.join(process.cwd(), 'public', 'apple-touch-icon.png'), png64Buffer);
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'apple-icon.png'), png64Buffer);

  // 32x32 PNG for ICO
  await page.setViewportSize({ width: 32, height: 32 });
  const png32Buffer = await svgElement.screenshot({ omitBackground: true });
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icon-32.png'), png32Buffer);

  // Build a valid .ico file containing the 32x32 PNG (PNG-in-ICO standard supported by all modern browsers)
  // ICONDIR header:
  // 2 bytes reserved (0)
  // 2 bytes type (1 for ICO)
  // 2 bytes image count (1)
  // ICONDIRENTRY:
  // 1 byte width (32)
  // 1 byte height (32)
  // 1 byte color palette (0)
  // 1 byte reserved (0)
  // 2 bytes color planes (1)
  // 2 bytes bits per pixel (32)
  // 4 bytes image size in bytes
  // 4 bytes offset of image data from beginning of file (6 + 16 = 22)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width
  entry.writeUInt8(32, 1); // height
  entry.writeUInt8(0, 2);  // color count
  entry.writeUInt8(0, 3);  // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png32Buffer.length, 8); // size
  entry.writeUInt32LE(22, 12); // offset

  const icoBuffer = Buffer.concat([header, entry, png32Buffer]);

  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'favicon.ico'), icoBuffer);

  console.log('Favicon ICO and PNGs generated successfully!');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
