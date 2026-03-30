import { call } from '@decky/api'
import localforage from 'localforage'

export interface GameCache {
  videoId?: string
  volume?: number
  title?: string
  thumbnail?: string
}

localforage.config({ name: 'game-theme-music-cache' })

export async function getCache(appId: number): Promise<GameCache | null> {
  return localforage.getItem<GameCache>(`app_${appId}`)
}

export async function updateCache(appId: number, data: Partial<GameCache>): Promise<void> {
  const existing = (await localforage.getItem<GameCache>(`app_${appId}`)) ?? {}
  await localforage.setItem(`app_${appId}`, { ...existing, ...data })
}

export async function removeCache(appId: number): Promise<void> {
  await localforage.removeItem(`app_${appId}`)
}

export async function getFullCache(): Promise<Record<number, GameCache>> {
  const result: Record<number, GameCache> = {}
  await localforage.iterate<GameCache, void>((value, key) => {
    const appId = parseInt(key.replace('app_', ''), 10)
    result[appId] = value
  })
  return result
}

export async function exportCache(): Promise<void> {
  const cache = await getFullCache()
  await call<[Record<number, GameCache>]>('export_cache', cache)
}

export async function listCacheBackups(): Promise<string[]> {
  return call<[], string[]>('list_cache_backups')
}

export async function importCache(name: string): Promise<void> {
  const imported = await call<[string], Record<string, GameCache>>('import_cache', name)
  await localforage.clear()
  for (const [key, value] of Object.entries(imported)) {
    await localforage.setItem(`app_${key}`, value)
  }
}

export async function clearCache(): Promise<void> {
  await localforage.clear()
  await call('clear_cache')
}

export async function clearDownloads(): Promise<void> {
  await call('clear_downloads')
}
