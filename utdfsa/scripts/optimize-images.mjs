// ── optimize-images.mjs ────────────────────────────────────────
// one-off asset optimization pass (perf audit items 1, 2, 3):
//   1. extract embedded PNGs from the "logo" SVGs (Figma exports that wrap a
//      base64 PNG in an SVG shell — next/image serves .svg src unoptimized,
//      so these were shipping full-size raw) and resize to ~2x display size
//   2. generate dedicated 1200x630 OG crops so social crawlers (which fetch
//      metadata image URLs raw, bypassing next/image) don't pull multi-MB heroes
//   3. downscale oversized source JPGs in place (display is already resized
//      by next/image, but cold optimizer passes decode the full source)
//
// usage: node scripts/optimize-images.mjs
// safe to re-run — re-encodes go through a size/dimension guard, and og/ crops
// are always regenerated from the (uncropped) hero source list below.
// ──────────────────────────────────────────────────────────────
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

const PUBLIC = path.join(process.cwd(), 'public')

// ── 1. logo SVG -> PNG extraction ──────────────────────────────
// [svgFile, displayPx, outFile] — outFile sized to 2x display for retina
// note: hero-logo.svg is intentionally excluded — reverted to the original
// SVG per product preference, keep it out of future re-runs
const LOGOS = [
  ['bare-logo.svg', 43, 'bare-logo.png'],
  ['cultural-logo.svg', 264, 'cultural-logo.png'],
  ['modern-logo.svg', 264, 'modern-logo.png'],
]

async function extractLogos() {
  for (const [svgFile, displayPx, outFile] of LOGOS) {
    const svgPath = path.join(PUBLIC, svgFile)
    if (!existsSync(svgPath)) { console.log(`skip ${svgFile} (not found)`); continue }
    const svg = readFileSync(svgPath, 'utf8')
    const match = svg.match(/xlink:href="data:image\/(png|jpeg|jpg);base64,([^"]+)"/)
    if (!match) { console.log(`skip ${svgFile} (no embedded base64 raster found)`); continue }
    const rasterBuffer = Buffer.from(match[2], 'base64')
    const targetPx = displayPx * 2
    const outPath = path.join(PUBLIC, outFile)
    await sharp(rasterBuffer)
      .resize({ width: targetPx, height: targetPx, fit: 'inside' })
      .png({ quality: 90 })
      .toFile(outPath)
    const before = statSync(svgPath).size
    const after = statSync(outPath).size
    console.log(`logo: ${svgFile} (${(before / 1024).toFixed(0)}KB, embedded ${match[1]}) -> ${outFile} (${(after / 1024).toFixed(0)}KB)`)
  }
}

// ── 2. OG crops (1200x630, q80) ─────────────────────────────────
// [sourceJpg, outName] -> public/og/outName.jpg
const OG_CROPS = [
  ['hero-officers.jpg', 'home.jpg'],
  ['event-photo.jpg', 'events.jpg'],
  ['pam-hero.jpg', 'pamilyas.jpg'],
  ['about-us-hero.jpg', 'about.jpg'],
  ['hero-1-gp.jpg', 'goodphil-about.jpg'],
  ['cultural-hero.jpg', 'goodphil-cultural.jpg'],
  ['modern-hero.jpg', 'goodphil-modern.jpg'],
  ['spirit-hero.jpg', 'goodphil-spirit.jpg'],
  ['sports-hero.jpg', 'goodphil-sports.jpg'],
]

async function generateOgCrops() {
  const ogDir = path.join(PUBLIC, 'og')
  if (!existsSync(ogDir)) mkdirSync(ogDir)
  for (const [sourceJpg, outName] of OG_CROPS) {
    const srcPath = path.join(PUBLIC, sourceJpg)
    if (!existsSync(srcPath)) { console.log(`skip og/${outName} (source ${sourceJpg} not found)`); continue }
    const outPath = path.join(ogDir, outName)
    await sharp(srcPath)
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(outPath)
    console.log(`og: ${sourceJpg} -> og/${outName} (${(statSync(outPath).size / 1024).toFixed(0)}KB)`)
  }
}

// ── 3. downscale oversized source JPGs in place ─────────────────
// source JPGs display at <=515px via next/image everywhere in this repo;
// 2560px keeps generous headroom for any 2x/3x DPR request while cutting
// camera-resolution originals down to something a cold transform can decode fast.
const MAX_WIDTH = 2560
const SIZE_THRESHOLD_KB = 500 // only touch files actually worth shrinking
// hero-officers.jpg and pam-hero.jpg are intentionally excluded — reverted to
// the original quality per product preference, keep them out of future re-runs
const DOWNSCALE_EXCLUDE = new Set(['hero-officers.jpg', 'pam-hero.jpg'])

async function downscaleSources() {
  const { readdirSync } = await import('node:fs')
  const jpgs = readdirSync(PUBLIC).filter(f => /\.jpe?g$/i.test(f) && !DOWNSCALE_EXCLUDE.has(f))
  for (const file of jpgs) {
    const filePath = path.join(PUBLIC, file)
    const sizeKb = statSync(filePath).size / 1024
    if (sizeKb < SIZE_THRESHOLD_KB) continue
    const before = sizeKb
    const buffer = await sharp(filePath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
    // write-to-temp + rename: overwriting the same path sharp just read from
    // can hit a transient Windows file lock (AV/indexer) with a direct write
    const tmpPath = filePath + '.tmp'
    writeFileSync(tmpPath, buffer)
    const { renameSync } = await import('node:fs')
    renameSync(tmpPath, filePath)
    const after = statSync(filePath).size / 1024
    console.log(`shrink: ${file} ${before.toFixed(0)}KB -> ${after.toFixed(0)}KB`)
  }
}

async function main() {
  console.log('── extracting logo PNGs from SVG wrappers ──')
  await extractLogos()
  console.log('\n── generating OG crops ──')
  await generateOgCrops()
  console.log('\n── downscaling oversized source JPGs ──')
  await downscaleSources()
  console.log('\ndone.')
}

main().catch(err => { console.error(err); process.exit(1) })
