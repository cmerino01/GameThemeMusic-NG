import { Focusable, Button, TextField } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import { FaSearch, FaTimes, FaSpinner } from 'react-icons/fa'
import { resolver } from '../../actions/audio'
import { YouTubeVideoPreview } from '../../../types/YouTube'
import { useSettings } from '../../hooks/useSettings'
import AudioPlayerCard from './audioPlayerCard'
import { SearchState } from './index'

interface Props {
  appId: number
  appName: string
  selectedVideoId: string | undefined
  searchState: SearchState
  onSearchStateChange(s: SearchState): void
  onSelect(video: YouTubeVideoPreview): void
}

const SHIMMER_STYLE = `
  @keyframes gtm-shimmer {
    0%   { background-position: -400px 0 }
    100% { background-position:  400px 0 }
  }
  .gtm-shimmer {
    background: linear-gradient(90deg,
      rgba(255,255,255,0.05) 25%,
      rgba(255,255,255,0.18) 50%,
      rgba(255,255,255,0.05) 75%);
    background-size: 800px 100%;
    animation: gtm-shimmer 1.4s infinite linear;
  }
`

function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', gap: '10px', padding: '10px 0',
      alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="gtm-shimmer" style={{ width: 80, height: 45, borderRadius: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="gtm-shimmer" style={{ height: 11, borderRadius: 2 }} />
        <div className="gtm-shimmer" style={{ height: 11, borderRadius: 2, width: '60%' }} />
      </div>
    </div>
  )
}

const SPINNER_STYLE = `
  @keyframes gtm-spin {
    from { transform: rotate(0deg) }
    to   { transform: rotate(360deg) }
  }
`

const iconBtnStyle: React.CSSProperties = {
  minWidth: 36, width: 36, height: 36, padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, fontSize: 16,
}

function ChangePage({ appId, appName, selectedVideoId, searchState, onSearchStateChange, onSelect }: Props) {
  const [settings, , settingsLoaded] = useSettings()
  const defaultQuery = `${appName} Theme Music`

  const [local, setLocal] = useState<SearchState>(searchState)
  const localRef = useRef(local)
  const [playingId, setPlayingId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(false)

  function update(s: SearchState) {
    localRef.current = s
    setLocal(s)
  }

  // Save back to parent when unmounting (tab switch) so results survive
  useEffect(() => {
    return () => { onSearchStateChange(localRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { query, results, isSearching, searchError } = local

  async function runSearch(searchTerm: string, count = 10) {
    update({ query: searchTerm, isSearching: true, results: [], searchError: undefined, hasMore: false })
    try {
      const found: YouTubeVideoPreview[] = []
      let hasMore = false
      for await (const video of resolver.getYouTubeSearchResults(searchTerm, count + 1)) {
        if (found.length < count) {
          found.push(video)
          update({ query: searchTerm, isSearching: true, results: [...found], searchError: undefined, hasMore: false })
        } else {
          hasMore = true
          break
        }
      }
      if (found.length === 0) update({ query: searchTerm, isSearching: false, results: [], searchError: 'No results found.', hasMore: false })
      else update({ query: searchTerm, isSearching: false, results: found, searchError: undefined, hasMore })
    } catch (err) {
      update({ query: searchTerm, isSearching: false, results: [], searchError: err instanceof Error ? err.message : 'Search failed.', hasMore: false })
    }
  }

  async function loadMore() {
    const { results: existing, query: currentQuery, isSearching: busy, hasMore: more } = localRef.current
    if (busy || !more) return
    const existingCount = existing.length
    const nextCount = existingCount + 10
    update({ ...localRef.current, isSearching: true, searchError: undefined })
    try {
      const newResults: YouTubeVideoPreview[] = []
      let hasMore = false
      let skipped = 0
      for await (const video of resolver.getYouTubeSearchResults(currentQuery, nextCount + 1)) {
        if (skipped < existingCount) { skipped++; continue }
        if (newResults.length < 10) {
          newResults.push(video)
          update({ ...localRef.current, isSearching: true, results: [...existing, ...newResults], searchError: undefined, hasMore: false })
        } else {
          hasMore = true
          break
        }
      }
      update({ ...localRef.current, isSearching: false, results: [...existing, ...newResults], searchError: undefined, hasMore })
    } catch (err) {
      update({ ...localRef.current, isSearching: false, searchError: err instanceof Error ? err.message : 'Search failed.' })
    }
  }

  // Infinite scroll — trigger loadMore when user reaches the bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      const nearBottom = el!.scrollTop + el!.clientHeight >= el!.scrollHeight - 150
      setAtBottom(nearBottom)
      if (nearBottom) loadMore()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Auto-search once settings have loaded — skip if we already have results cached
  useEffect(() => {
    if (!settingsLoaded) return
    if (local.results.length > 0 || local.isSearching) return
    runSearch(defaultQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Search bar row ── */}
      <Focusable
        flow-children="row"
        style={{
          padding: '10px 16px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <TextField
          value={query}
          onChange={(e) => update({ ...localRef.current, query: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && !isSearching && runSearch(query)}
          inlineControls={
            <Focusable flow-children="row" style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
              <Button style={iconBtnStyle} disabled={isSearching} onClick={() => runSearch(query)}>
                <FaSearch />
              </Button>
              <Button style={iconBtnStyle} disabled={isSearching} onClick={() => update({ ...localRef.current, query: '' })}>
                <FaTimes />
              </Button>
            </Focusable>
          }
        />
      </Focusable>

      {searchError && (
        <div style={{ padding: '6px 16px', color: '#e06c75', fontSize: '12px', flexShrink: 0 }}>
          {searchError}
        </div>
      )}

      {/* ── Scrollable results — plain div owns the scroll so we can ref it ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', scrollPaddingTop: '65px' }}>
        <Focusable
          flow-children="column"
          style={{ padding: '0 16px 16px' }}
        >
          {results.length === 0 && !searchError
            ? (
              <>
                <style>{SHIMMER_STYLE}</style>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </>
            )
            : results.map((video) => (
                <AudioPlayerCard
                  key={video.id}
                  appId={appId}
                  video={video}
                  isSelected={video.id === selectedVideoId}
                  showDownload={settings.downloadAudio}
                  resolver={resolver}
                  isActivePlayer={playingId === video.id}
                  onPlay={setPlayingId}
                  onSelect={onSelect}
                />
              ))
          }
        </Focusable>
        {isSearching && results.length > 0 && atBottom && (
          <div style={{
            position: 'sticky', bottom: 0,
            display: 'flex', justifyContent: 'center', padding: '12px 0',
            background: 'linear-gradient(transparent, rgba(15,15,20,0.95))',
          }}>
            <style>{SPINNER_STYLE}</style>
            <FaSpinner style={{ fontSize: 22, opacity: 0.7, animation: 'gtm-spin 1s linear infinite' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ChangePage
