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
