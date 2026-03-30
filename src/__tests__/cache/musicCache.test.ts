import { describe, it, expect, vi, beforeEach } from 'vitest'
import localforage from 'localforage'
import { getCache, updateCache, removeCache, getFullCache } from '../../cache/musicCache'

// Access the internal store for test setup
const store = (localforage as any)._store as Map<string, any>

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

describe('musicCache', () => {
  describe('getCache', () => {
    it('returns null for unknown appId', async () => {
      const result = await getCache(12345)
      expect(result).toBeNull()
    })

    it('returns cached data for known appId', async () => {
      const data = { videoId: 'abc', volume: 0.8, title: 'Theme', thumbnail: 'http://img.jpg' }
      store.set('app_999', data)
      const result = await getCache(999)
      expect(result).toEqual(data)
    })
  })

  describe('updateCache', () => {
    it('creates new cache entry', async () => {
      await updateCache(100, { videoId: 'xyz' })
      expect(localforage.setItem).toHaveBeenCalledWith('app_100', { videoId: 'xyz' })
    })

    it('merges with existing data', async () => {
      store.set('app_200', { videoId: 'old', volume: 0.5 })
      await updateCache(200, { volume: 0.9 })
      expect(localforage.setItem).toHaveBeenCalledWith('app_200', { videoId: 'old', volume: 0.9 })
    })
  })

  describe('removeCache', () => {
    it('removes entry for appId', async () => {
      store.set('app_300', { videoId: 'del' })
      await removeCache(300)
      expect(localforage.removeItem).toHaveBeenCalledWith('app_300')
    })
  })

  describe('getFullCache', () => {
    it('returns all entries keyed by appId', async () => {
      store.set('app_1', { videoId: 'a' })
      store.set('app_2', { videoId: 'b' })
      const result = await getFullCache()
      expect(result).toEqual({
        1: { videoId: 'a' },
        2: { videoId: 'b' },
      })
    })

    it('returns empty object when no entries', async () => {
      const result = await getFullCache()
      expect(result).toEqual({})
    })
  })
})
