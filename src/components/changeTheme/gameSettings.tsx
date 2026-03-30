import { ButtonItem, PanelSection, PanelSectionRow, SliderField } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import { FaMusic, FaPlay, FaSpinner, FaStop } from 'react-icons/fa'
import { getCache, removeCache, updateCache } from '../../cache/musicCache'
import useAudioPlayer from '../../hooks/useAudioPlayer'
import { useSettings } from '../../hooks/useSettings'
import { call } from '@decky/api'
import { YouTubeVideoPreview } from '../../../types/YouTube'

interface Props {
  appId: number
  appName: string
  video: YouTubeVideoPreview | undefined
  onReset(): void
}

function GameSettings({ appId, appName: _appName, video, onReset }: Props) {
  const [settings] = useSettings()
  const videoId = video?.id

  const [audioUrl, setAudioUrl] = useState<string | undefined>()
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [volume, setVolumeState] = useState<number>(settings.volume * 100)
  const { play, stop, setVolume, isPlaying, isReady } = useAudioPlayer(audioUrl)
  const playOnReady = useRef(false)

  // True while fetching the URL or while audio is buffering after play was requested
  const isLoading = isLoadingUrl || (playOnReady.current && !isReady)

  // Mirror AudioPlayerCard: call play() from inside the effect where isReady is guaranteed true
  useEffect(() => {
    if (isReady && playOnReady.current) {
      playOnReady.current = false
      play()
    }
  }, [isReady, play])

  // Reset audio + revealed state when the selected video changes
  useEffect(() => {
    stop()
    setAudioUrl(undefined)
    setRevealed(false)
    playOnReady.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  async function handlePlay() {
    if (isPlaying) { stop(); return }
    setRevealed(true)
    // Always fetch a fresh URL via single_yt_url — never reuse search result URLs
    stop()
    setAudioUrl(undefined)
    playOnReady.current = false
    setIsLoadingUrl(true)
    try {
      const url = await call<[string], string | null>('single_yt_url', videoId!)
      if (url) {
        playOnReady.current = true
        setAudioUrl(url)
      }
    } finally {
      setIsLoadingUrl(false)
    }
  }

  // useAudioPlayer handles stop+cleanup on unmount internally

  // Load per-game volume from cache
  useEffect(() => {
    if (!appId) return
    getCache(appId).then((cached) => {
      const vol = cached?.volume ?? settings.volume
      setVolumeState(vol * 100)
      setVolume(vol)
    })
  }, [appId, settings.volume, setVolume])

  async function handleVolumeChange(val: number) {
    const vol = val / 100
    setVolumeState(val)
    setVolume(vol)
    await updateCache(appId, { volume: vol })
  }

  async function handleReset() {
    stop()
    await removeCache(appId)
    onReset()
  }

  return (
    <PanelSection title="Current Theme">
      <style>{`
        @keyframes gtm-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes gtm-eq {
          0%, 100% { transform: scaleY(0.4) }
          50%       { transform: scaleY(1) }
        }
      `}</style>

      {videoId ? (
        <>
          {/* ── Player card: placeholder until Play is hit, then thumbnail + title ── */}
          <PanelSectionRow>
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'center',
              background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
              padding: '10px', width: '100%',
            }}>
              {/* Thumbnail area */}
              {revealed ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={video?.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                    alt={video?.title ?? videoId}
                    style={{ width: 96, height: 54, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                  />
                  {isPlaying && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
                      justifyContent: 'center', gap: 2, padding: '6px',
                      background: 'rgba(0,0,0,0.45)', borderRadius: 6,
                    }}>
                      {[0, 0.2, 0.1, 0.3].map((delay, i) => (
                        <div key={i} style={{
                          width: 3, height: 14, background: '#1a9fff', borderRadius: 2, transformOrigin: 'bottom',
                          animation: `gtm-eq 0.7s ${delay}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  width: 96, height: 54, borderRadius: 6, background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FaMusic style={{ opacity: 0.4, fontSize: 22 }} />
                </div>
              )}

              {/* Title area */}
              {revealed ? (
                <span style={{ fontSize: '13px', lineHeight: 1.4, opacity: 0.9 }}>
                  {video?.title ?? videoId}
                </span>
              ) : (
                <span style={{ fontSize: '13px', opacity: 0.35 }}>Hit play to preview</span>
              )}
            </div>
          </PanelSectionRow>

          {/* ── Play / Stop ── */}
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handlePlay} disabled={isLoading}>
              {isLoading
                ? <><FaSpinner style={{ animation: 'gtm-spin 1s linear infinite' }} /> Loading…</>
                : isPlaying
                  ? <><FaStop /> Stop</>
                  : <><FaPlay /> Play</>
              }
            </ButtonItem>
          </PanelSectionRow>

          {/* ── Volume ── */}
          <PanelSectionRow>
            <SliderField
              label="Volume"
              value={volume}
              min={0}
              max={100}
              step={1}
              onChange={handleVolumeChange}
            />
          </PanelSectionRow>

          {/* ── Reset ── */}
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleReset}>
              Reset to Default
            </ButtonItem>
          </PanelSectionRow>
        </>
      ) : (
        <PanelSectionRow>
          <span style={{ fontSize: '13px', opacity: 0.7 }}>No theme selected yet.</span>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default GameSettings
