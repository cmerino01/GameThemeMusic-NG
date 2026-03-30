import { useEffect } from 'react'
import { useParams } from '@decky/ui'
import useAudioPlayer from '../../hooks/useAudioPlayer'
import useThemeMusic from '../../hooks/useThemeMusic'
import { useSettings } from '../../hooks/useSettings'
import { getCache } from '../../cache/musicCache'

interface RouteParams {
  appid?: string
}

// Injected silently into the game library page — no visible UI.
// Finds, loads and auto-plays the theme for the current game.
function ThemePlayer() {
  const { appid } = useParams<RouteParams>()
  const appId = parseInt(appid ?? '0', 10)

  // Get the display name from the Steam app store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appName: string = (window as any).appStore?.GetAppOverviewByAppID?.(appId)?.display_name ?? ''

  const [settings] = useSettings()
  const { audioUrl } = useThemeMusic(appId, appName)
  const { play, stop, setVolume, isReady } = useAudioPlayer(audioUrl)

  // Apply volume from cache (per-game) or fall back to global setting
  useEffect(() => {
    if (!appId) return
    getCache(appId).then((cached) => {
      setVolume(cached?.volume ?? settings.volume)
    })
  }, [appId, settings.volume, setVolume])

  // Auto-play once ready (unless default muted)
  useEffect(() => {
    if (!isReady) return
    if (!settings.defaultMuted) {
      play()
    }
  // Only trigger on isReady transitions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  // Stop playback when navigating away from this game page
  useEffect(() => {
    return () => stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  // No visible UI — this component only manages audio
  return null
}

export default ThemePlayer
