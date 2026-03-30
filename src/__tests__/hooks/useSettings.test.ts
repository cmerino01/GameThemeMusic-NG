import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { call } from '@decky/api'
import React from 'react'

const mockCall = vi.mocked(call)

// Mock the AudioLoaderCompatState context
vi.mock('../../state/AudioLoaderCompatState', () => ({
  useAudioLoaderCompatState: () => ({
    gamesRunning: [],
    onAppPage: false,
    setGamesRunning: vi.fn(),
    setOnThemePage: vi.fn(),
  }),
}))

import { useSettings, defaultSettings } from '../../hooks/useSettings'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSettings', () => {
  it('returns default settings initially', async () => {
    mockCall.mockResolvedValueOnce(defaultSettings)
    const { result } = renderHook(() => useSettings())

    const [settings, , loaded] = result.current
    expect(settings).toEqual(defaultSettings)
    expect(loaded).toBe(false)

    // Let the async load effect settle to avoid act() warnings
    await waitFor(() => expect(result.current[2]).toBe(true))
  })

  it('loads saved settings from backend', async () => {
    const saved = { defaultMuted: true, downloadAudio: true, volume: 0.5 }
    mockCall.mockResolvedValueOnce(saved)

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current[2]).toBe(true) // loaded
    })

    expect(result.current[0]).toEqual(saved)
  })

  it('falls back to defaults on error', async () => {
    mockCall.mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current[2]).toBe(true)
    })

    expect(result.current[0]).toEqual(defaultSettings)
  })

  it('updateSettings merges and persists', async () => {
    mockCall.mockResolvedValueOnce(defaultSettings) // initial load

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current[2]).toBe(true)
    })

    mockCall.mockResolvedValueOnce(undefined) // set_setting call

    await act(async () => {
      await result.current[1]({ volume: 0.3 })
    })

    expect(result.current[0].volume).toBe(0.3)
    expect(result.current[0].defaultMuted).toBe(false) // unchanged
    expect(mockCall).toHaveBeenCalledWith(
      'set_setting',
      'settings',
      expect.objectContaining({ volume: 0.3 }),
    )
  })
})
