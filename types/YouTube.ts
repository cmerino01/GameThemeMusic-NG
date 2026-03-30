export interface YouTubeVideo {
  id: string
  url?: string
}

export interface YouTubeVideoPreview extends YouTubeVideo {
  title: string
  thumbnail: string
}

export interface YouTubeInitialData extends Array<YouTubeSearchResult> {}

export interface YouTubeSearchResult {
  title: string
  videoId: string
  videoThumbnails: Array<{
    quality: string
    url: string
  }>
}

export interface Audio {
  type: string
  url: string
  audioSampleRate: number
}

export interface AdaptiveFormats {
  adaptiveFormats: Audio[]
}
