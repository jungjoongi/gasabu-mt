import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

async function main() {
  const lines = readFileSync('out/treasure-urls.txt', 'utf8').split('\n').filter(Boolean)
  mkdirSync('out/qr', { recursive: true })
  let i = 0
  for (const url of lines) {
    i++
    const num = String(i).padStart(2, '0')
    const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'H', width: 600, margin: 2 })
    writeFileSync(`out/qr/treasure-${num}.png`, png)
  }
  console.log(`generated ${lines.length} QR PNGs → out/qr/`)
}

main().catch(e => { console.error(e); process.exit(1) })
