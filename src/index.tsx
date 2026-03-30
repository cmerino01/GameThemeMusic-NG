import { definePlugin, staticClasses } from '@decky/ui'
import { routerHook } from '@decky/api'
import { GiMusicalNotes } from 'react-icons/gi'

import {
  AudioLoaderCompatState,
  AudioLoaderCompatStateContextProvider,
} from './state/AudioLoaderCompatState'
import patchLibraryApp from './lib/patchLibraryApp'
import { patchContextMenu, LibraryContextMenu } from './lib/patchContextMenu'
import ChangeTheme from './components/changeTheme'
import Settings from './components/settings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = { bRunning: boolean; unAppID: number }

export default definePlugin(() => {
  const state = new AudioLoaderCompatState()
  const libraryPatch = patchLibraryApp(state)

  // Route for the "Change Theme Music" page
  routerHook.addRoute(
    '/gamethememusic/:appid',
    () => (
      <AudioLoaderCompatStateContextProvider AudioLoaderCompatStateClass={state}>
        <ChangeTheme />
      </AudioLoaderCompatStateContextProvider>
    ),
    { exact: true },
  )

  // Context menu patch — adds "Change Theme Music..." to the game right-click menu
  const patchedMenu = patchContextMenu(LibraryContextMenu)

  // Track running games so we can pause AudioLoader when games are running
  const AppStateRegistrar =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SteamClient?.GameSessions?.RegisterForAppLifetimeNotifications?.(
      (update: AppState) => {
        const { gamesRunning } = state.getPublicState()
        if (update.bRunning) {
          state.setGamesRunning([...gamesRunning, update.unAppID])
        } else {
          state.setGamesRunning(gamesRunning.filter((id) => id !== update.unAppID))
        }
      },
    )

  return {
    title: <div className={staticClasses.Title}>GameThemeMusic-NG</div>,
    icon: <GiMusicalNotes />,
    content: <Settings />,
    onDismount() {
      AppStateRegistrar?.unregister?.()
      routerHook.removePatch('/library/app/:appid', libraryPatch)
      routerHook.removeRoute('/gamethememusic/:appid')
      patchedMenu?.unpatch?.()
    },
  }
})
