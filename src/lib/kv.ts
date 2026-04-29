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

export async function del(key: string): Promise<void> {
  await redis.del(key)
}

export async function listKeys(pattern: string): Promise<string[]> {
  return (await redis.keys(pattern)) as string[]
}
