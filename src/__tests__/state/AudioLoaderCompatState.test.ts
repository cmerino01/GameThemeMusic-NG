import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioLoaderCompatState } from '../../state/AudioLoaderCompatState'

beforeEach(() => {
  vi.useFakeTimers()
  // Set up window.AUDIOLOADER_MENUMUSIC mock
  ;(window as any).AUDIOLOADER_MENUMUSIC = {
    play: vi.fn(),
    pause: vi.fn(),
  }
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as any).AUDIOLOADER_MENUMUSIC
})

describe('AudioLoaderCompatState', () => {
  describe('getPublicState', () => {
    it('returns initial state', () => {
      const state = new AudioLoaderCompatState()
      expect(state.getPublicState()).toEqual({
        gamesRunning: [],
        onAppPage: false,
      })
    })
  })

  describe('setGamesRunning', () => {
    it('updates gamesRunning', () => {
      const state = new AudioLoaderCompatState()
      state.setGamesRunning([12345])
      vi.runAllTimers()
      expect(state.getPublicState().gamesRunning).toEqual([12345])
    })

    it('pauses AudioLoader when games start running', () => {
      const state = new AudioLoaderCompatState()
      state.setGamesRunning([100])
      vi.runAllTimers()
      expect((window as any).AUDIOLOADER_MENUMUSIC.pause).toHaveBeenCalled()
    })

    it('disables AudioLoader after delay when all games stop', () => {
      const state = new AudioLoaderCompatState()
      // Start a game
      state.setGamesRunning([100])
      vi.runAllTimers()

      vi.clearAllMocks()

      // Stop all games
      state.setGamesRunning([])
      // Before delay — AudioLoader should not be re-enabled yet as forceUpdate also delays
      expect((window as any).AUDIOLOADER_MENUMUSIC.play).not.toHaveBeenCalled()

      // After delay
      vi.advanceTimersByTime(1000)
      expect((window as any).AUDIOLOADER_MENUMUSIC.play).toHaveBeenCalled()
    })
  })

  describe('setOnThemePage', () => {
    it('pauses AudioLoader when on theme page', () => {
      const state = new AudioLoaderCompatState()
      state.setOnThemePage(true)
      vi.runAllTimers()
      expect((window as any).AUDIOLOADER_MENUMUSIC.pause).toHaveBeenCalled()
    })

    it('re-enables AudioLoader after delay when leaving theme page', () => {
      const state = new AudioLoaderCompatState()

      state.setOnThemePage(true)
      vi.runAllTimers()
      vi.clearAllMocks()

      state.setOnThemePage(false)
      vi.advanceTimersByTime(1000)
      expect((window as any).AUDIOLOADER_MENUMUSIC.play).toHaveBeenCalled()
    })

    it('does not re-enable AudioLoader if games are running', () => {
      const state = new AudioLoaderCompatState()

      state.setGamesRunning([100])
      state.setOnThemePage(true)
      vi.runAllTimers()
      vi.clearAllMocks()

      state.setOnThemePage(false)
      vi.advanceTimersByTime(1000)
      // Should pause, not play, because a game is running
      expect((window as any).AUDIOLOADER_MENUMUSIC.play).not.toHaveBeenCalled()
    })
  })

  describe('eventBus', () => {
    it('dispatches stateUpdate events on changes', () => {
      const state = new AudioLoaderCompatState()
      const handler = vi.fn()
      state.eventBus.addEventListener('stateUpdate', handler)

      state.setGamesRunning([1])
      vi.runAllTimers()
      expect(handler).toHaveBeenCalled()
    })
  })

  describe('graceful without AudioLoader', () => {
    it('does not throw when AUDIOLOADER_MENUMUSIC is absent', () => {
      delete (window as any).AUDIOLOADER_MENUMUSIC
      const state = new AudioLoaderCompatState()

      expect(() => {
        state.setOnThemePage(true)
        vi.runAllTimers()
        state.setOnThemePage(false)
        vi.runAllTimers()
      }).not.toThrow()
    })
  })
})
