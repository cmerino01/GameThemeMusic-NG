import { useEffect, useRef, useState } from 'react'
import { resolver, AudioResolver } from '../actions/audio'
import { getCache, updateCache } from '../cache/musicCache'
import { useSettings } from './useSettings'

interface ThemeMusicResult {
  audioUrl: string | undefined
  videoId: string | undefined
  isLoading: boolean
  error: string | undefined
  resolver: AudioResolver
}

function useThemeMusic(appId: number, appName: string): ThemeMusicResult {
  const [, , settingsLoaded] = useSettings()

  const [audioUrl, setAudioUrl] = useState<string | undefined>()
  const [videoId, setVideoId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  // Prevent stale async updates after unmount or appId change
  const isMounted = useRef(true)

  useEffect(() => {
    if (!settingsLoaded) return

    isMounted.current = true
    setAudioUrl(undefined)
    setVideoId(undefined)
    setIsLoading(true)
    setError(undefined)

    let cancelled = false

    async function load() {
      try {
        const cached = await getCache(appId)

        if (cached?.videoId) {
          // Known video — just fetch a fresh playable URL
          const url = await resolver.getAudioUrlFromVideo({ id: cached.videoId })
          if (!cancelled && isMounted.current) {
            if (url) {
              setAudioUrl(url)
              setVideoId(cached.videoId)
            } else {
              setError('Could not load cached theme — try searching for a new one.')
            }
          }
        } else {
          // Auto-search
          const result = await resolver.getAudio(appName)
          if (!cancelled && isMounted.current) {
            if (result) {
              setAudioUrl(result.audioUrl)
              setVideoId(result.videoId)
              await updateCache(appId, { videoId: result.videoId })
            } else {
              setError('No theme music found.')
            }
          }
        }
      } catch (err) {
        if (!cancelled && isMounted.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled && isMounted.current) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      isMounted.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, appName, settingsLoaded])

  return { audioUrl, videoId, isLoading, error, resolver }
}

export default useThemeMusic
