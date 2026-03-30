import { describe, it, expect, vi, beforeEach } from 'vitest'
import { call } from '@decky/api'

const mockCall = vi.mocked(call)

// Import after mocks are set up
import { resolver } from '../../actions/audio'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('YtDlpAudioResolver', () => {
  describe('getYouTubeSearchResults', () => {
    it('yields results from search_yt and next_yt_result', async () => {
      const video1 = { id: 'v1', title: 'Theme 1', thumbnail: 'http://t1.jpg' }
      const video2 = { id: 'v2', title: 'Theme 2', thumbnail: 'http://t2.jpg' }

      mockCall
        .mockResolvedValueOnce(undefined) // search_yt call
        .mockResolvedValueOnce(video1)    // first next_yt_result
        .mockResolvedValueOnce(video2)    // second next_yt_result
        .mockResolvedValueOnce(null)      // end of results

      const results = []
      for await (const r of resolver.getYouTubeSearchResults('Zelda Theme', 10)) {
        results.push(r)
      }

      expect(mockCall).toHaveBeenCalledWith('search_yt', 'Zelda Theme', 10)
      expect(results).toEqual([video1, video2])
    })

    it('handles empty results', async () => {
      mockCall
        .mockResolvedValueOnce(undefined) // search_yt
        .mockResolvedValueOnce(null)      // immediate end

      const results = []
      for await (const r of resolver.getYouTubeSearchResults('Nonexistent Game')) {
        results.push(r)
      }

      expect(results).toEqual([])
    })

    it('catches errors gracefully', async () => {
      mockCall.mockRejectedValueOnce(new Error('network error'))

      const results = []
      for await (const r of resolver.getYouTubeSearchResults('Error Case')) {
        results.push(r)
      }

      expect(results).toEqual([])
    })
  })

  describe('getAudioUrlFromVideo', () => {
    it('returns video.url if already present', async () => {
      const result = await resolver.getAudioUrlFromVideo({ id: 'x', url: 'http://existing.url' })
      expect(result).toBe('http://existing.url')
      expect(mockCall).not.toHaveBeenCalled()
    })

    it('calls single_yt_url when no url on video', async () => {
      mockCall.mockResolvedValueOnce('http://fresh.url')
      const result = await resolver.getAudioUrlFromVideo({ id: 'abc' })
      expect(mockCall).toHaveBeenCalledWith('single_yt_url', 'abc')
      expect(result).toBe('http://fresh.url')
    })

    it('returns undefined when single_yt_url returns null', async () => {
      mockCall.mockResolvedValueOnce(null)
      const result = await resolver.getAudioUrlFromVideo({ id: 'missing' })
      expect(result).toBeUndefined()
    })
  })

  describe('downloadAudio', () => {
    it('returns true on success', async () => {
      mockCall.mockResolvedValueOnce(undefined)
      const result = await resolver.downloadAudio({ id: 'dl1' })
      expect(mockCall).toHaveBeenCalledWith('download_yt_audio', 'dl1')
      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      mockCall.mockRejectedValueOnce(new Error('download failed'))
      const result = await resolver.downloadAudio({ id: 'dl2' })
      expect(result).toBe(false)
    })
  })

  describe('getAudio', () => {
    it('returns first valid result from search', async () => {
      const video = { id: 'found', title: 'Game Theme', thumbnail: 'http://t.jpg' }

      mockCall
        .mockResolvedValueOnce(undefined)         // search_yt
        .mockResolvedValueOnce(video)              // next_yt_result
        .mockResolvedValueOnce('http://audio.url') // single_yt_url
        // next_yt_result not called because we got a result

      const result = await resolver.getAudio('Some Game')
      expect(mockCall).toHaveBeenCalledWith('search_yt', 'Some Game Theme Music', 10)
      expect(result).toEqual({ audioUrl: 'http://audio.url', videoId: 'found' })
    })

    it('returns undefined when no results have valid URLs', async () => {
      mockCall
        .mockResolvedValueOnce(undefined)  // search_yt
        .mockResolvedValueOnce(null)       // no results

      const result = await resolver.getAudio('Unknown Game')
      expect(result).toBeUndefined()
    })
  })
})
