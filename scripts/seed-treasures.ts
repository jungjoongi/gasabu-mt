import { v4 as uuidv4 } from 'uuid'
import { writeFileSync } from 'node:fs'
import { seedTreasure } from '../src/lib/treasure'

async function main() {
  const count = Number(process.argv[2] ?? 60)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const uuids: string[] = []
  for (let i = 0; i < count; i++) {
    const u = uuidv4()
    await seedTreasure(u)
    uuids.push(u)
  }
  const lines = uuids.map((u) => `${baseUrl}/scan/${u}`)
  writeFileSync('out/treasure-urls.txt', lines.join('\n'), 'utf8')
  console.log(`seeded ${uuids.length} treasures → out/treasure-urls.txt`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
