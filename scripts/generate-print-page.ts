import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import QRCode from 'qrcode'

// 잃어버린 13지파의 후예 — 보물 QR 인쇄용 HTML 생성기.
// out/treasure-urls.txt 를 읽어 inline SVG QR 카드를 4×6 = 24장/A4 로 배열한 단일 HTML 파일을 만든다.

const COLS = 4
const ROWS = 6
const PER_PAGE = COLS * ROWS // 24장/페이지

async function main() {
  const lines = readFileSync('out/treasure-urls.txt', 'utf8').split('\n').filter(Boolean)
  if (lines.length === 0) {
    console.error('out/treasure-urls.txt 가 비어있습니다. npm run seed 부터 실행하세요.')
    process.exit(1)
  }

  const cards = await Promise.all(
    lines.map(async (url, i) => {
      const svg = await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 180,
      })
      const cleaned = svg
        .replace(/<svg([^>]*)\swidth="\d+"/, '<svg$1')
        .replace(/\sheight="\d+"/, '')
      return { num: String(i + 1).padStart(2, '0'), url, svg: cleaned }
    }),
  )

  const totalPages = Math.ceil(cards.length / PER_PAGE)

  let pages = ''
  for (let p = 0; p < totalPages; p++) {
    const slice = cards.slice(p * PER_PAGE, (p + 1) * PER_PAGE)
    const cellsHtml = slice
      .map(
        c => `
      <div class="card">
        <div class="qr">${c.svg}</div>
        <div class="label">
          <div class="num">#${c.num}</div>
          <div class="brand">잃어버린 13지파의 후예</div>
        </div>
      </div>`,
      )
      .join('')

    pages += `
    <section class="page">
      <div class="grid">${cellsHtml}</div>
      <div class="footer">${p + 1} / ${totalPages}</div>
    </section>`
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>13지파 보물 QR — 인쇄용 (${cards.length}장 / ${totalPages}페이지)</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #2a1810; color: #1a1a1a; font-family: ui-sans-serif, system-ui, "Apple SD Gothic Neo", sans-serif; }
    @page { size: A4; margin: 8mm; }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 8mm;
      background: white;
      margin: 12mm auto;
      box-shadow: 0 6px 24px rgba(0,0,0,0.4);
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .page:last-child { page-break-after: auto; }

    .grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(${COLS}, 1fr);
      grid-template-rows: repeat(${ROWS}, 1fr);
      gap: 0;
    }

    .card {
      border: 1px dashed #aaa;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      page-break-inside: avoid;
    }

    .qr {
      width: 100%;
      max-width: 36mm;
      aspect-ratio: 1;
    }
    .qr svg { width: 100%; height: 100%; display: block; }

    .label { text-align: center; line-height: 1.2; }
    .num { font-size: 11pt; font-weight: 700; letter-spacing: 0.05em; }
    .brand { font-size: 7pt; color: #666; margin-top: 1mm; letter-spacing: 0.02em; }

    .footer { text-align: center; font-size: 8pt; color: #888; padding-top: 4mm; }

    @media print {
      html, body { background: white; }
      .page { box-shadow: none; margin: 0; padding: 0; }
      .grid { padding: 8mm; }
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>
`

  mkdirSync('out', { recursive: true })
  writeFileSync('out/print.html', html, 'utf8')
  console.log(`📄 out/print.html — ${cards.length}장 / ${COLS}×${ROWS} 격자 / ${totalPages}페이지`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
