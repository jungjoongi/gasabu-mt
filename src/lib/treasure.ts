import { getJSON, setJSON, addToSet, getSet, setIfAbsent } from '@/lib/kv'
import type { Treasure } from '@/types'

const KEY = (uuid: string) => `treasure:${uuid}`
const CLAIM_LOCK = (uuid: string) => `treasure-claim-lock:${uuid}`
const LIST = 'treasures:list'

export async function seedTreasure(uuid: string): Promise<void> {
  const existing = await getJSON<Treasure>(KEY(uuid))
  if (existing) return
  await setJSON<Treasure>(KEY(uuid), { uuid })
  await addToSet(LIST, uuid)
}

export async function getTreasure(uuid: string): Promise<Treasure | null> {
  return getJSON<Treasure>(KEY(uuid))
}

export async function listTreasureUuids(): Promise<string[]> {
  return getSet(LIST)
}

export type ClaimResult =
  | { outcome: 'claimed' }
  | { outcome: 'already-by-self' }
  | { outcome: 'already-by-other'; byFamilyId: string }
  | { outcome: 'unknown' }

export async function claimTreasure(
  uuid: string,
  familyId: string,
): Promise<ClaimResult> {
  const t = await getTreasure(uuid)
  if (!t) return { outcome: 'unknown' }
  if (t.claimedByFamilyId === familyId) return { outcome: 'already-by-self' }
  if (t.claimedByFamilyId)
    return { outcome: 'already-by-other', byFamilyId: t.claimedByFamilyId }

  // atomic CAS via setnx lock — race-safe winner selection
  const locked = await setIfAbsent(CLAIM_LOCK(uuid), familyId)
  if (!locked) {
    const winner = await getJSON<string>(CLAIM_LOCK(uuid))
    if (winner !== familyId) {
      return { outcome: 'already-by-other', byFamilyId: winner ?? 'unknown' }
    }
    // re-entry by same family — proceed
  }

  await setJSON<Treasure>(KEY(uuid), {
    ...t,
    claimedByFamilyId: familyId,
    claimedAt: Date.now(),
  })
  return { outcome: 'claimed' }
}
