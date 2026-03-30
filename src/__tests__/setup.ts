import { vi } from 'vitest'

// Mock @decky/api
vi.mock('@decky/api', () => {
  const callFn = vi.fn()
  return {
    call: callFn,
    callable: (name: string) => (...args: any[]) => callFn(name, ...args),
    routerHook: {
      addRoute: vi.fn(),
      removeRoute: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
})

// Mock @decky/ui
vi.mock('@decky/ui', () => ({
  definePlugin: vi.fn((fn: any) => fn),
  staticClasses: { GamepadDialogContent: 'GamepadDialogContent', FieldChildren: 'FieldChildren' },
  findModuleByExport: vi.fn(),
  afterPatch: vi.fn(),
  findInTree: vi.fn(),
  MenuItem: ({ children }: any) => children,
  Navigation: { Navigate: vi.fn() },
  ButtonItem: ({ children }: any) => children,
  PanelSection: ({ children }: any) => children,
  PanelSectionRow: ({ children }: any) => children,
  SliderField: () => null,
  ToggleField: () => null,
  DropdownItem: () => null,
  Tabs: () => null,
  TextField: () => null,
  Focusable: ({ children }: any) => children,
  DialogButton: ({ children }: any) => children,
  Router: { Navigate: vi.fn() },
  SteamSpinner: () => null,
}))

// Mock localforage
vi.mock('localforage', () => {
  const store = new Map<string, any>()
  return {
    default: {
      config: vi.fn(),
      getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: vi.fn((key: string, value: any) => { store.set(key, value); return Promise.resolve(value) }),
      removeItem: vi.fn((key: string) => { store.delete(key); return Promise.resolve() }),
      clear: vi.fn(() => { store.clear(); return Promise.resolve() }),
      iterate: vi.fn((fn: (value: any, key: string) => void) => {
        store.forEach((value, key) => fn(value, key))
        return Promise.resolve()
      }),
      _store: store,
    },
  }
})

// Mock Audio element
class MockAudio {
  src = ''
  preload = ''
  loop = false
  volume = 1
  paused = true
  currentTime = 0
  oncanplaythrough: (() => void) | null = null

  load = vi.fn()
  play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause = vi.fn(() => { this.paused = true })
}

vi.stubGlobal('Audio', MockAudio)
