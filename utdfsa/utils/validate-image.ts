// magic-byte signatures for allowed image types — browser-supplied MIME type is untrustworthy
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/png':  b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  'image/webp': b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  'image/gif':  b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
}

export function imageMagicBytesMatch(mimeType: string, buffer: Buffer): boolean {
  const check = MAGIC[mimeType]
  if (!check || buffer.length < 12) return false
  return check(buffer)
}
