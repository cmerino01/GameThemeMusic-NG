import { useEffect, useMemo, useState } from 'react'
import { useAudioLoaderCompatState } from '../state/AudioLoaderCompatState'

interface AudioPlayerControls {
  play(): void
  pause(): void
  stop(): void
  setVolume(volume: number): void
  togglePlay(): void
  isPlaying: boolean
  isReady: boolean
}

function useAudioPlayer(audioUrl: string | undefined): AudioPlayerControls {
  const { setOnThemePage } = useAudioLoaderCompatState()

  const audioPlayer = useMemo(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true
    return audio
  }, [])

  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Load new URL whenever it changes
  useEffect(() => {
    if (audioUrl?.length) {
      setIsReady(false)
      audioPlayer.src = audioUrl
      audioPlayer.load()
    }
  }, [audioUrl, audioPlayer])

  // Signal that we are on the theme page once audio is ready
  useEffect(() => {
    audioPlayer.oncanplaythrough = () => {
      setIsReady(true)
      setOnThemePage(true)
    }
    return () => { audioPlayer.oncanplaythrough = null }
  }, [audioPlayer, setOnThemePage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      audioPlayer.src = ''
      setOnThemePage(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlayer])

  function play() {
    if (!isReady) return
    audioPlayer.play().catch((err) => {
      console.error('[GTM] play() error:', err)
    })
    setIsPlaying(true)
    setOnThemePage(true)
  }

  function pause() {
    if (!audioPlayer.paused) {
      audioPlayer.pause()
      setIsPlaying(false)
    }
  }

  function stop() {
    if (!audioPlayer.paused || audioPlayer.currentTime > 0) {
      audioPlayer.pause()
      audioPlayer.currentTime = 0
      setIsPlaying(false)
    }
  }

  function setVolume(volume: number) {
    audioPlayer.volume = Math.max(0, Math.min(1, volume))
  }

  function togglePlay() {
    if (isPlaying) stop()
    else play()
  }

  return { play, pause, stop, setVolume, togglePlay, isPlaying, isReady }
}

export default useAudioPlayer
