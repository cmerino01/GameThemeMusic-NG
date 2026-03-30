import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { call } from '@decky/api'
import localforage from 'localforage'

const mockCall = vi.mocked(call)
const store = (localforage as any)._store as Map<string, any>

// Mock AudioLoaderCompatState
vi.mock('../../state/AudioLoaderCompatState', () => ({
  useAudioLoaderCompatState: () => ({
    gamesRunning: [],
    onAppPage: false,
    setGamesRunning: vi.fn(),
    setOnThemePage: vi.fn(),
  }),
}))

// Mock useSettings to return loaded immediately
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => [{ defaultMuted: false, downloadAudio: false, volume: 1 }, vi.fn(), true],
  defaultSettings: { defaultMuted: false, downloadAudio: false, volume: 1 },
}))

import useThemeMusic from '../../hooks/useThemeMusic'

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

describe('useThemeMusic', () => {
  it('fetches cached video URL when cache exists', async () => {
    store.set('app_123', { videoId: 'cached-vid', title: 'Theme', thumbnail: 'http://t.jpg' })

    // single_yt_url for the cached video
    mockCall.mockResolvedValueOnce('http://streaming.url')

    const { result } = renderHook(() => useThemeMusic(123, 'Test Game'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.audioUrl).toBe('http://streaming.url')
    expect(result.current.videoId).toBe('cached-vid')
    expect(result.current.error).toBeUndefined()
  })

  it('auto-searches when no cache exists', async () => {
    const video = { id: 'search-result', title: 'Game Theme', thumbnail: 'http://t.jpg' }

    mockCall
      .mockResolvedValueOnce(undefined)              // search_yt
      .mockResolvedValueOnce(video)                   // next_yt_result
      .mockResolvedValueOnce('http://found-audio.url') // single_yt_url
      // next_yt_result won't be called - we found a result

    const { result } = renderHook(() => useThemeMusic(456, 'New Game'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.audioUrl).toBe('http://found-audio.url')
    expect(result.current.videoId).toBe('search-result')
  })

  it('sets error when cached video URL fails', async () => {
    store.set('app_789', { videoId: 'broken-vid' })

    mockCall.mockResolvedValueOnce(null) // single_yt_url returns null

    const { result } = renderHook(() => useThemeMusic(789, 'Broken Game'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.audioUrl).toBeUndefined()
  })

  it('sets error when no search results found', async () => {
    mockCall
      .mockResolvedValueOnce(undefined) // search_yt
      .mockResolvedValueOnce(null)      // no results

    const { result } = renderHook(() => useThemeMusic(999, 'Unknown Game'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('No theme music found.')
  })

  it('starts in loading state', async () => {
    mockCall.mockResolvedValue(undefined)

    const { result } = renderHook(() => useThemeMusic(1, 'Loading Game'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.audioUrl).toBeUndefined()
    expect(result.current.videoId).toBeUndefined()

    // Let the async effect settle to avoid act() warnings
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })
})
