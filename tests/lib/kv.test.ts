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
