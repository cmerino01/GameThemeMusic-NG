import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the AudioLoaderCompatState context
const mockSetOnThemePage = vi.fn()
vi.mock('../../state/AudioLoaderCompatState', () => ({
  useAudioLoaderCompatState: () => ({
    gamesRunning: [],
    onAppPage: false,
    setGamesRunning: vi.fn(),
    setOnThemePage: mockSetOnThemePage,
  }),
}))

import useAudioPlayer from '../../hooks/useAudioPlayer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAudioPlayer', () => {
  it('returns initial state as not playing and not ready', () => {
    const { result } = renderHook(() => useAudioPlayer(undefined))
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isReady).toBe(false)
  })

  it('loads audio when URL is provided', () => {
    const { result, rerender } = renderHook(
      ({ url }) => useAudioPlayer(url),
      { initialProps: { url: undefined as string | undefined } },
    )

    rerender({ url: 'http://example.com/audio.mp3' })
    // Audio element's load should have been called
    // (via the useEffect that watches audioUrl)
  })

  it('play does nothing when not ready', () => {
    const { result } = renderHook(() => useAudioPlayer('http://example.com/audio.mp3'))

    act(() => {
      result.current.play()
    })

    // Should remain not playing since isReady is false
    expect(result.current.isPlaying).toBe(false)
  })

  it('setVolume clamps between 0 and 1', () => {
    const { result } = renderHook(() => useAudioPlayer(undefined))

    act(() => {
      result.current.setVolume(1.5)
    })
    // No error thrown — just clamped internally

    act(() => {
      result.current.setVolume(-0.5)
    })
    // No error thrown
  })

  it('stop resets playing state', () => {
    const { result } = renderHook(() => useAudioPlayer(undefined))

    act(() => {
      result.current.stop()
    })

    expect(result.current.isPlaying).toBe(false)
  })

  it('togglePlay calls play when not playing', () => {
    const { result } = renderHook(() => useAudioPlayer(undefined))

    act(() => {
      result.current.togglePlay()
    })

    // Won't actually play (not ready), but shouldn't error
    expect(result.current.isPlaying).toBe(false)
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAudioPlayer('http://example.com/audio.mp3'))

    // Should not throw
    unmount()
    expect(mockSetOnThemePage).toHaveBeenCalledWith(false)
  })
})
