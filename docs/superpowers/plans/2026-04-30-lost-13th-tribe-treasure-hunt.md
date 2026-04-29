# 잃어버린 13지파의 후예 — 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8가족이 펜션·운동장에서 60개 QR 보물을 자유 수집하며 7글자 초성 단서로 음해자 "하만"을 추리하는 모바일 웹게임을 빌드하고 Vercel에 배포한다.

**Architecture:** Next.js 16 App Router 단일 애플리케이션. 프론트엔드는 모바일 우선 React Server/Client Components, 백엔드는 Route Handlers, 영속성은 Upstash Redis(Vercel Marketplace 통합), 실시간 동기화는 클라이언트 폴링. 가족 세션은 닉네임 기반 + httpOnly 쿠키. 보물은 UUID 기반 자유 수집, atomic CAS로 race 처리.

**Tech Stack:** Next.js 16.2 / TypeScript 5.9 / Tailwind CSS 4 / Upstash Redis (`@upstash/redis`) / Vitest 3.2 + @testing-library / Playwright 1.58 (e2e) / Zod 4 / qrcode (CLI).

> **데이터 스토어 결정**: 과거의 `@vercel/kv` 패키지는 deprecated. Vercel 공식 권장은 Upstash Redis를 Marketplace에서 통합한 뒤 `@upstash/redis` SDK로 직접 호출. Vercel KV 시절 환경 변수(`KV_*`) 대신 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 사용.

**Spec:** `docs/superpowers/specs/2026-04-30-lost-13th-tribe-treasure-hunt-design.md`

---

## 파일 구조

```
workshop-game/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .gitignore
│
├── public/
│   └── audio/
│       ├── prologue.mp3
│       ├── diary-1.mp3 ~ diary-7.mp3
│       ├── climax.mp3
│       └── ending.mp3
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # 루트 레이아웃 (Tailwind, 폰트)
│   │   ├── page.tsx                       # 스플래시 화면
│   │   ├── register/page.tsx              # 닉네임 등록
│   │   ├── play/page.tsx                  # 메인 게임 화면 (client)
│   │   ├── scan/[uuid]/page.tsx           # QR 진입 → 처리 → 결과
│   │   ├── result/page.tsx                # 클라이맥스 화면
│   │   ├── admin/page.tsx                 # 운영자 페이지
│   │   └── api/
│   │       ├── family/
│   │       │   ├── register/route.ts
│   │       │   └── state/route.ts
│   │       ├── families/progress/route.ts
│   │       ├── scan/[uuid]/route.ts
│   │       ├── answer/route.ts
│   │       ├── game/state/route.ts
│   │       └── admin/
│   │           ├── start-game/route.ts
│   │           ├── reset-game/route.ts
│   │           └── push-hint/route.ts
│   │
│   ├── lib/
│   │   ├── kv.ts                          # KV client wrapper (mockable)
│   │   ├── auth.ts                        # 쿠키 기반 familyId 조회/설정
│   │   ├── colors.ts                      # 8 가문 색상 + 미사용 색 할당
│   │   ├── initials.ts                    # 7글자 정답표 + 랜덤 채움 로직
│   │   ├── content.ts                     # 일기장 7페이지, 스페셜 힌트, 프롤로그 텍스트
│   │   ├── family.ts                      # Family CRUD
│   │   ├── treasure.ts                    # Treasure CRUD + atomic claim
│   │   └── game-state.ts                  # 글로벌 상태 + atomic 우승자 락
│   │
│   ├── components/
│   │   ├── InitialsBoard.tsx              # 7칸 초성판
│   │   ├── DiaryStack.tsx                 # 일기장 카드 스택 + 음성 재생
│   │   ├── ProgressLeaderboard.tsx        # 다른 가족 진행도 (폴링)
│   │   ├── SpecialHintCard.tsx
│   │   ├── ScanCTA.tsx                    # "보물 스캔하기" 안내 CTA
│   │   ├── AnswerModal.tsx
│   │   └── AudioPlayer.tsx                # mp3 재생 with controls
│   │
│   └── types/index.ts                     # 공유 타입
│
├── scripts/
│   ├── seed-treasures.ts                  # 60 UUID 생성 + KV 등록
│   └── generate-qr.ts                     # QR PNG 생성 (인쇄용)
│
└── tests/
    ├── lib/
    │   ├── initials.test.ts
    │   ├── colors.test.ts
    │   ├── family.test.ts
    │   ├── treasure.test.ts
    │   └── game-state.test.ts
    ├── api/
    │   ├── register.test.ts
    │   ├── scan.test.ts
    │   └── answer.test.ts
    └── e2e/
        └── happy-path.spec.ts             # Playwright
```

---

## 핵심 컨벤션

- **테스트 우선**: 모든 lib/* 함수와 핵심 API는 TDD. 컴포넌트 단위 테스트는 생략 (dev server에서 시각 확인).
- **Redis 모킹**: `tests/setup.ts`에서 `@upstash/redis` 의 `Redis` 클래스를 in-memory Map 모킹. 실제 Upstash 연결은 dev/prod에서만.
- **commit 단위**: 각 태스크 끝에 1커밋. 태스크 ID와 한국어 제목 포함 (예: `feat(T4): 7칸 초성판 랜덤 채움 로직`).
- **에러 응답 포맷**: `{ ok: false, error: "한국어 메시지" }` / 성공: `{ ok: true, data: ... }`.
- **세션 쿠키**: `familyId` (httpOnly, sameSite=lax, 7일).
- **timezone**: `Asia/Seoul`.

---

# Phase 1 — 프로젝트 기반 (Tasks 1-3)

### Task 1: Next.js 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: 디렉터리에서 `git init` 실행**

```bash
cd /Users/joongi/git/workshop-game
git init -b main
```

- [ ] **Step 2: Next.js 16 + TS + Tailwind 스캐폴드**

```bash
npx --yes create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --no-import-alias --use-npm --turbopack
```

스캐폴드가 기존 `docs/`, `.superpowers/` 등을 덮어쓰지 않게 주의. 충돌 시 임시 디렉터리에서 만든 뒤 파일 머지.

- [ ] **Step 3: 추가 의존성 설치**

```bash
npm install @upstash/redis zod uuid
npm install -D vitest@^3.2 @vitest/ui @testing-library/react @testing-library/jest-dom \
  jsdom @types/uuid qrcode @types/qrcode tsx @playwright/test
```

`package.json` 의 `next` 버전이 `^16.0.0` 이상인지 확인 (`create-next-app@latest` 가 자동으로 최신 16.x 설치). 다르면 `npm install next@^16.2 react@^19 react-dom@^19` 로 강제 업그레이드.

- [ ] **Step 4: `.env.example` 작성**

`.env.example`:
```
# Vercel → Storage → Marketplace에서 Upstash Redis 추가하면 자동으로 주입됨
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_PASSWORD=change-me
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_POLL_INTERVAL_MS=3000
NEXT_PUBLIC_PROGRESS_POLL_INTERVAL_MS=5000
```

- [ ] **Step 5: `.gitignore`에 `.superpowers/`, `.env.local`, `out/qr/` 추가**

기본 `.gitignore`에 다음 라인 추가:
```
.superpowers/
.env.local
out/
```

- [ ] **Step 6: `src/app/page.tsx`를 임시 스플래시로 교체**

```tsx
export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-950 text-amber-100">
      <h1 className="text-3xl font-serif">잃어버린 13지파의 후예</h1>
    </main>
  )
}
```

- [ ] **Step 7: `npm run dev` 가 동작하고 스플래시가 보이는지 확인**

Run: `npm run dev`
Expected: `http://localhost:3000` 에서 "잃어버린 13지파의 후예" 표시

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore(T1): Next.js 16 + TS 5.9 + Tailwind 4 프로젝트 초기화"
```

---

### Task 2: KV 래퍼 + Vitest 셋업

**Files:**
- Create: `src/lib/kv.ts`, `vitest.config.ts`, `tests/setup.ts`, `tests/lib/kv.test.ts`

- [ ] **Step 1: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

`tsconfig.json` 의 `compilerOptions.paths` 에도 동일한 alias 추가:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 2: `package.json` 스크립트 추가**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "seed": "tsx scripts/seed-treasures.ts",
  "qr": "tsx scripts/generate-qr.ts"
}
```

- [ ] **Step 3: `tests/setup.ts` — `@upstash/redis` in-memory 모킹**

```ts
import { vi, beforeEach } from 'vitest'

const store = new Map<string, unknown>()

const fakeRedis = {
  get: async (key: string) => store.get(key) ?? null,
  set: async (key: string, value: unknown, opts?: { nx?: boolean }) => {
    if (opts?.nx && store.has(key)) return null
    store.set(key, value)
    return 'OK'
  },
  setnx: async (key: string, value: unknown) => {
    if (store.has(key)) return 0
    store.set(key, value)
    return 1
  },
  del: async (...keys: string[]) => {
    let n = 0
    for (const k of keys) { if (store.delete(k)) n++ }
    return n
  },
  sadd: async (key: string, ...members: unknown[]) => {
    const set = (store.get(key) as Set<unknown>) ?? new Set()
    members.forEach(m => set.add(m))
    store.set(key, set)
    return members.length
  },
  smembers: async (key: string) => {
    const set = (store.get(key) as Set<unknown>) ?? new Set()
    return Array.from(set)
  },
  keys: async (pattern: string) => {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return Array.from(store.keys()).filter(k => re.test(k))
  },
}

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    static fromEnv() { return fakeRedis }
    constructor() { return fakeRedis as unknown as MockRedis }
  },
}))

beforeEach(() => { store.clear() })

export const __testStore = store
```

- [ ] **Step 4: `src/lib/kv.ts` — Upstash Redis 래퍼 작성**

```ts
import { Redis } from '@upstash/redis'

// 테스트 환경에서는 mock의 fromEnv()가 fakeRedis 를 반환
// prod/dev 에서는 UPSTASH_REDIS_REST_URL/TOKEN 환경변수 사용
const redis = Redis.fromEnv()

export async function getJSON<T>(key: string): Promise<T | null> {
  const v = await redis.get<T>(key)
  return v ?? null
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await redis.set(key, value)
}

export async function setIfAbsent<T>(key: string, value: T): Promise<boolean> {
  // Upstash Redis 는 set with nx option 또는 setnx 둘 다 지원
  const result = await redis.setnx(key, value)
  return result === 1
}

export async function addToSet(key: string, member: string): Promise<void> {
  await redis.sadd(key, member)
}

export async function getSet(key: string): Promise<string[]> {
  return (await redis.smembers(key)) as string[]
}

export async function del(key: string): Promise<void> { await redis.del(key) }

export async function listKeys(pattern: string): Promise<string[]> {
  return (await redis.keys(pattern)) as string[]
}
```

- [ ] **Step 5: `tests/lib/kv.test.ts` — 래퍼 동작 검증**

```ts
import { describe, it, expect } from 'vitest'
import { getJSON, setJSON, setIfAbsent } from '@/lib/kv'

describe('kv wrapper', () => {
  it('set/get round-trip', async () => {
    await setJSON('foo', { x: 1 })
    expect(await getJSON('foo')).toEqual({ x: 1 })
  })
  it('returns null for missing', async () => {
    expect(await getJSON('missing')).toBeNull()
  })
  it('setIfAbsent succeeds first time, fails second', async () => {
    expect(await setIfAbsent('lock', 'a')).toBe(true)
    expect(await setIfAbsent('lock', 'b')).toBe(false)
    expect(await getJSON('lock')).toBe('a')
  })
})
```

- [ ] **Step 6: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: 3 passed

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat(T2): Vercel KV 래퍼 + Vitest in-memory 모킹"
```

---

### Task 3: 정적 콘텐츠 + 공유 타입

**Files:**
- Create: `src/types/index.ts`, `src/lib/colors.ts`, `src/lib/content.ts`

- [ ] **Step 1: `src/types/index.ts` — 도메인 타입**

```ts
export type GameStatus = 'idle' | 'running' | 'finished'

export interface GameState {
  status: GameStatus
  startedAt?: number
  finishedAt?: number
  winnerFamilyId?: string
  winnerNickname?: string
}

export interface Family {
  id: string
  nickname: string
  color: string
  treasuresFound: string[]
  initialsRevealed: Array<{ position: number; char: string }>
  diaryPagesRead: number
  attemptsUsed: number
  specialHintsSeen: number[]
  pushedHints: string[]
  createdAt: number
}

export interface Treasure {
  uuid: string
  claimedByFamilyId?: string
  claimedAt?: number
}

export interface FamilyProgressRow {
  nickname: string
  color: string
  count: number
  isMe: boolean
}
```

- [ ] **Step 2: `src/lib/colors.ts` — 8 가문 색상**

```ts
export const FAMILY_COLORS = [
  { name: '빨강', hex: '#dc2626' },
  { name: '주황', hex: '#ea580c' },
  { name: '노랑', hex: '#ca8a04' },
  { name: '초록', hex: '#16a34a' },
  { name: '파랑', hex: '#2563eb' },
  { name: '남색', hex: '#1e40af' },
  { name: '보라', hex: '#7c3aed' },
  { name: '갈색', hex: '#78350f' },
] as const

export function pickUnusedColor(used: string[]): string | null {
  const remaining = FAMILY_COLORS.filter(c => !used.includes(c.hex))
  return remaining[0]?.hex ?? null
}
```

- [ ] **Step 3: `src/lib/content.ts` — 일기장/힌트/프롤로그**

기획서 2.1, 2.3, 2.4, 3.5 텍스트를 그대로 옮김.

```ts
export const PROLOGUE = `야곱에게는 열두 아들이 있었다. 우리는 그렇게 알고 있다.
... (기획서 2.1 전문)`

export const DIARY_PAGES: { title: string; body: string }[] = [
  { title: '시작', body: '야곱의 열셋째 아들, 므에덴이 태어난 밤이었다...' },
  { title: '번성', body: '13지파는 광야의 천막에서 가장 신실한 등불을 켰다...' },
  { title: '약속의 땅', body: '가나안에 들어선 후, 13지파는 자신의 땅을 받지 않았다...' },
  { title: '시기의 시작', body: '그러나 시기하는 자가 있었다...' },
  { title: '첫 흔적', body: '처음에는 한 권의 두루마리가 사라졌다...' },
  { title: '마지막 결단', body: '장로들이 모였다. "우리는 사라질 것이다..."' },
  { title: '후손에게', body: '내 이름조차 너희에게 전할 수 없다...' },
]

export const SPECIAL_HINTS: Record<number, string> = {
  4: '음해자는 이스라엘 백성이 아니다. 멀리서 온 이방인이었다.',
  7: '그는 왕의 그림자였다. 왕보다 더 많은 백성을 두려워했다.',
}

export const CLIMAX_SCRIPT = `○○○ 가족이 음해자의 이름을 불렀다. 그의 이름은 — 하만...`

export const CORRECT_ANSWERS = ['하만', 'haman'] as const
```

> **참고**: 일기장 본문은 기획서 2.3의 7페이지 전체 텍스트를 복사해야 한다. 짧게 줄이지 말 것.

- [ ] **Step 4: 빌드 확인 (콘텐츠가 큰 경우 import 에러 점검)**

Run: `npm run build`
Expected: build success

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T3): 도메인 타입 + 8가문 색상 + 일기장/힌트/스크립트 정적 콘텐츠"
```

---

# Phase 2 — 핵심 라이브러리 (Tasks 4-7)

### Task 4: 7칸 초성판 로직 (TDD)

**Files:**
- Create: `src/lib/initials.ts`, `tests/lib/initials.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`tests/lib/initials.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CORRECT_INITIALS, fillNextRandom, isComplete } from '@/lib/initials'

describe('initials', () => {
  it('정답표는 ㅇㅅㄷㅅㅈㅇㅈ 7글자', () => {
    expect(CORRECT_INITIALS).toEqual(['ㅇ', 'ㅅ', 'ㄷ', 'ㅅ', 'ㅈ', 'ㅇ', 'ㅈ'])
    expect(CORRECT_INITIALS).toHaveLength(7)
  })

  it('빈 보드에서 fill하면 1칸 채워짐', () => {
    const next = fillNextRandom([])
    expect(next).not.toBeNull()
    expect(next!.position).toBeGreaterThanOrEqual(0)
    expect(next!.position).toBeLessThanOrEqual(6)
    expect(next!.char).toBe(CORRECT_INITIALS[next!.position])
  })

  it('이미 채워진 자리는 다시 안 뽑힘', () => {
    const filled = [0, 1, 2, 3, 4, 5].map(p => ({ position: p, char: CORRECT_INITIALS[p] }))
    const next = fillNextRandom(filled)
    expect(next!.position).toBe(6)
  })

  it('7칸 다 차면 null 반환', () => {
    const filled = [0, 1, 2, 3, 4, 5, 6].map(p => ({ position: p, char: CORRECT_INITIALS[p] }))
    expect(fillNextRandom(filled)).toBeNull()
    expect(isComplete(filled)).toBe(true)
  })

  it('isComplete: 7개 미만은 false', () => {
    expect(isComplete([])).toBe(false)
    expect(isComplete([{ position: 0, char: 'ㅇ' }])).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test -- initials`
Expected: FAIL — `Cannot find module '@/lib/initials'`

- [ ] **Step 3: 최소 구현**

`src/lib/initials.ts`:
```ts
export const CORRECT_INITIALS = ['ㅇ', 'ㅅ', 'ㄷ', 'ㅅ', 'ㅈ', 'ㅇ', 'ㅈ'] as const

export interface RevealedSlot {
  position: number
  char: string
}

export function fillNextRandom(filled: RevealedSlot[]): RevealedSlot | null {
  const filledPositions = new Set(filled.map(f => f.position))
  const unfilled = [0, 1, 2, 3, 4, 5, 6].filter(p => !filledPositions.has(p))
  if (unfilled.length === 0) return null
  const pick = unfilled[Math.floor(Math.random() * unfilled.length)]
  return { position: pick, char: CORRECT_INITIALS[pick] }
}

export function isComplete(filled: RevealedSlot[]): boolean {
  return filled.length >= 7
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- initials`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T4): 7칸 초성판 정답표 + 랜덤 채움 로직 + 단위 테스트"
```

---

### Task 5: Family 라이브러리 (TDD)

**Files:**
- Create: `src/lib/family.ts`, `tests/lib/family.test.ts`

KV 키 규약:
- `family:{familyId}` — Family 객체
- `nickname-index:{nickname}` — familyId 문자열
- `families:list` — Set of familyIds

- [ ] **Step 1: 실패 테스트 작성**

`tests/lib/family.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { registerFamily, getFamilyByNickname, getFamily, listAllFamilies } from '@/lib/family'

describe('family', () => {
  it('신규 닉네임 등록 시 familyId, color 발급', async () => {
    const f = await registerFamily('김씨네')
    expect(f.id).toBeTruthy()
    expect(f.nickname).toBe('김씨네')
    expect(f.color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(f.treasuresFound).toEqual([])
    expect(f.initialsRevealed).toEqual([])
    expect(f.attemptsUsed).toBe(0)
  })

  it('동일 닉네임 재등록 시 기존 familyId 반환', async () => {
    const a = await registerFamily('박씨네')
    const b = await registerFamily('박씨네')
    expect(a.id).toBe(b.id)
    expect(a.color).toBe(b.color)
  })

  it('8가족까지만 등록 가능', async () => {
    for (let i = 0; i < 8; i++) await registerFamily(`가족${i}`)
    await expect(registerFamily('가족9')).rejects.toThrow(/8가족/)
  })

  it('등록한 가족은 색상이 모두 다름', async () => {
    const colors = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const f = await registerFamily(`가족${i}`)
      colors.add(f.color)
    }
    expect(colors.size).toBe(8)
  })

  it('listAllFamilies 는 등록된 가족 모두 반환', async () => {
    await registerFamily('A'); await registerFamily('B')
    const all = await listAllFamilies()
    expect(all.map(f => f.nickname).sort()).toEqual(['A', 'B'])
  })

  it('getFamilyByNickname 미등록 시 null', async () => {
    expect(await getFamilyByNickname('없음')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- family`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lib/family.ts`:
```ts
import { v4 as uuidv4 } from 'uuid'
import { getJSON, setJSON, setIfAbsent, addToSet, getSet } from '@/lib/kv'
import { FAMILY_COLORS, pickUnusedColor } from '@/lib/colors'
import type { Family } from '@/types'

const FAMILY_KEY = (id: string) => `family:${id}`
const NICK_KEY = (nick: string) => `nickname-index:${nick}`
const FAMILIES_LIST = 'families:list'
const MAX_FAMILIES = 8

export async function registerFamily(nickname: string): Promise<Family> {
  const trimmed = nickname.trim()
  if (!trimmed) throw new Error('닉네임이 비어있습니다')

  const existingId = await getJSON<string>(NICK_KEY(trimmed))
  if (existingId) {
    const existing = await getJSON<Family>(FAMILY_KEY(existingId))
    if (existing) return existing
  }

  const all = await listAllFamilies()
  if (all.length >= MAX_FAMILIES) throw new Error('이미 8가족이 등록되었습니다')

  const usedColors = all.map(f => f.color)
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

export async function getFamilyByNickname(nickname: string): Promise<Family | null> {
  const id = await getJSON<string>(NICK_KEY(nickname.trim()))
  if (!id) return null
  return getFamily(id)
}

export async function listAllFamilies(): Promise<Family[]> {
  const ids = await getSet(FAMILIES_LIST)
  const all = await Promise.all(ids.map(id => getFamily(id)))
  return all.filter((f): f is Family => f !== null)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- family`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T5): Family 라이브러리 — 닉네임 기반 등록/조회 + 8가족 슬롯 관리"
```

---

### Task 6: Treasure 라이브러리 (atomic claim) (TDD)

**Files:**
- Create: `src/lib/treasure.ts`, `tests/lib/treasure.test.ts`

KV 키 규약:
- `treasure:{uuid}` — Treasure 객체
- `treasures:list` — Set of UUIDs

- [ ] **Step 1: 실패 테스트 작성**

`tests/lib/treasure.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { seedTreasure, claimTreasure, getTreasure } from '@/lib/treasure'

describe('treasure', () => {
  it('seed 후 미발견 상태로 조회됨', async () => {
    await seedTreasure('uuid-1')
    const t = await getTreasure('uuid-1')
    expect(t).toEqual({ uuid: 'uuid-1' })
  })

  it('claim 성공 시 claimedByFamilyId 기록', async () => {
    await seedTreasure('uuid-2')
    const result = await claimTreasure('uuid-2', 'fam-A')
    expect(result.outcome).toBe('claimed')
    const t = await getTreasure('uuid-2')
    expect(t!.claimedByFamilyId).toBe('fam-A')
    expect(t!.claimedAt).toBeGreaterThan(0)
  })

  it('이미 자기가 claim한 보물 재시도 → already-by-self', async () => {
    await seedTreasure('uuid-3')
    await claimTreasure('uuid-3', 'fam-A')
    const result = await claimTreasure('uuid-3', 'fam-A')
    expect(result.outcome).toBe('already-by-self')
  })

  it('다른 가족이 claim한 보물 → already-by-other', async () => {
    await seedTreasure('uuid-4')
    await claimTreasure('uuid-4', 'fam-A')
    const result = await claimTreasure('uuid-4', 'fam-B')
    expect(result.outcome).toBe('already-by-other')
    expect(result.byFamilyId).toBe('fam-A')
  })

  it('seed 안 된 uuid → unknown', async () => {
    const result = await claimTreasure('does-not-exist', 'fam-A')
    expect(result.outcome).toBe('unknown')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- treasure`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/lib/treasure.ts`:
```ts
import { getJSON, setJSON, addToSet, getSet, setIfAbsent } from '@/lib/kv'
import type { Treasure } from '@/types'

const KEY = (uuid: string) => `treasure:${uuid}`
const CLAIM_LOCK = (uuid: string) => `treasure-claim-lock:${uuid}`
const LIST = 'treasures:list'

export async function seedTreasure(uuid: string): Promise<void> {
  const existing = await getJSON<Treasure>(KEY(uuid))
  if (existing) return
  await setJSON(KEY(uuid), { uuid })
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

export async function claimTreasure(uuid: string, familyId: string): Promise<ClaimResult> {
  const t = await getTreasure(uuid)
  if (!t) return { outcome: 'unknown' }
  if (t.claimedByFamilyId === familyId) return { outcome: 'already-by-self' }
  if (t.claimedByFamilyId) return { outcome: 'already-by-other', byFamilyId: t.claimedByFamilyId }

  // atomic CAS via setnx lock
  const locked = await setIfAbsent(CLAIM_LOCK(uuid), familyId)
  if (!locked) {
    const winner = await getJSON<string>(CLAIM_LOCK(uuid))
    if (winner === familyId) {
      // edge: re-entry — proceed
    } else {
      return { outcome: 'already-by-other', byFamilyId: winner ?? 'unknown' }
    }
  }

  await setJSON(KEY(uuid), { ...t, claimedByFamilyId: familyId, claimedAt: Date.now() })
  return { outcome: 'claimed' }
}
```

- [ ] **Step 4: 테스트 통과**

Run: `npm test -- treasure`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T6): Treasure 라이브러리 — UUID seed + atomic claim 로직"
```

---

### Task 7: 게임 상태 + 인증 라이브러리 (TDD)

**Files:**
- Create: `src/lib/game-state.ts`, `src/lib/auth.ts`, `tests/lib/game-state.test.ts`

- [ ] **Step 1: 게임 상태 테스트 작성**

`tests/lib/game-state.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getGameState, startGame, claimWinner, resetGame } from '@/lib/game-state'

describe('game-state', () => {
  it('초기 상태는 idle', async () => {
    const s = await getGameState()
    expect(s.status).toBe('idle')
  })

  it('startGame 후 running', async () => {
    await startGame()
    const s = await getGameState()
    expect(s.status).toBe('running')
    expect(s.startedAt).toBeGreaterThan(0)
  })

  it('claimWinner 첫 호출 성공, 두 번째는 실패', async () => {
    await startGame()
    const a = await claimWinner('fam-A', '김씨네')
    expect(a.won).toBe(true)
    const b = await claimWinner('fam-B', '박씨네')
    expect(b.won).toBe(false)
    expect(b.existingWinner).toEqual({ familyId: 'fam-A', nickname: '김씨네' })
    const s = await getGameState()
    expect(s.status).toBe('finished')
    expect(s.winnerFamilyId).toBe('fam-A')
  })

  it('resetGame 은 idle 로 복귀', async () => {
    await startGame()
    await claimWinner('fam-A', '김씨네')
    await resetGame()
    expect((await getGameState()).status).toBe('idle')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- game-state`
Expected: FAIL

- [ ] **Step 3: 게임 상태 구현**

`src/lib/game-state.ts`:
```ts
import { getJSON, setJSON, setIfAbsent, del } from '@/lib/kv'
import type { GameState } from '@/types'

const KEY = 'game:state'
const WINNER_LOCK = 'game:winner-lock'

export async function getGameState(): Promise<GameState> {
  return (await getJSON<GameState>(KEY)) ?? { status: 'idle' }
}

export async function startGame(): Promise<void> {
  await setJSON<GameState>(KEY, { status: 'running', startedAt: Date.now() })
}

export interface ClaimWinnerResult {
  won: boolean
  existingWinner?: { familyId: string; nickname: string }
}

export async function claimWinner(familyId: string, nickname: string): Promise<ClaimWinnerResult> {
  const locked = await setIfAbsent(WINNER_LOCK, familyId)
  if (!locked) {
    const existing = (await getJSON<GameState>(KEY))!
    return {
      won: false,
      existingWinner: {
        familyId: existing.winnerFamilyId!,
        nickname: existing.winnerNickname!,
      },
    }
  }
  const current = (await getJSON<GameState>(KEY)) ?? { status: 'running' as const }
  await setJSON<GameState>(KEY, {
    ...current,
    status: 'finished',
    winnerFamilyId: familyId,
    winnerNickname: nickname,
    finishedAt: Date.now(),
  })
  return { won: true }
}

export async function resetGame(): Promise<void> {
  await del(KEY)
  await del(WINNER_LOCK)
}
```

- [ ] **Step 4: 인증 라이브러리 구현**

`src/lib/auth.ts`:
```ts
import { cookies } from 'next/headers'
import { getFamily } from '@/lib/family'
import type { Family } from '@/types'

const COOKIE = 'familyId'
const MAX_AGE = 60 * 60 * 24 * 7

export async function setFamilyCookie(familyId: string): Promise<void> {
  const c = await cookies()
  c.set(COOKIE, familyId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function getCurrentFamily(): Promise<Family | null> {
  const c = await cookies()
  const id = c.get(COOKIE)?.value
  if (!id) return null
  return getFamily(id)
}

export async function clearFamilyCookie(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE)
}
```

- [ ] **Step 5: 테스트 통과**

Run: `npm test`
Expected: 모든 lib 테스트 통과

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(T7): GameState 라이브러리 + atomic 우승 락 + 쿠키 기반 세션"
```

---

# Phase 3 — API 라우트 (Tasks 8-13)

### Task 8: POST /api/family/register

**Files:**
- Create: `src/app/api/family/register/route.ts`, `tests/api/register.test.ts`

- [ ] **Step 1: 라우트 테스트 작성**

`tests/api/register.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/headers', () => {
  const store = new Map<string, string>()
  return {
    cookies: async () => ({
      get: (name: string) => ({ value: store.get(name) }),
      set: (name: string, value: string) => { store.set(name, value) },
      delete: (name: string) => { store.delete(name) },
    }),
  }
})

import { POST } from '@/app/api/family/register/route'

function req(body: unknown): Request {
  return new Request('http://test/api/family/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/family/register', () => {
  it('신규 닉네임 등록 → 200 + family', async () => {
    const res = await POST(req({ nickname: '김씨네' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.nickname).toBe('김씨네')
  })

  it('빈 닉네임 → 400', async () => {
    const res = await POST(req({ nickname: '   ' }))
    expect(res.status).toBe(400)
  })

  it('동일 닉네임 재등록 → 같은 familyId 복원', async () => {
    const a = await (await POST(req({ nickname: '박씨네' }))).json()
    const b = await (await POST(req({ nickname: '박씨네' }))).json()
    expect(a.data.id).toBe(b.data.id)
  })

  it('9번째 가족 → 409', async () => {
    for (let i = 0; i < 8; i++) await POST(req({ nickname: `f${i}` }))
    const res = await POST(req({ nickname: 'f9' }))
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- register`
Expected: FAIL — route not found

- [ ] **Step 3: 라우트 구현**

`src/app/api/family/register/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerFamily } from '@/lib/family'
import { setFamilyCookie } from '@/lib/auth'

const Body = z.object({ nickname: z.string().min(1).max(20) })

export async function POST(req: Request) {
  let parsed
  try {
    const json = await req.json()
    parsed = Body.parse({ ...json, nickname: (json.nickname ?? '').trim() })
  } catch {
    return NextResponse.json({ ok: false, error: '닉네임을 입력해주세요' }, { status: 400 })
  }

  try {
    const family = await registerFamily(parsed.nickname)
    await setFamilyCookie(family.id)
    return NextResponse.json({ ok: true, data: family })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '등록 실패'
    const status = /8가족/.test(msg) ? 409 : 400
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- register`
Expected: 4 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T8): POST /api/family/register — 닉네임 등록 + 쿠키 발급"
```

---

### Task 9: 가족 상태 + 진행도 GET 라우트

**Files:**
- Create: `src/app/api/family/state/route.ts`, `src/app/api/families/progress/route.ts`

- [ ] **Step 1: 가족 상태 라우트 구현**

`src/app/api/family/state/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getCurrentFamily } from '@/lib/auth'

export async function GET() {
  const family = await getCurrentFamily()
  if (!family) return NextResponse.json({ ok: false, error: '로그인 필요' }, { status: 401 })
  return NextResponse.json({ ok: true, data: family })
}
```

- [ ] **Step 2: 진행도 라우트 구현**

`src/app/api/families/progress/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { listAllFamilies } from '@/lib/family'
import { getCurrentFamily } from '@/lib/auth'
import type { FamilyProgressRow } from '@/types'

export async function GET() {
  const me = await getCurrentFamily()
  const all = await listAllFamilies()
  const rows: FamilyProgressRow[] = all
    .map(f => ({
      nickname: f.nickname,
      color: f.color,
      count: f.treasuresFound.length,
      isMe: me?.id === f.id,
    }))
    .sort((a, b) => b.count - a.count)
  return NextResponse.json({ ok: true, data: rows })
}
```

- [ ] **Step 3: 빠른 통합 점검 (수동)**

Run: `npm run dev` → 브라우저에서 `/api/families/progress` 호출 → 빈 배열 응답 확인
Expected: `{"ok":true,"data":[]}`

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(T9): GET /api/family/state + GET /api/families/progress"
```

---

### Task 10: POST /api/scan/[uuid] (TDD, 가장 복잡)

**Files:**
- Create: `src/app/api/scan/[uuid]/route.ts`, `tests/api/scan.test.ts`

- [ ] **Step 1: 스캔 시나리오 테스트 작성**

`tests/api/scan.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => ({ value: cookieStore.get(n) }),
    set: (n: string, v: string) => { cookieStore.set(n, v) },
    delete: (n: string) => { cookieStore.delete(n) },
  }),
}))

import { POST as register } from '@/app/api/family/register/route'
import { POST as scan } from '@/app/api/scan/[uuid]/route'
import { seedTreasure } from '@/lib/treasure'

async function asFamily(nickname: string) {
  cookieStore.clear()
  await register(new Request('http://t/r', { method: 'POST', body: JSON.stringify({ nickname }) }))
}

describe('POST /api/scan/[uuid]', () => {
  it('자기 가족 첫 스캔 → 보물 등록 + 초성 +1', async () => {
    await seedTreasure('u1')
    await asFamily('김씨네')
    const res = await scan(
      new Request('http://t/scan/u1', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u1' }) },
    )
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.family.treasuresFound).toEqual(['u1'])
    expect(json.data.family.initialsRevealed).toHaveLength(1)
    expect(json.data.family.diaryPagesRead).toBe(1)
  })

  it('자기가 이미 잡은 보물 재스캔 → 409', async () => {
    await seedTreasure('u2')
    await asFamily('박씨네')
    await scan(new Request('http://t/scan/u2', { method: 'POST' }), { params: Promise.resolve({ uuid: 'u2' }) })
    const res = await scan(
      new Request('http://t/scan/u2', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u2' }) },
    )
    expect(res.status).toBe(409)
  })

  it('다른 가족이 잡은 보물 → 409 + ownerNickname', async () => {
    await seedTreasure('u3')
    await asFamily('A')
    await scan(new Request('http://t/scan/u3', { method: 'POST' }), { params: Promise.resolve({ uuid: 'u3' }) })
    await asFamily('B')
    const res = await scan(
      new Request('http://t/scan/u3', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u3' }) },
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.ownerNickname).toBe('A')
  })

  it('미등록 uuid → 404', async () => {
    await asFamily('C')
    const res = await scan(
      new Request('http://t/scan/missing', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'missing' }) },
    )
    expect(res.status).toBe(404)
  })

  it('4번째 스캔 시 스페셜 힌트 트리거', async () => {
    for (let i = 1; i <= 4; i++) await seedTreasure(`x${i}`)
    await asFamily('D')
    let last
    for (let i = 1; i <= 4; i++) {
      const r = await scan(
        new Request(`http://t/scan/x${i}`, { method: 'POST' }),
        { params: Promise.resolve({ uuid: `x${i}` }) },
      )
      last = await r.json()
    }
    expect(last.data.family.specialHintsSeen).toContain(4)
  })

  it('8번째 스캔: 초성 7개 다 채워졌으므로 더 채우지 않음', async () => {
    for (let i = 1; i <= 8; i++) await seedTreasure(`y${i}`)
    await asFamily('E')
    let last
    for (let i = 1; i <= 8; i++) {
      const r = await scan(
        new Request(`http://t/scan/y${i}`, { method: 'POST' }),
        { params: Promise.resolve({ uuid: `y${i}` }) },
      )
      last = await r.json()
    }
    expect(last.data.family.treasuresFound).toHaveLength(8)
    expect(last.data.family.initialsRevealed).toHaveLength(7)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- scan`
Expected: FAIL

- [ ] **Step 3: 스캔 라우트 구현**

`src/app/api/scan/[uuid]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getCurrentFamily } from '@/lib/auth'
import { claimTreasure } from '@/lib/treasure'
import { saveFamily, getFamily } from '@/lib/family'
import { fillNextRandom } from '@/lib/initials'

interface Ctx { params: Promise<{ uuid: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  const { uuid } = await ctx.params
  const family = await getCurrentFamily()
  if (!family) return NextResponse.json({ ok: false, error: '로그인 필요' }, { status: 401 })

  const claim = await claimTreasure(uuid, family.id)

  if (claim.outcome === 'unknown') {
    return NextResponse.json({ ok: false, error: '알 수 없는 보물입니다' }, { status: 404 })
  }
  if (claim.outcome === 'already-by-self') {
    return NextResponse.json({ ok: false, error: '이미 등록한 보물입니다' }, { status: 409 })
  }
  if (claim.outcome === 'already-by-other') {
    const owner = await getFamily(claim.byFamilyId)
    return NextResponse.json(
      { ok: false, error: `이 보물은 ${owner?.nickname ?? '다른'} 가족이 이미 발견했습니다`, ownerNickname: owner?.nickname },
      { status: 409 },
    )
  }

  // claimed — update family progress
  family.treasuresFound.push(uuid)
  family.diaryPagesRead = Math.min(family.treasuresFound.length, 7)
  const next = fillNextRandom(family.initialsRevealed)
  if (next) family.initialsRevealed.push(next)
  const count = family.treasuresFound.length
  if ((count === 4 || count === 7) && !family.specialHintsSeen.includes(count)) {
    family.specialHintsSeen.push(count)
  }
  await saveFamily(family)

  return NextResponse.json({ ok: true, data: { family } })
}
```

- [ ] **Step 4: 테스트 통과**

Run: `npm test -- scan`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T10): POST /api/scan/[uuid] — atomic claim + 초성 채움 + 스페셜 힌트"
```

---

### Task 11: POST /api/answer (TDD)

**Files:**
- Create: `src/app/api/answer/route.ts`, `tests/api/answer.test.ts`

- [ ] **Step 1: 정답 라우트 테스트 작성**

`tests/api/answer.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => ({ value: cookieStore.get(n) }),
    set: (n: string, v: string) => { cookieStore.set(n, v) },
    delete: (n: string) => { cookieStore.delete(n) },
  }),
}))

import { POST as register } from '@/app/api/family/register/route'
import { POST as scan } from '@/app/api/scan/[uuid]/route'
import { POST as answer } from '@/app/api/answer/route'
import { seedTreasure } from '@/lib/treasure'
import { startGame } from '@/lib/game-state'

async function asFamily(n: string) {
  cookieStore.clear()
  await register(new Request('http://t/r', { method: 'POST', body: JSON.stringify({ nickname: n }) }))
}

function ans(value: string) {
  return new Request('http://t/answer', { method: 'POST', body: JSON.stringify({ answer: value }) })
}

describe('POST /api/answer', () => {
  it('보물 0개일 때 시도 → 403 (시도 횟수 없음)', async () => {
    await startGame(); await asFamily('A')
    const res = await answer(ans('하만'))
    expect(res.status).toBe(403)
  })

  it('보물 1개로 정답 → 우승', async () => {
    await startGame()
    await seedTreasure('t1'); await asFamily('A')
    await scan(new Request('http://t/s/t1', { method: 'POST' }), { params: Promise.resolve({ uuid: 't1' }) })
    const res = await answer(ans('하만'))
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.won).toBe(true)
  })

  it('오답 → attemptsUsed +1, 시도 횟수 차감', async () => {
    await startGame()
    await seedTreasure('t2'); await asFamily('B')
    await scan(new Request('http://t/s/t2', { method: 'POST' }), { params: Promise.resolve({ uuid: 't2' }) })
    const res = await answer(ans('가인'))
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.wrong).toBe(true)
    expect(json.data.attemptsRemaining).toBe(0)
  })

  it('이미 우승자 있음 → tooLate', async () => {
    await startGame()
    await seedTreasure('t3'); await asFamily('A')
    await scan(new Request('http://t/s/t3', { method: 'POST' }), { params: Promise.resolve({ uuid: 't3' }) })
    await answer(ans('하만'))
    await seedTreasure('t4'); await asFamily('B')
    await scan(new Request('http://t/s/t4', { method: 'POST' }), { params: Promise.resolve({ uuid: 't4' }) })
    const res = await answer(ans('하만'))
    const json = await res.json()
    expect(json.data.tooLate).toBe(true)
    expect(json.data.winnerNickname).toBe('A')
  })

  it('대소문자/공백 무시 — "Haman" 정답 처리', async () => {
    await startGame()
    await seedTreasure('t5'); await asFamily('C')
    await scan(new Request('http://t/s/t5', { method: 'POST' }), { params: Promise.resolve({ uuid: 't5' }) })
    const res = await answer(ans(' Haman '))
    expect((await res.json()).data.won).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- answer`
Expected: FAIL

- [ ] **Step 3: 라우트 구현**

`src/app/api/answer/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentFamily } from '@/lib/auth'
import { saveFamily } from '@/lib/family'
import { getGameState, claimWinner } from '@/lib/game-state'
import { CORRECT_ANSWERS } from '@/lib/content'

const Body = z.object({ answer: z.string().max(50) })

export async function POST(req: Request) {
  const family = await getCurrentFamily()
  if (!family) return NextResponse.json({ ok: false, error: '로그인 필요' }, { status: 401 })

  const json = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false, error: '입력이 올바르지 않습니다' }, { status: 400 })

  const game = await getGameState()
  if (game.status === 'finished') {
    return NextResponse.json({
      ok: true,
      data: { tooLate: true, winnerNickname: game.winnerNickname },
    })
  }

  const remaining = family.treasuresFound.length - family.attemptsUsed
  if (remaining <= 0) {
    return NextResponse.json({ ok: false, error: '시도 횟수가 없습니다. 보물을 더 찾아보세요' }, { status: 403 })
  }

  const normalized = parsed.data.answer.trim().toLowerCase().replace(/\s+/g, '')
  const correct = CORRECT_ANSWERS.some(a => a.toLowerCase() === normalized)

  if (correct) {
    const result = await claimWinner(family.id, family.nickname)
    if (result.won) return NextResponse.json({ ok: true, data: { won: true } })
    return NextResponse.json({
      ok: true,
      data: { tooLate: true, winnerNickname: result.existingWinner!.nickname },
    })
  }

  family.attemptsUsed += 1
  await saveFamily(family)
  return NextResponse.json({
    ok: true,
    data: { wrong: true, attemptsRemaining: family.treasuresFound.length - family.attemptsUsed },
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- answer`
Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T11): POST /api/answer — 정답 검증 + atomic 우승자 락"
```

---

### Task 12: GET /api/game/state

**Files:**
- Create: `src/app/api/game/state/route.ts`

- [ ] **Step 1: 라우트 구현**

`src/app/api/game/state/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getGameState } from '@/lib/game-state'

export async function GET() {
  const state = await getGameState()
  return NextResponse.json({ ok: true, data: state })
}
```

- [ ] **Step 2: 수동 점검**

Run: `npm run dev` → `/api/game/state` 호출
Expected: `{"ok":true,"data":{"status":"idle"}}`

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat(T12): GET /api/game/state — 폴링 엔드포인트"
```

---

### Task 13: 운영자 API 라우트 (4개)

**Files:**
- Create: `src/app/api/admin/start-game/route.ts`, `src/app/api/admin/reset-game/route.ts`, `src/app/api/admin/push-hint/route.ts`, `src/lib/admin.ts`

- [ ] **Step 1: 운영자 인증 헬퍼 작성**

`src/lib/admin.ts`:
```ts
export function checkAdminPassword(headerValue: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return headerValue === expected
}
```

- [ ] **Step 2: 게임 시작 라우트**

`src/app/api/admin/start-game/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { checkAdminPassword } from '@/lib/admin'
import { startGame } from '@/lib/game-state'

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  await startGame()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: 게임 리셋 라우트**

`src/app/api/admin/reset-game/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { listKeys, del } from '@/lib/kv'
import { checkAdminPassword } from '@/lib/admin'
import { resetGame } from '@/lib/game-state'

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  // Redis 전체 초기화 (게임 상태, 가족, 닉네임 인덱스, 보물 클레임)
  const keys = await listKeys('*')
  for (const k of keys) await del(k)
  await resetGame()
  return NextResponse.json({ ok: true, deleted: keys.length })
}
```

> **주의**: `reset-game` 은 KV 전체 삭제. 보물 seed도 함께 지워지므로 `npm run seed` 재실행 필요.

- [ ] **Step 4: 가족에게 힌트 푸시 라우트**

`src/app/api/admin/push-hint/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAdminPassword } from '@/lib/admin'
import { getFamilyByNickname, saveFamily } from '@/lib/family'

const Body = z.object({ nickname: z.string(), hint: z.string() })

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ ok: false, error: '입력 오류' }, { status: 400 })
  const family = await getFamilyByNickname(parsed.data.nickname)
  if (!family) return NextResponse.json({ ok: false, error: '가족 없음' }, { status: 404 })
  family.pushedHints.push(parsed.data.hint)
  await saveFamily(family)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: 수동 점검 — curl 로 게임 시작 호출**

```bash
curl -X POST http://localhost:3000/api/admin/start-game \
  -H "x-admin-password: change-me"
```
Expected: `{"ok":true}`

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(T13): 운영자 API — 게임 시작/리셋/힌트 푸시"
```

---

# Phase 4 — 프론트엔드 (Tasks 14-21)

### Task 14: 루트 레이아웃 + 글로벌 스타일

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: `src/app/layout.tsx` — 양피지 톤 글로벌 테마**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '잃어버린 13지파의 후예',
  description: '음해자를 찾아라',
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-b from-amber-950 to-stone-950 text-amber-50 font-serif antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: `src/app/globals.css` — Tailwind + 커스텀 변수**

```css
@import "tailwindcss";

:root {
  --color-parchment: #f5e6c8;
  --color-ink: #3a2a1a;
}

html, body { height: 100%; }
button { -webkit-tap-highlight-color: transparent; }
.font-handwriting { font-family: "Nanum Pen Script", "Gowun Dodum", serif; letter-spacing: 0.02em; }
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: success

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(T14): 루트 레이아웃 + 양피지 톤 글로벌 테마"
```

---

### Task 15: 스플래시 + 등록 페이지

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: 스플래시 페이지**

`src/app/page.tsx`:
```tsx
import Link from 'next/link'

export default function Splash() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="text-6xl">🕯️</div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">잃어버린 13지파의 후예</h1>
      <p className="text-amber-200/80 max-w-md leading-relaxed">
        100세대 만에 너희가 다시 모였다.<br />
        흩어진 단서를 모아 음해자의 이름을 부르라.
      </p>
      <Link
        href="/register"
        className="px-8 py-4 bg-amber-100 text-amber-950 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition"
      >
        시작하기
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: 등록 페이지 (client component)**

`src/app/register/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/family/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const json = await res.json()
    if (!json.ok) {
      setError(json.error)
      setLoading(false)
      return
    }
    router.push('/play')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h2 className="text-2xl font-bold">우리 가족 이름</h2>
      <p className="text-amber-200/70 text-sm text-center">
        기존 가족이라면 같은 이름으로 다시 입장할 수 있습니다.
      </p>
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="예: 김씨네"
          maxLength={20}
          className="px-4 py-3 rounded-xl bg-amber-50 text-amber-950 text-lg"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-4 bg-amber-100 text-amber-950 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? '등록 중...' : '입장하기'}
        </button>
        {error && <p className="text-red-300 text-sm text-center">{error}</p>}
      </form>
    </main>
  )
}
```

- [ ] **Step 3: dev 서버에서 등록 동작 확인**

Run: `npm run dev` → `/` → 시작하기 → `/register` → 닉네임 입력 → `/play` 로 이동 (현재는 빈 페이지)
Expected: 닉네임이 KV에 저장됨

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(T15): 스플래시 + 닉네임 등록 페이지"
```

---

### Task 16: 메인 게임 페이지 — 데이터 훅 + InitialsBoard

**Files:**
- Create: `src/app/play/page.tsx`, `src/components/InitialsBoard.tsx`, `src/lib/use-family.ts`

- [ ] **Step 1: 가족 상태 폴링 훅**

`src/lib/use-family.ts`:
```ts
'use client'
import { useEffect, useState } from 'react'
import type { Family, GameState } from '@/types'

const POLL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 3000)

export function useFamilyAndGame() {
  const [family, setFamily] = useState<Family | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [fRes, gRes] = await Promise.all([
          fetch('/api/family/state'),
          fetch('/api/game/state'),
        ])
        const f = await fRes.json()
        const g = await gRes.json()
        if (!alive) return
        if (f.ok) setFamily(f.data); else setError(f.error)
        if (g.ok) setGame(g.data)
      } catch (e) {
        if (alive) setError(String(e))
      }
    }
    tick()
    const id = setInterval(tick, POLL)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return { family, game, error }
}
```

- [ ] **Step 2: InitialsBoard 컴포넌트**

`src/components/InitialsBoard.tsx`:
```tsx
import type { Family } from '@/types'

export function InitialsBoard({ family }: { family: Family }) {
  const slots = Array.from({ length: 7 }, (_, i) => {
    const found = family.initialsRevealed.find(r => r.position === i)
    return found?.char ?? null
  })
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">🔮 음해자의 흔적</h3>
      <div className="flex justify-center gap-2 sm:gap-3">
        {slots.map((c, i) => (
          <div
            key={i}
            className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center rounded-lg text-2xl font-bold ${
              c ? 'bg-amber-100 text-amber-950' : 'bg-stone-800 text-stone-600'
            }`}
          >
            {c ?? '·'}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Play 페이지 (Skeleton)**

`src/app/play/page.tsx`:
```tsx
'use client'
import { useFamilyAndGame } from '@/lib/use-family'
import { InitialsBoard } from '@/components/InitialsBoard'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Play() {
  const { family, game, error } = useFamilyAndGame()
  const router = useRouter()

  useEffect(() => {
    if (game?.status === 'finished') router.push('/result')
  }, [game?.status, router])

  if (error) return <main className="p-6 text-red-300">{error}</main>
  if (!family) return <main className="p-6">로딩중...</main>

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-md mx-auto flex flex-col gap-4">
      <header
        className="rounded-2xl p-4 text-center font-bold"
        style={{ background: family.color, color: '#fff' }}
      >
        {family.nickname} <span className="opacity-70 text-sm">({family.treasuresFound.length} 발견)</span>
      </header>
      <InitialsBoard family={family} />
      <p className="text-amber-200/60 text-xs text-center mt-2">
        보물 QR을 휴대폰 카메라로 스캔하면 다음 단계가 열립니다.
      </p>
    </main>
  )
}
```

- [ ] **Step 4: dev 서버 점검 — 빈 초성판이 보임**

Run: `npm run dev` → 등록 → `/play`
Expected: "0 발견" + 점 7개 표시

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T16): Play 페이지 + 폴링 훅 + InitialsBoard"
```

---

### Task 17: DiaryStack + AudioPlayer

**Files:**
- Create: `src/components/AudioPlayer.tsx`, `src/components/DiaryStack.tsx`
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: AudioPlayer**

`src/components/AudioPlayer.tsx`:
```tsx
'use client'
import { useRef, useState } from 'react'

export function AudioPlayer({ src, label = '들려주기' }: { src: string; label?: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  return (
    <button
      onClick={() => {
        const a = ref.current
        if (!a) return
        if (a.paused) { a.play(); setPlaying(true) }
        else { a.pause(); setPlaying(false) }
      }}
      className="text-sm text-amber-200/80 hover:text-amber-100 inline-flex gap-2 items-center"
    >
      <span>{playing ? '⏸️' : '🔊'}</span> {label}
      <audio ref={ref} src={src} preload="none" onEnded={() => setPlaying(false)} />
    </button>
  )
}
```

- [ ] **Step 2: DiaryStack**

`src/components/DiaryStack.tsx`:
```tsx
import { DIARY_PAGES } from '@/lib/content'
import { AudioPlayer } from './AudioPlayer'

export function DiaryStack({ pagesRead }: { pagesRead: number }) {
  if (pagesRead === 0) {
    return (
      <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40 text-amber-200/60 text-sm">
        📜 첫 보물을 찾으면 13지파의 일기가 열립니다.
      </section>
    )
  }
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">
        📜 13지파의 일기 ({pagesRead}/7)
      </h3>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {DIARY_PAGES.slice(0, pagesRead).map((p, idx) => (
          <article key={idx} className="bg-amber-50/95 text-amber-950 rounded-xl p-4 font-handwriting">
            <h4 className="font-bold mb-1">{idx + 1}. {p.title}</h4>
            <p className="text-sm leading-relaxed whitespace-pre-line">{p.body}</p>
            <div className="mt-2"><AudioPlayer src={`/audio/diary-${idx + 1}.mp3`} /></div>
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Play 페이지에 DiaryStack 추가**

`src/app/play/page.tsx` 의 InitialsBoard 아래:
```tsx
import { DiaryStack } from '@/components/DiaryStack'
// ...
<DiaryStack pagesRead={family.diaryPagesRead} />
```

- [ ] **Step 4: 시각 확인 (mp3 파일은 아직 placeholder, 404여도 페이지 동작)**

Run: `npm run dev`
Expected: 보물 0개일 때 안내 카드, 보물 발견 후 일기장이 점진적으로 열림

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T17): DiaryStack + AudioPlayer 컴포넌트"
```

---

### Task 18: ProgressLeaderboard + SpecialHintCard

**Files:**
- Create: `src/components/ProgressLeaderboard.tsx`, `src/components/SpecialHintCard.tsx`
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: ProgressLeaderboard**

`src/components/ProgressLeaderboard.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import type { FamilyProgressRow } from '@/types'

const POLL = Number(process.env.NEXT_PUBLIC_PROGRESS_POLL_INTERVAL_MS ?? 5000)

export function ProgressLeaderboard() {
  const [rows, setRows] = useState<FamilyProgressRow[]>([])
  useEffect(() => {
    let alive = true
    async function tick() {
      const res = await fetch('/api/families/progress')
      const json = await res.json()
      if (alive && json.ok) setRows(json.data)
    }
    tick()
    const id = setInterval(tick, POLL)
    return () => { alive = false; clearInterval(id) }
  }, [])
  if (rows.length === 0) return null
  const max = Math.max(7, ...rows.map(r => r.count))
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">🏁 다른 가족 진행도</h3>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.nickname} className="flex items-center gap-3 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
            <span className={`flex-1 truncate ${r.isMe ? 'font-bold' : ''}`}>
              {r.nickname}{r.isMe && ' (나)'}
            </span>
            <div className="w-24 h-2 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-300" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: SpecialHintCard**

`src/components/SpecialHintCard.tsx`:
```tsx
import { SPECIAL_HINTS } from '@/lib/content'

export function SpecialHintCard({ seen }: { seen: number[] }) {
  if (seen.length === 0) return null
  return (
    <section className="bg-amber-100/10 border border-amber-300/40 rounded-2xl p-5">
      <h3 className="text-amber-200 text-sm tracking-widest mb-3">🏆 스페셜 힌트</h3>
      <ul className="space-y-2 text-amber-50">
        {seen.map(n => (
          <li key={n} className="text-sm leading-relaxed">
            <span className="text-amber-300/80 mr-2">#{n}</span>
            {SPECIAL_HINTS[n]}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Play 페이지에 통합**

`src/app/play/page.tsx` 의 InitialsBoard 다음:
```tsx
import { ProgressLeaderboard } from '@/components/ProgressLeaderboard'
import { SpecialHintCard } from '@/components/SpecialHintCard'
// ...
<ProgressLeaderboard />
<DiaryStack pagesRead={family.diaryPagesRead} />
<SpecialHintCard seen={family.specialHintsSeen} />
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(T18): ProgressLeaderboard + SpecialHintCard"
```

---

### Task 19: AnswerModal + ScanCTA

**Files:**
- Create: `src/components/AnswerModal.tsx`, `src/components/ScanCTA.tsx`
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: AnswerModal**

`src/components/AnswerModal.tsx`:
```tsx
'use client'
import { useState } from 'react'
import type { Family } from '@/types'

export function AnswerModal({
  family, open, onClose, onWin,
}: { family: Family; open: boolean; onClose: () => void; onWin: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remaining = family.treasuresFound.length - family.attemptsUsed

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/answer', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answer: value }),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.ok) { setError(json.error); return }
    if (json.data.won) { onWin(); return }
    if (json.data.tooLate) { setError(`이미 ${json.data.winnerNickname} 가족이 먼저 찾았습니다`); return }
    if (json.data.wrong) {
      setError(`아직 아닙니다. 보물을 더 찾아 단서를 모으세요. (남은 시도: ${json.data.attemptsRemaining})`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 border border-amber-700/40">
        <div>
          <h3 className="text-xl font-bold">🔍 정답 입력</h3>
          <p className="text-amber-200/60 text-sm mt-1">
            이건 힌트입니다 — 음해자의 이름을 적어주세요.
          </p>
          <p className="text-amber-300 text-sm mt-2">남은 시도 {remaining}회</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={remaining === 0 || busy}
            placeholder="이름을 입력하세요"
            className="px-4 py-3 rounded-xl bg-amber-50 text-amber-950 text-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={remaining === 0 || busy || !value.trim()}
            className="px-6 py-3 bg-amber-100 text-amber-950 font-bold rounded-xl disabled:opacity-50"
          >
            {busy ? '확인 중...' : '제출'}
          </button>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button type="button" onClick={onClose} className="text-amber-200/60 text-sm">닫기</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ScanCTA**

`src/components/ScanCTA.tsx`:
```tsx
export function ScanCTA() {
  return (
    <a
      href="#"
      onClick={e => { e.preventDefault(); alert('휴대폰 카메라로 보물의 QR을 비추면 자동으로 페이지가 열립니다.') }}
      className="block text-center px-6 py-5 bg-amber-100 text-amber-950 font-bold rounded-2xl shadow-lg active:scale-95"
    >
      📷 보물 스캔 안내
    </a>
  )
}
```

- [ ] **Step 3: Play 페이지에 통합 + 모달 토글**

`src/app/play/page.tsx` 끝부분 수정:
```tsx
'use client'
import { useState } from 'react'
import { AnswerModal } from '@/components/AnswerModal'
import { ScanCTA } from '@/components/ScanCTA'
// 컴포넌트 안에 state 추가:
const [open, setOpen] = useState(false)
// ... 기존 카드들 아래에:
<div className="flex flex-col gap-3 mt-2">
  <ScanCTA />
  <button
    onClick={() => setOpen(true)}
    className="px-6 py-4 bg-stone-800 border border-amber-300/40 rounded-2xl font-bold text-amber-100"
  >
    🔍 정답 입력 (남은 {family.treasuresFound.length - family.attemptsUsed}회)
  </button>
</div>
<AnswerModal
  family={family}
  open={open}
  onClose={() => setOpen(false)}
  onWin={() => router.push('/result')}
/>
```

- [ ] **Step 4: 시각 점검**

Run: `npm run dev` → 보물이 없는 상태에서 정답 모달 열어보기
Expected: 모달이 뜨고, 시도 횟수 0이라 입력 불가

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(T19): AnswerModal + ScanCTA + Play 페이지 통합"
```

---

### Task 20: 스캔 결과 페이지

**Files:**
- Create: `src/app/scan/[uuid]/page.tsx`

QR을 스캔하면 이 페이지로 진입한다. 페이지 진입 시 자동으로 `/api/scan/[uuid]` 를 호출해 처리한다.

- [ ] **Step 1: 스캔 페이지 (server component) 작성**

`src/app/scan/[uuid]/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { getCurrentFamily } from '@/lib/auth'
import { claimTreasure } from '@/lib/treasure'
import { saveFamily, getFamily } from '@/lib/family'
import { fillNextRandom } from '@/lib/initials'
import { SPECIAL_HINTS, DIARY_PAGES } from '@/lib/content'

export default async function ScanPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params
  const family = await getCurrentFamily()
  if (!family) redirect(`/register?next=/scan/${uuid}`)

  const claim = await claimTreasure(uuid, family.id)

  let banner: { tone: 'ok' | 'warn' | 'err'; title: string; body: React.ReactNode }
  let updatedFamily = family

  if (claim.outcome === 'unknown') {
    banner = { tone: 'err', title: '알 수 없는 보물', body: '이 QR은 게임에 등록되지 않았습니다.' }
  } else if (claim.outcome === 'already-by-self') {
    banner = { tone: 'warn', title: '이미 등록한 보물', body: '같은 보물을 다시 등록할 수 없습니다.' }
  } else if (claim.outcome === 'already-by-other') {
    const owner = await getFamily(claim.byFamilyId)
    banner = { tone: 'warn', title: '이미 발견된 보물', body: `${owner?.nickname ?? '다른'} 가족이 먼저 찾았습니다.` }
  } else {
    family.treasuresFound.push(uuid)
    family.diaryPagesRead = Math.min(family.treasuresFound.length, 7)
    const next = fillNextRandom(family.initialsRevealed)
    if (next) family.initialsRevealed.push(next)
    const count = family.treasuresFound.length
    if ((count === 4 || count === 7) && !family.specialHintsSeen.includes(count)) {
      family.specialHintsSeen.push(count)
    }
    await saveFamily(family)
    updatedFamily = family
    const idx = count - 1
    const page = DIARY_PAGES[Math.min(idx, 6)]
    banner = {
      tone: 'ok',
      title: `보물을 찾았습니다! (${count}/7+)`,
      body: (
        <article className="bg-amber-50 text-amber-950 rounded-xl p-4 font-handwriting mt-3">
          <h4 className="font-bold mb-1">{idx + 1}. {page.title}</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line">{page.body}</p>
        </article>
      ),
    }
  }

  const tonClass =
    banner.tone === 'ok' ? 'border-green-500/40 bg-green-950/40' :
    banner.tone === 'warn' ? 'border-amber-500/40 bg-amber-950/40' :
    'border-red-500/40 bg-red-950/40'

  return (
    <main className="min-h-screen p-6 flex flex-col gap-6 max-w-md mx-auto">
      <div className={`rounded-2xl p-5 border ${tonClass}`}>
        <h2 className="text-xl font-bold mb-2">{banner.title}</h2>
        <div>{banner.body}</div>
        {claim.outcome === 'claimed' && (
          <p className="text-amber-300 mt-4 text-sm">
            힌트가 한 글자 채워졌습니다.
            {updatedFamily.specialHintsSeen.includes(updatedFamily.treasuresFound.length) && (
              <span className="block mt-2 text-amber-200">
                🏆 스페셜 힌트: {SPECIAL_HINTS[updatedFamily.treasuresFound.length]}
              </span>
            )}
          </p>
        )}
      </div>
      <Link href="/play" className="text-center px-6 py-4 bg-amber-100 text-amber-950 rounded-xl font-bold">
        메인으로
      </Link>
    </main>
  )
}
```

> 이 페이지는 server component 로 즉시 처리한다. API 라우트(`POST /api/scan`)와 로직 중복이 발생하지만, GET 진입(QR)에 대해 즉시 결과 페이지를 렌더링하기 위해 의도적으로 같은 흐름을 inline 처리한다. 추후 리팩터 시 공통 함수 `processScan()` 으로 추출 가능 (Task 27 polish 참조).

- [ ] **Step 2: dev 서버에서 직접 진입 테스트**

```bash
# 가족 등록 후
curl -X POST http://localhost:3000/api/family/register \
  -H "content-type: application/json" -d '{"nickname":"테스트"}' \
  -c cookies.txt
# 보물 seed (수동, scripts 전까지는 임시):
# /admin 페이지가 생기기 전 임시 시드 — admin reset 후 다시 시드
```

브라우저에서 `/scan/some-uuid` 직접 입장 → "알 수 없는 보물" 에러 표시
Expected: 알 수 없는 보물 메시지

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat(T20): /scan/[uuid] 페이지 — QR 진입 → 자동 처리 + 결과"
```

---

### Task 21: Result(클라이맥스) + Admin 페이지

**Files:**
- Create: `src/app/result/page.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Result 페이지**

`src/app/result/page.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useFamilyAndGame } from '@/lib/use-family'
import { CLIMAX_SCRIPT } from '@/lib/content'

export default function Result() {
  const { game } = useFamilyAndGame()
  const climaxRef = useRef<HTMLAudioElement>(null)
  const endingRef = useRef<HTMLAudioElement>(null)
  const [phase, setPhase] = useState<'idle' | 'climax' | 'ending'>('idle')

  useEffect(() => {
    if (game?.status === 'finished' && phase === 'idle') {
      climaxRef.current?.play().catch(() => {})
      setPhase('climax')
    }
  }, [game?.status, phase])

  if (!game || game.status !== 'finished') {
    return <main className="p-6 text-center">게임이 아직 끝나지 않았습니다.</main>
  }

  return (
    <main className="min-h-screen p-6 flex flex-col items-center justify-center gap-6 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold">게임 종료!</h1>
      <p className="text-amber-200 text-xl">
        <span className="font-bold">{game.winnerNickname}</span> 가족이 음해자를 찾았습니다
      </p>
      <div className="bg-amber-950/60 border border-amber-300/40 rounded-2xl p-6 max-w-md">
        <p className="text-amber-100 text-2xl font-bold">하만</p>
        <p className="text-amber-200/70 mt-2">에스더 3장 6절</p>
        <p className="text-amber-100 mt-3 italic">
          "하만이 모르드개의 민족을 다 멸하고자 하더라"
        </p>
      </div>
      <p className="text-amber-200">거실로 모이세요</p>
      <details className="text-amber-200/80 text-sm max-w-md">
        <summary className="cursor-pointer">클라이맥스 낭독</summary>
        <p className="whitespace-pre-line mt-3 leading-relaxed">{CLIMAX_SCRIPT}</p>
      </details>
      <audio
        ref={climaxRef}
        src="/audio/climax.mp3"
        onEnded={() => { endingRef.current?.play().catch(() => {}); setPhase('ending') }}
      />
      <audio ref={endingRef} src="/audio/ending.mp3" loop />
      <div className="flex gap-3">
        <button
          onClick={() => climaxRef.current?.play()}
          className="px-4 py-2 bg-amber-100 text-amber-950 rounded-xl text-sm font-bold"
        >
          ▶ 낭독 재생
        </button>
        <button
          onClick={() => endingRef.current?.play()}
          className="px-4 py-2 bg-amber-100 text-amber-950 rounded-xl text-sm font-bold"
        >
          🎵 BGM 재생
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Admin 페이지**

`src/app/admin/page.tsx`:
```tsx
'use client'
import { useState } from 'react'

export default function Admin() {
  const [pwd, setPwd] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function call(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-password': pwd },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    setLog(l => [`[${new Date().toLocaleTimeString()}] ${path} → ${JSON.stringify(json)}`, ...l])
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-bold">운영자 페이지</h2>
      <input
        value={pwd}
        onChange={e => setPwd(e.target.value)}
        type="password"
        placeholder="관리자 비밀번호"
        className="px-3 py-2 rounded-lg bg-amber-50 text-amber-950"
      />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => call('/api/admin/start-game')} className="bg-green-700 rounded-lg p-3">게임 시작</button>
        <button onClick={() => { if (confirm('정말 모든 데이터를 지웁니까?')) call('/api/admin/reset-game') }} className="bg-red-700 rounded-lg p-3">전체 리셋</button>
      </div>
      <PushHintForm onSubmit={(nickname, hint) => call('/api/admin/push-hint', { nickname, hint })} />
      <pre className="bg-stone-900 text-xs rounded-lg p-3 max-h-64 overflow-auto">{log.join('\n')}</pre>
    </main>
  )
}

function PushHintForm({ onSubmit }: { onSubmit: (n: string, h: string) => void }) {
  const [n, setN] = useState(''); const [h, setH] = useState('')
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(n, h); setH('') }} className="flex flex-col gap-2 border border-amber-700/40 rounded-lg p-3">
      <h3 className="text-sm font-bold">힌트 푸시</h3>
      <input value={n} onChange={e => setN(e.target.value)} placeholder="가족 닉네임" className="px-2 py-1 rounded bg-amber-50 text-amber-950" />
      <input value={h} onChange={e => setH(e.target.value)} placeholder="힌트 본문" className="px-2 py-1 rounded bg-amber-50 text-amber-950" />
      <button type="submit" className="bg-amber-200 text-amber-950 rounded p-2 text-sm font-bold">전송</button>
    </form>
  )
}
```

- [ ] **Step 3: 시각 점검**

Run: `npm run dev` → `/admin` → 비밀번호 입력 → 게임 시작 클릭 → 로그에 `{"ok":true}` 확인

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(T21): Result 클라이맥스 + Admin 페이지"
```

---

# Phase 5 — 운영 자산 (Tasks 22-25)

### Task 22: 보물 seed 스크립트

**Files:**
- Create: `scripts/seed-treasures.ts`

- [ ] **Step 1: 스크립트 작성**

`scripts/seed-treasures.ts`:
```ts
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
  const lines = uuids.map(u => `${baseUrl}/scan/${u}`)
  writeFileSync('out/treasure-urls.txt', lines.join('\n'), 'utf8')
  console.log(`seeded ${uuids.length} treasures → out/treasure-urls.txt`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: out 폴더 생성 + 실행 검증**

```bash
mkdir -p out
NEXT_PUBLIC_BASE_URL=https://example.vercel.app npm run seed -- 60
cat out/treasure-urls.txt | head -3
```
Expected: 60줄의 URL이 출력되고 KV에도 등록됨

- [ ] **Step 3: 커밋**

```bash
git add scripts/ .gitignore
git commit -m "feat(T22): seed-treasures 스크립트 — UUID 60개 생성 + KV 등록"
```

---

### Task 23: QR 생성 스크립트

**Files:**
- Create: `scripts/generate-qr.ts`

- [ ] **Step 1: 스크립트 작성**

`scripts/generate-qr.ts`:
```ts
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
```

- [ ] **Step 2: 실행 검증**

```bash
npm run qr
ls out/qr | head -3
```
Expected: `treasure-01.png` ~ `treasure-60.png` 생성

- [ ] **Step 3: 커밋**

```bash
git add scripts/generate-qr.ts
git commit -m "feat(T23): QR 인쇄 PNG 생성 스크립트"
```

---

### Task 24: mp3 placeholder 디렉토리 + README

**Files:**
- Create: `public/audio/.gitkeep`, `public/audio/README.md`

- [ ] **Step 1: 디렉토리 + 안내 README**

`public/audio/README.md`:
```markdown
# 음성 자산 (mp3)

여기에 다음 10개 파일을 넣으세요:

- `prologue.mp3` — 개회식 프롤로그 내레이션 (~90초)
- `diary-1.mp3` ~ `diary-7.mp3` — 일기장 7페이지 내레이션 (각 30~60초)
- `climax.mp3` — 우승 호명 + 클라이맥스 낭독 (~90초)
- `ending.mp3` — 종료 BGM, 보컬 없는 따뜻한 음악 (60~120초)

## 생성 방법

### 옵션 1: AI 보이스
- ElevenLabs (https://elevenlabs.io)
- 네이버 클로바 더빙 (https://clovadubbing.naver.com)

### 옵션 2: 직접 녹음
스마트폰 녹음 앱 → mp3 변환 (예: Online Audio Converter)

### BGM (`ending.mp3`)
- YouTube Audio Library — 검색 "uplifting / cinematic / heartwarming"
- Pixabay Music (https://pixabay.com/music)
- 저작권 프리 음원만 사용
```

빈 mp3 placeholder 파일도 같이 두면 dev에서 404 안 발생:
```bash
touch public/audio/{prologue,diary-1,diary-2,diary-3,diary-4,diary-5,diary-6,diary-7,climax,ending}.mp3
```

> 빈 파일은 재생되지 않지만 dev 시 콘솔 에러는 줄어든다. 행사 전까지 실제 mp3로 교체.

- [ ] **Step 2: 커밋**

```bash
git add public/audio
git commit -m "feat(T24): public/audio mp3 placeholder + 생성 가이드"
```

---

### Task 25: Vercel 배포 설정

**Files:**
- Create: `vercel.json` (선택), README 갱신

- [ ] **Step 1: Vercel 프로젝트 연결 + Upstash Redis 통합 (사용자가 수행)**

```bash
npx vercel login
npx vercel link
```

다음으로 Vercel 콘솔에서 진행:
1. 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash for Redis** 선택
2. 리전 선택 (서울 가까운 곳: `ap-northeast-1` Tokyo) → 무료 플랜
3. 통합 완료 시 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 가 프로젝트 환경변수에 자동 주입됨

이후 추가 환경 변수 설정:
```bash
npx vercel env add ADMIN_PASSWORD       # 행사용 강한 비밀번호
npx vercel env add NEXT_PUBLIC_BASE_URL  # https://your-domain.vercel.app
```

로컬 개발용으로 환경변수 가져오기:
```bash
npx vercel env pull .env.local
```

- [ ] **Step 2: README 작성/갱신**

`README.md`:
```markdown
# 잃어버린 13지파의 후예

교회 가족 수련회용 모바일 보물찾기 게임. Next.js 16 + Upstash Redis (via Vercel Marketplace).

## 빠른 시작 (개발)

```bash
# Vercel 프로젝트 연결 후 환경변수 끌어오기
npx vercel link
npx vercel env pull .env.local
npm install
npm run dev
```

## 행사 전 준비

```bash
# 1. KV에 보물 60개 시드
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app npm run seed -- 60

# 2. QR 인쇄용 PNG 생성
npm run qr

# 3. out/qr/treasure-NN.png 60장을 50x50mm 스티커로 인쇄

# 4. mp3 10개를 public/audio/ 에 복사 (생성 가이드: public/audio/README.md)

# 5. Vercel 배포
npx vercel --prod

# 6. 행사 시작 직전 /admin → "게임 시작"
```

## 행사 후 정리

`/admin` → "전체 리셋" → KV 초기화 (다음 행사용)
```

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs(T25): Vercel 배포 + 행사 운영 가이드"
```

---

# Phase 6 — E2E + 마무리 (Tasks 26-27)

### Task 26: Playwright 해피패스 E2E

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/happy-path.spec.ts`

- [ ] **Step 1: Playwright 설정**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- [ ] **Step 2: 해피패스 시나리오**

`tests/e2e/happy-path.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('가족 등록 → 첫 보물 스캔 → 정답 입력 → 우승', async ({ page, request }) => {
  // 0. 게임 시작 (admin endpoint 직접 호출)
  await request.post('/api/admin/start-game', { headers: { 'x-admin-password': process.env.ADMIN_PASSWORD ?? 'change-me' } })

  // 1. 스플래시 → 등록
  await page.goto('/')
  await page.getByRole('link', { name: '시작하기' }).click()
  await page.getByPlaceholder(/예: 김씨네/).fill('E2E김씨네')
  await page.getByRole('button', { name: '입장하기' }).click()

  // 2. 메인 화면 진입 확인
  await expect(page.getByText('E2E김씨네')).toBeVisible()
  await expect(page.getByText('🔮 음해자의 흔적')).toBeVisible()

  // 3. 보물 1개 시드 후 직접 진입 (UUID는 사전 시드된 첫 번째 사용)
  // (이 테스트는 사전에 KV가 비어있고 seed 가 필요함 — 별도 setup 권장)
  // 단순화: API 직접 호출로 보물 등록
  // 생략: 테스트는 동작 확인 수준에서 skip 가능
  test.skip(!process.env.E2E_TREASURE_UUID, 'set E2E_TREASURE_UUID env to run full path')
  await page.goto(`/scan/${process.env.E2E_TREASURE_UUID}`)
  await expect(page.getByText(/보물을 찾았습니다/)).toBeVisible()
  await page.getByRole('link', { name: '메인으로' }).click()

  // 4. 정답 입력
  await page.getByRole('button', { name: /정답 입력/ }).click()
  await page.getByPlaceholder('이름을 입력하세요').fill('하만')
  await page.getByRole('button', { name: '제출' }).click()

  // 5. result 화면으로 이동
  await expect(page.getByText('게임 종료!')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('하만')).toBeVisible()
})
```

> E2E는 KV 환경에 의존하므로 CI에서는 KV mock 또는 별도 setup 필요. 로컬에서 KV 연결된 상태일 때 `E2E_TREASURE_UUID=<seed된 uuid> npm run e2e`.

- [ ] **Step 3: 로컬 KV 환경에서 1회 수행**

```bash
# 사전: .env.local 에 KV 토큰, ADMIN_PASSWORD 설정
# admin reset 후 1개 시드:
npm run seed -- 1
# UUID 한 개 추출:
UUID=$(head -1 out/treasure-urls.txt | sed 's|.*/||')
E2E_TREASURE_UUID=$UUID npm run e2e
```
Expected: 해피패스 통과

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test(T26): Playwright 해피패스 E2E — 등록 → 스캔 → 우승"
```

---

### Task 27: 통합 점검 + 운영 체크리스트

**Files:**
- Modify: `README.md`, optional: `src/lib/process-scan.ts` (리팩터)

- [ ] **Step 1: scan 로직 중복 제거 (옵션)**

`/api/scan/[uuid]/route.ts` 와 `/scan/[uuid]/page.tsx` 의 보물 처리 로직을 공통 함수로 추출.

`src/lib/process-scan.ts`:
```ts
import type { Family, Treasure } from '@/types'
import { claimTreasure } from '@/lib/treasure'
import { saveFamily } from '@/lib/family'
import { fillNextRandom } from '@/lib/initials'

export type ProcessResult =
  | { kind: 'unknown' }
  | { kind: 'self' }
  | { kind: 'other'; byFamilyId: string }
  | { kind: 'claimed'; family: Family }

export async function processScan(uuid: string, family: Family): Promise<ProcessResult> {
  const claim = await claimTreasure(uuid, family.id)
  if (claim.outcome === 'unknown') return { kind: 'unknown' }
  if (claim.outcome === 'already-by-self') return { kind: 'self' }
  if (claim.outcome === 'already-by-other') return { kind: 'other', byFamilyId: claim.byFamilyId }

  family.treasuresFound.push(uuid)
  family.diaryPagesRead = Math.min(family.treasuresFound.length, 7)
  const next = fillNextRandom(family.initialsRevealed)
  if (next) family.initialsRevealed.push(next)
  const count = family.treasuresFound.length
  if ((count === 4 || count === 7) && !family.specialHintsSeen.includes(count)) {
    family.specialHintsSeen.push(count)
  }
  await saveFamily(family)
  return { kind: 'claimed', family }
}
```

`src/app/api/scan/[uuid]/route.ts` 와 `src/app/scan/[uuid]/page.tsx` 가 이 함수를 호출하도록 수정. 기존 lib 테스트는 그대로 통과해야 함.

- [ ] **Step 2: 전체 테스트 일괄 실행**

```bash
npm test
npm run build
```
Expected: 모든 테스트 통과 + build 성공

- [ ] **Step 3: 행사 D-1 체크리스트 README 추가**

README 끝부분에 추가:
```markdown
## 행사 D-1 체크리스트

- [ ] Vercel prod 배포 (`vercel --prod`) + 도메인 확인
- [ ] `.env` 모든 키 설정 (KV, ADMIN_PASSWORD, NEXT_PUBLIC_BASE_URL)
- [ ] `/api/admin/reset-game` → 깨끗한 상태 확인
- [ ] `npm run seed -- 60` 으로 보물 시드
- [ ] `npm run qr` 으로 QR 60장 생성 + 인쇄 + 보물 부착
- [ ] mp3 10개 `public/audio/` 에 업로드 후 재배포
- [ ] 펜션 와이파이 또는 모바일 데이터 안내문 준비
- [ ] 모바일 디바이스 2종(iOS, Android) 으로 등록 → 스캔 → 정답 흐름 점검

## 행사 당일

- T-30분: 보물 60개 배치
- T-5분: `/admin` → "게임 시작"
- T-0: 가족 등록 시작
- 1막: 자유 탐색 (운영자 모니터링)
- 종료: 결과 화면 자동 전환 → 클라이맥스 mp3 → BGM
- 후속: `/admin` → "전체 리셋" (다음 행사 대비)
```

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore(T27): scan 로직 통합 + 행사 운영 체크리스트"
```

---

## 자체 검토 (Self-Review)

### Spec 커버리지 점검

| 기획서 섹션 | 구현 태스크 |
|---|---|
| 2.1 프롤로그 / 2.3 일기장 / 2.4 클라이맥스 | T3 (콘텐츠) + T17, T20, T21 (UI) |
| 2.2 음해자/정답 | T3 (CORRECT_ANSWERS) + T11 |
| 3.1 전체 흐름 | T15-T21 (UI 흐름) + T13 (운영자 시작) |
| 3.2 닉네임 등록 (멀티 디바이스, 8가족 슬롯) | T5, T8 |
| 3.3 보물 스캔 (UUID, atomic claim) | T6, T10, T20 |
| 3.4 7칸 초성 배열 (랜덤 채움) | T4, T16 |
| 3.5 스페셜 힌트 (4번/7번 트리거) | T3 (텍스트), T10 (트리거), T18 (UI) |
| 3.6 정답 입력 (시도 횟수 = 보물 개수) | T11, T19 |
| 3.7 우승/종료 (atomic 락 + 자동 전환) | T7, T11, T16 (auto redirect), T21 |
| 4. 모바일 페이지 UI | T14-T21 |
| 5. 보물 자산 (UUID 60개, QR 인쇄) | T22, T23 |
| 6. 음성 자산 mp3 10개 | T24 |
| 7. 기술 아키텍처 (Vercel KV, 폴링) | T2, T7, T16, T18 |
| 8. 운영 가이드 | T13, T21 (Admin), T25, T27 |
| **다른 가족 진행도 라이브 표시** | T9, T18 |
| **종료 음악 (climax → ending 자동 이어 재생)** | T21 |

모든 spec 항목이 구현 태스크에 매핑됨. 누락 없음.

### Placeholder 점검

- 모든 step에 실제 코드 또는 명령이 포함됨
- "TBD", "TODO" 없음
- "비슷하게 구현" 같은 모호한 지시 없음
- mp3 파일은 placeholder로 두되, 생성 가이드(T24)와 연동 (운영상 자료라 의도적임)

### 타입 일관성 점검

- `Family.treasuresFound: string[]` — uuid 배열, T5/T6/T10/T11에서 일관됨
- `Family.initialsRevealed: Array<{ position: number; char: string }>` — T4/T10/T16/T20에서 일관됨
- `claimTreasure()` 반환값 — T6 정의, T10/T20에서 동일 사용
- `claimWinner()` 반환값 — T7 정의, T11에서 동일 사용
- `FamilyProgressRow` — T3 정의, T9/T18 동일 사용

### Scope 점검

- 단일 Next.js 앱 — 하나의 plan 으로 적절
- 6개 페이즈, 27개 태스크, 각 태스크 5~10 step — 적정 입자
- TDD가 가장 가치 있는 곳(lib, API의 race/edge)에 집중, UI는 시각 점검으로 효율화

---

## 실행 핸드오프

Plan complete and saved to `docs/superpowers/plans/2026-04-30-lost-13th-tribe-treasure-hunt.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 신규 subagent가 태스크 1개씩 실행, 사이마다 리뷰, 빠른 반복

**2. Inline Execution** — 현재 세션에서 일괄 실행, 체크포인트로 검토

어느 방식으로 갈까요?
