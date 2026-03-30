import {
  afterPatch,
  appDetailsClasses,
  createReactTreePatcher,
  findInReactTree,
} from '@decky/ui'
import { routerHook } from '@decky/api'
import { ReactElement } from 'react'
import {
  AudioLoaderCompatState,
  AudioLoaderCompatStateContextProvider,
} from '../state/AudioLoaderCompatState'
import ThemePlayer from '../components/themePlayer'

function patchLibraryApp(state: AudioLoaderCompatState) {
  return routerHook.addPatch('/library/app/:appid', (tree) => {
    const routeProps = findInReactTree(tree, (x: unknown) => {
      return typeof x === 'object' && x !== null && 'renderFunc' in x
    })

    if (!routeProps) return tree

    const patchHandler = createReactTreePatcher(
      [
        (t) =>
          findInReactTree(
            t,
            (x: unknown) =>
              typeof x === 'object' &&
              x !== null &&
              'props' in x &&
              typeof (x as { props?: unknown }).props === 'object' &&
              (x as { props?: { children?: { props?: { overview?: unknown } } } }).props?.children
                ?.props?.overview !== undefined,
          )?.props?.children,
      ],
      (_args: unknown[], ret?: ReactElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = findInReactTree(
          ret,
          (x: any) =>
            Array.isArray(x?.props?.children) &&
            typeof x?.props?.className === 'string' &&
            x.props.className.includes(appDetailsClasses.InnerContainer),
        )

        if (typeof container !== 'object' || container === null) return ret

        container.props.children.push(
          <AudioLoaderCompatStateContextProvider AudioLoaderCompatStateClass={state}>
            <ThemePlayer />
          </AudioLoaderCompatStateContextProvider>,
        )

        return ret
      },
    )

    afterPatch(routeProps, 'renderFunc', patchHandler)
    return tree
  })
}

export default patchLibraryApp
