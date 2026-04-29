import { Redis } from '@upstash/redis'

// 환경변수 이름 호환:
// - 신규: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// - Vercel Marketplace 통합 시 legacy KV_REST_API_URL / KV_REST_API_TOKEN 도 주입됨
// 테스트 환경에서는 @upstash/redis 모듈 자체가 모킹되어 두 변수 모두 빌 수 있음
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? ''
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? ''
const redis = url && token
  ? new Redis({ url, token })
  : Redis.fromEnv()

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

export async function del(key: string): Promise<void> {
  await redis.del(key)
}

export async function listKeys(pattern: string): Promise<string[]> {
  return (await redis.keys(pattern)) as string[]
}
