import { createContext, FC, useContext, useEffect, useState } from 'react'

interface PublicState {
  gamesRunning: number[]
  onAppPage: boolean
}

interface PublicStateContext extends PublicState {
  setGamesRunning(gamesRunning: number[]): void
  setOnThemePage(onAppPage: boolean): void
}

export class AudioLoaderCompatState {
  private readonly delayMs = 1000
  private gamesRunning: number[] = []
  private onThemePage = false
  private lastOnThemePageTime = 0

  public readonly eventBus = new EventTarget()

  getPublicState(): PublicState {
    return {
      gamesRunning: this.gamesRunning,
      onAppPage: this.onThemePage,
    }
  }

  setGamesRunning(gamesRunning: number[]) {
    const wasRunning = this.gamesRunning.length > 0
    const noGamesRunning = gamesRunning.length === 0

    this.gamesRunning = gamesRunning

    // Disable AudioLoader after delay when all games stop
    if (noGamesRunning && wasRunning) {
      setTimeout(() => this.setAudioLoaderEnabled(false), this.delayMs)
    }

    setTimeout(
      () => this.forceUpdate(),
      noGamesRunning ? this.delayMs : 0,
    )
  }

  setOnThemePage(onAppPage: boolean) {
    const time = Date.now()
    setTimeout(
      () => this.setOnThemePageInternal(onAppPage, time),
      onAppPage ? 0 : this.delayMs,
    )
  }

  private setAudioLoaderEnabled(enabled: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioLoader = (window as any).AUDIOLOADER_MENUMUSIC
    if (audioLoader) {
      if (enabled) audioLoader.play()
      else audioLoader.pause()
    }
  }

  private setOnThemePageInternal(onAppPage: boolean, time: number) {
    if (time < this.lastOnThemePageTime) return
    this.onThemePage = onAppPage
    this.lastOnThemePageTime = time
    this.forceUpdate()
  }

  private forceUpdate() {
    if (this.onThemePage) {
      this.setAudioLoaderEnabled(false)
    } else {
      this.setAudioLoaderEnabled(this.gamesRunning.length === 0)
    }
    this.eventBus.dispatchEvent(new Event('stateUpdate'))
  }
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Context = createContext<PublicStateContext>(null as any)

export const useAudioLoaderCompatState = () => useContext(Context)

interface ProviderProps {
  AudioLoaderCompatStateClass: AudioLoaderCompatState
  children?: React.ReactNode
}

export const AudioLoaderCompatStateContextProvider: FC<ProviderProps> = ({
  children,
  AudioLoaderCompatStateClass,
}) => {
  const [publicState, setPublicState] = useState<PublicState>({
    ...AudioLoaderCompatStateClass.getPublicState(),
  })

  useEffect(() => {
    function onUpdate() {
      setPublicState({ ...AudioLoaderCompatStateClass.getPublicState() })
    }
    AudioLoaderCompatStateClass.eventBus.addEventListener('stateUpdate', onUpdate)
    return () =>
      AudioLoaderCompatStateClass.eventBus.removeEventListener('stateUpdate', onUpdate)
  }, [AudioLoaderCompatStateClass])

  return (
    <Context.Provider
      value={{
        ...publicState,
        setGamesRunning: (g) => AudioLoaderCompatStateClass.setGamesRunning(g),
        setOnThemePage: (v) => AudioLoaderCompatStateClass.setOnThemePage(v),
      }}
    >
      {children}
    </Context.Provider>
  )
}
