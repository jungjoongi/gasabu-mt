import { v4 as uuidv4 } from 'uuid'
import { getJSON, setJSON, addToSet, getSet } from '@/lib/kv'
import { pickUnusedColor } from '@/lib/colors'
import type { Family } from '@/types'

const FAMILY_KEY = (id: string) => `family:${id}`
const NICK_KEY = (nick: string) => `nickname-index:${nick}`
const FAMILIES_LIST = 'families:list'
const MAX_FAMILIES = 8

/**
 * 닉네임 기반 가족 등록.
 *  - 동일 닉네임이 이미 있으면 기존 Family 그대로 반환 (멱등).
 *  - 8가족 슬롯이 모두 차면 throw (Error: "이미 8가족이 등록되었습니다").
 *  - 신규 등록 시 미사용 가문 색을 자동 배정.
 */
export async function registerFamily(nickname: string): Promise<Family> {
  const trimmed = nickname.trim()
  if (!trimmed) throw new Error('닉네임이 비어있습니다')

  const existingId = await getJSON<string>(NICK_KEY(trimmed))
  if (existingId) {
    const existing = await getJSON<Family>(FAMILY_KEY(existingId))
    if (existing) return existing
  }

  const all = await listAllFamilies()
  if (all.length >= MAX_FAMILIES) {
    throw new Error('이미 8가족이 등록되었습니다')
  }

  const usedColors = all.map((f) => f.color)
  const color = pickUnusedColor(usedColors)
  if (!color) throw new Error('사용 가능한 색상이 없습니다')

  const fam: Family = {
    id: uuidv4(),
    nickname: trimmed,
    color,
    treasuresFound: [],
    initialsRevealed: [],
    diaryPagesRead: 0,
    attemptsUsed: 0,
    specialHintsSeen: [],
    pushedHints: [],
    createdAt: Date.now(),
  }

  await setJSON(FAMILY_KEY(fam.id), fam)
  await setJSON(NICK_KEY(trimmed), fam.id)
  await addToSet(FAMILIES_LIST, fam.id)
  return fam
}

export async function getFamily(id: string): Promise<Family | null> {
  return getJSON<Family>(FAMILY_KEY(id))
}

export async function saveFamily(family: Family): Promise<void> {
  await setJSON(FAMILY_KEY(family.id), family)
}

export async function getFamilyByNickname(
  nickname: string,
): Promise<Family | null> {
  const id = await getJSON<string>(NICK_KEY(nickname.trim()))
  if (!id) return null
  return getFamily(id)
}

export async function listAllFamilies(): Promise<Family[]> {
  const ids = await getSet(FAMILIES_LIST)
  const all = await Promise.all(ids.map((id) => getFamily(id)))
  return all.filter((f): f is Family => f !== null)
}
