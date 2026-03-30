/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  afterPatch,
  Export,
  fakeRenderComponent,
  findInReactTree,
  findInTree,
  findModuleByExport,
  MenuItem,
  Navigation,
  Patch,
} from '@decky/ui'
import { FC } from 'react'

const spliceChangeMusic = (children: any[], appid: number) => {
  const propertiesMenuItemIdx = children.findIndex((item) =>
    findInReactTree(
      item,
      (x) => x?.onSelected && x.onSelected.toString().includes('AppProperties'),
    ),
  )
  const insertAt = propertiesMenuItemIdx === -1 ? children.length : propertiesMenuItemIdx
  children.splice(
    insertAt,
    0,
    <MenuItem
      key="gamethememusic-change-music"
      onSelected={() => setTimeout(() => Navigation.Navigate(`/gamethememusic/${appid}`), 0)}
    >
      Change Theme Music...
    </MenuItem>,
  )
}

const handleItemDupes = (children: any[]) => {
  const idx = children.findIndex((x: any) => x?.key === 'gamethememusic-change-music')
  if (idx !== -1) children.splice(idx, 1)
}

const patchMenuItems = (children: any[], appid: number) => {
  let updatedAppid = appid
  const parentOverview = children.find(
    (x: any) =>
      x?._owner?.pendingProps?.overview?.appid &&
      x._owner.pendingProps.overview.appid !== appid,
  )
  if (parentOverview) updatedAppid = parentOverview._owner.pendingProps.overview.appid

  // Oct 2025 Steam client fallback
  if (updatedAppid === appid) {
    const foundApp = findInTree(children, (x: any) => x?.app?.appid, {
      walkable: ['props', 'children'],
    })
    if (foundApp) updatedAppid = foundApp.app.appid
  }

  spliceChangeMusic(children, updatedAppid)
}

export function patchContextMenu(LibraryContextMenu: any) {
  if (!LibraryContextMenu) return null

  const patches: { outer?: Patch; inner?: Patch; unpatch: () => void } = {
    unpatch: () => null,
  }

  patches.outer = afterPatch(
    LibraryContextMenu.prototype,
    'render',
    (_: Record<string, unknown>[], component: any) => {
      let appid: number | undefined

      if (component._owner) {
        appid = component._owner.pendingProps.overview.appid
      } else {
        // Oct 2025 Steam client
        const foundApp = findInTree(component.props?.children, (x: any) => x?.app?.appid, {
          walkable: ['props', 'children'],
        })
        if (foundApp) appid = foundApp.app.appid
      }

      if (!appid) return component

      if (!patches.inner) {
        // Splice on first render immediately
        spliceChangeMusic(component.props.children, appid)

        patches.inner = afterPatch(
          component.type.prototype,
          'shouldComponentUpdate',
          ([nextProps]: any, shouldUpdate: any) => {
            try {
              handleItemDupes(nextProps.children)
            } catch {
              return shouldUpdate
            }
            if (shouldUpdate === true) patchMenuItems(nextProps.children, appid)
            return shouldUpdate
          },
        )
      } else {
        spliceChangeMusic(component.props.children, appid)
      }

      return component
    },
  )

  patches.unpatch = () => {
    patches.outer?.unpatch()
    patches.inner?.unpatch()
  }

  return patches
}

/**
 * Game context menu component — located via module search at runtime.
 * Uses findModuleByExport (newer API) over findModuleChild.
 */
let LibraryContextMenu: any = null
try {
  LibraryContextMenu = fakeRenderComponent(
    Object.values(
      findModuleByExport((e: Export) => e?.toString?.().includes('().LibraryContextMenu')),
    ).find((sibling: any) => sibling?.toString().includes('navigator:')) as FC,
  ).type
} catch {
  // Steam UI module not found — context menu patch will be skipped
}

export { LibraryContextMenu }
