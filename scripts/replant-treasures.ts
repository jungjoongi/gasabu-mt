// 기존 보물 키를 모두 삭제하고, out/treasure-urls.txt 에 적힌 UUID 만 다시 시드.
// 게임 상태/가족 등 다른 키는 건드리지 않는다.
import { readFileSync } from 'node:fs'
import { listKeys, del } from '../src/lib/kv'
import { seedTreasure } from '../src/lib/treasure'

async function main() {
  const allKeys = await listKeys('*')
  const treasureKeys = allKeys.filter(
    k => (k.startsWith('treasure:') && !k.startsWith('treasure-claim-lock:')) ||
         k === 'treasures:list' ||
         k.startsWith('treasure-claim-lock:'),
  )
  for (const k of treasureKeys) await del(k)
  console.log(`🗑️  purged ${treasureKeys.length} treasure 관련 키`)

  const lines = readFileSync('out/treasure-urls.txt', 'utf8').split('\n').filter(Boolean)
  const uuids = lines
    .map(line => line.match(/\/scan\/([0-9a-f-]{36})/i)?.[1])
    .filter((u): u is string => Boolean(u))

  for (const u of uuids) await seedTreasure(u)
  console.log(`🌱 reseeded ${uuids.length} UUIDs from out/treasure-urls.txt`)
}

main().catch(e => { console.error(e); process.exit(1) })
