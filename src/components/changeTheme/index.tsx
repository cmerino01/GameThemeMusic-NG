import { useEffect, useState } from 'react'
import { useParams, Tabs } from '@decky/ui'
import { getCache } from '../../cache/musicCache'
import { YouTubeVideoPreview } from '../../../types/YouTube'
import GameSettings from './gameSettings'
import ChangePage from './changePage'

export interface SearchState {
  query: string
  results: YouTubeVideoPreview[]
  isSearching: boolean
  searchError: string | undefined
  hasMore: boolean
}

interface RouteParams {
  appid?: string
}

function ChangeTheme() {
  const { appid } = useParams<RouteParams>()
  const appId = parseInt(appid ?? '0', 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appName: string = (window as any).appStore?.m_mapApps?.get(appId)?.display_name?.replace(/(™|®|©)/g, '') ?? `App ${appId}`

  const [currentVideo, setCurrentVideo] = useState<YouTubeVideoPreview | undefined>()
  const [activeTab, setActiveTab] = useState('search')
  const [searchState, setSearchState] = useState<SearchState>({
    query: `${appName} Theme Music`,
    results: [],
    isSearching: false,
    searchError: undefined,
    hasMore: false,
  })

  // Load cached video once on mount
  useEffect(() => {
    getCache(appId).then((cached) => {
      if (cached?.videoId) setCurrentVideo({ id: cached.videoId, title: cached.title ?? cached.videoId, thumbnail: cached.thumbnail ?? `https://i.ytimg.com/vi/${cached.videoId}/hqdefault.jpg` })
    })
  }, [appId])

  function handleReset() {
    setCurrentVideo(undefined)
  }

  function handleSelect(video: YouTubeVideoPreview) {
    // Strip the url — search URLs expire, Current tab always fetches fresh
    setCurrentVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail })
    setActiveTab('current')
  }

  return (
    <div style={{ marginTop: '40px', height: 'calc(100% - 40px)' }}>
      <Tabs
        activeTab={activeTab}
        onShowTab={setActiveTab}
        autoFocusContents={true}
        tabs={[
          {
            id: 'current',
            title: 'Current',
            content: (
              <GameSettings
                appId={appId}
                appName={appName}
                video={currentVideo}
                onReset={handleReset}
              />
            ),
          },
          {
            id: 'search',
            title: 'Change',
            content: (
              <ChangePage
                appId={appId}
                appName={appName}
                selectedVideoId={currentVideo?.id}
                searchState={searchState}
                onSearchStateChange={setSearchState}
                onSelect={handleSelect}
              />
            ),
          },
        ]}
      />
    </div>
  )
}

export default ChangeTheme
