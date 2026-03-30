import { call } from '@decky/api'
import { YouTubeVideo, YouTubeVideoPreview } from '../../types/YouTube'

// ---------------------------------------------------------------------------
// Abstract base
// ---------------------------------------------------------------------------

abstract class AudioResolver {
  abstract getYouTubeSearchResults(searchTerm: string, count?: number): AsyncIterable<YouTubeVideoPreview>
  abstract getAudioUrlFromVideo(video: YouTubeVideo): Promise<string | undefined>
  abstract downloadAudio(video: YouTubeVideo): Promise<boolean>

  async getAudio(appName: string): Promise<{ videoId: string; audioUrl: string } | undefined> {
    const results = this.getYouTubeSearchResults(`${appName} Theme Music`)
    for await (const video of results) {
      const audioUrl = await this.getAudioUrlFromVideo(video)
      if (audioUrl?.length) {
        return { audioUrl, videoId: video.id }
      }
    }
    return undefined
  }
}

// ---------------------------------------------------------------------------
// yt-dlp resolver
// ---------------------------------------------------------------------------

class YtDlpAudioResolver extends AudioResolver {
  async *getYouTubeSearchResults(searchTerm: string, count = 10): AsyncIterable<YouTubeVideoPreview> {
    try {
      await call<[string, number]>('search_yt', searchTerm, count)
      let result = await call<[], YouTubeVideoPreview | null>('next_yt_result')
      while (result) {
        yield result
        result = await call<[], YouTubeVideoPreview | null>('next_yt_result')
      }
    } catch (err) {
      console.error('[GTM] yt-dlp search error:', err)
    }
  }

  async getAudioUrlFromVideo(video: YouTubeVideo): Promise<string | undefined> {
    if (video.url) return video.url
    const result = await call<[string], string | null>('single_yt_url', video.id)
    return result ?? undefined
  }

  async downloadAudio(video: YouTubeVideo): Promise<boolean> {
    try {
      await call<[string]>('download_yt_audio', video.id)
      return true
    } catch (err) {
      console.error('[GTM] download_yt_audio error:', err)
      return false
    }
  }
}

export const resolver = new YtDlpAudioResolver()
export type { AudioResolver }
