import { Button, Focusable } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import { FaCheck, FaDownload, FaPlay, FaStop } from 'react-icons/fa'
import { call } from '@decky/api'
import { AudioResolver } from '../../actions/audio'
import { YouTubeVideoPreview } from '../../../types/YouTube'
import { updateCache } from '../../cache/musicCache'
import useAudioPlayer from '../../hooks/useAudioPlayer'

interface Props {
  appId: number
  video: YouTubeVideoPreview
  isSelected: boolean
  showDownload: boolean
  resolver: AudioResolver
  isActivePlayer: boolean
  onPlay(videoId: string): void
  onSelect(video: YouTubeVideoPreview): void
}

function AudioPlayerCard({ appId, video, isSelected, showDownload, resolver, isActivePlayer, onPlay, onSelect }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | undefined>()
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const playOnReady = useRef(false)

  // Restore downloaded state on mount
  useEffect(() => {
    call<[string], boolean>('is_downloaded', video.id).then(setDownloaded).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id])

  const { play, stop, isPlaying, isReady } = useAudioPlayer(audioUrl)

  // Play as soon as the audio becomes ready after a URL load
  useEffect(() => {
    if (isReady && playOnReady.current) {
      playOnReady.current = false
      play()
    }
  }, [isReady, play])

  // Stop when another card starts playing
  useEffect(() => {
    if (!isActivePlayer && isPlaying) stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivePlayer])

  async function loadAndPlay() {
    if (isPlaying) {
      stop()
      return
    }
    onPlay(video.id)
    if (audioUrl) {
      play()
      return
    }
    setIsLoadingUrl(true)
    try {
      const url = await resolver.getAudioUrlFromVideo(video)
      if (url) {
        playOnReady.current = true
        setAudioUrl(url)
      }
    } finally {
      setIsLoadingUrl(false)
    }
  }

  async function handleSelect() {
    stop()
    await updateCache(appId, { videoId: video.id, title: video.title, thumbnail: video.thumbnail })
    onSelect(video)
  }

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const success = await resolver.downloadAudio(video)
      if (success) setDownloaded(true)
    } finally {
      setIsDownloading(false)
    }
  }

  // Auto-play once URL resolves
  // (isReady handled inside useAudioPlayer)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
          />
        )}
        <span style={{ flex: 1, fontSize: '13px', lineHeight: '1.3' }}>{video.title}</span>
      </div>

      <Focusable flow-children="row" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Button
          onClick={loadAndPlay}
          disabled={isLoadingUrl}
        >
          {isPlaying ? <FaStop /> : <FaPlay />}
          {isLoadingUrl ? ' Loading…' : isPlaying ? ' Stop' : ' Preview'}
        </Button>

        <Button onClick={handleSelect}>
          {isSelected ? <FaCheck /> : null}
          {isSelected ? ' Selected' : ' Select'}
        </Button>

        {showDownload && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading || downloaded}
          >
            {downloaded ? <FaCheck /> : <FaDownload />}
            {isDownloading ? ' Downloading…' : downloaded ? ' Downloaded' : ' Download'}
          </Button>
        )}
      </Focusable>
    </div>
  )
}

export default AudioPlayerCard
