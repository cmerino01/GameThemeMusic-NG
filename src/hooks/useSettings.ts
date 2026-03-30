import { call } from '@decky/api'
import { useCallback, useEffect, useState } from 'react'

export interface Settings {
  defaultMuted: boolean
  downloadAudio: boolean
  volume: number
}

export const defaultSettings: Settings = {
  defaultMuted: false,
  downloadAudio: false,
  volume: 1,
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => Promise<void>, boolean] {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    call<[string, Settings], Settings>('get_setting', 'settings', defaultSettings)
      .then((saved) => { setSettings({ ...defaultSettings, ...saved }); setLoaded(true) })
      .catch(() => { setSettings(defaultSettings); setLoaded(true) })
  }, [])

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    await call<[string, Settings]>('set_setting', 'settings', next)
  }, [settings])

  return [settings, updateSettings, loaded]
}
