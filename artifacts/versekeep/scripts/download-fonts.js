#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// FILE: scripts/download-fonts.js
// Downloads all required .ttf fonts into assets/fonts/
//
// Run once after cloning the project:
//   node scripts/download-fonts.js
// ═══════════════════════════════════════════════════════════

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// ─── Font download URLs (Google Fonts CDN) ───────────────
const FONTS = [
  {
    name: 'BebasNeue-Regular.ttf',
    url:  'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.ttf',
  },
  {
    name: 'PlayfairDisplay-Regular.ttf',
    url:  'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.ttf',
  },
  {
    name: 'PlayfairDisplay-Italic.ttf',
    url:  'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtY.ttf',
  },
  {
    name: 'DMSans-Regular.ttf',
    url:  'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf',
  },
  {
    name: 'DMSans-Medium.ttf',
    url:  'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxhTg.ttf',
  },
  {
    name: 'DMSans-Bold.ttf',
    url:  'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf',
  },
];

// ─── Create fonts directory if it doesn't exist ──────────
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  console.log(`✓ Created ${FONTS_DIR}`);
}

// ─── Download a single file ──────────────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  ⏭  Already exists: ${path.basename(dest)}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = (fs.statSync(dest).size / 1024).toFixed(1);
        console.log(`  ✓  ${path.basename(dest)} (${size} KB)`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log('\n📦 VerseKeep — Downloading fonts\n');

  let success = 0;
  let failed  = 0;

  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.name);
    try {
      await download(font.url, dest);
      success++;
    } catch (e) {
      console.error(`  ✗  Failed: ${font.name} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${success} font(s) ready · ${failed} failed`);

  if (failed > 0) {
    console.log(`
If any downloads failed, get them manually from:
  https://fonts.google.com/specimen/Bebas+Neue
  https://fonts.google.com/specimen/Playfair+Display
  https://fonts.google.com/specimen/DM+Sans

Save them to: assets/fonts/
    `);
    process.exit(1);
  }

  console.log(`
✅ All fonts downloaded to assets/fonts/

Next steps:
  1. Run: npx expo start
  2. Scan QR code with Expo Go on your phone
  3. Your app should boot with all brand fonts loaded!
  `);
}

main().catch(console.error);
