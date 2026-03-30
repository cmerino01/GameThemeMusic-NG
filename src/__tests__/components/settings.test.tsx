import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { call } from '@decky/api'

const mockCall = vi.mocked(call)

// Override @decky/ui with interactive elements for this test
vi.mock('@decky/ui', () => ({
  ButtonItem: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  PanelSection: ({ children }: any) => <div>{children}</div>,
  PanelSectionRow: ({ children }: any) => <div>{children}</div>,
  SliderField: () => null,
  ToggleField: () => null,
  DropdownItem: () => null,
}))

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => [{ defaultMuted: false, downloadAudio: false, volume: 1 }, vi.fn(), true],
  defaultSettings: { defaultMuted: false, downloadAudio: false, volume: 1 },
}))

vi.mock('../../cache/musicCache', () => ({
  listCacheBackups: vi.fn(),
  exportCache: vi.fn(),
  importCache: vi.fn(),
  clearCache: vi.fn(),
  clearDownloads: vi.fn(),
}))

import Settings from '../../components/settings/index'
import * as musicCache from '../../cache/musicCache'

const mockListCacheBackups = vi.mocked(musicCache.listCacheBackups)

beforeEach(() => {
  vi.clearAllMocks()
  mockListCacheBackups.mockResolvedValue([])
})

describe('Settings — yt-dlp management', () => {
  it('always shows Update button; hides Remove when not installed', async () => {
    mockCall.mockResolvedValueOnce(false) // is_yt_dlp_installed

    render(<Settings />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /update yt-dlp/i })).toBeTruthy(),
    )
    expect(screen.queryByRole('button', { name: /remove yt-dlp/i })).toBeNull()
  })

  it('shows Remove button when yt-dlp is installed', async () => {
    mockCall.mockResolvedValueOnce(true) // is_yt_dlp_installed

    render(<Settings />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove yt-dlp/i })).toBeTruthy(),
    )
    expect(screen.getByRole('button', { name: /update yt-dlp/i })).toBeTruthy()
  })

  it('clicking Update calls download_yt_dlp and shows Remove on success', async () => {
    mockCall
      .mockResolvedValueOnce(false) // is_yt_dlp_installed
      .mockResolvedValueOnce(true)  // download_yt_dlp

    render(<Settings />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /update yt-dlp/i })).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('button', { name: /update yt-dlp/i }))

    await waitFor(() => expect(mockCall).toHaveBeenCalledWith('download_yt_dlp'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove yt-dlp/i })).toBeTruthy(),
    )
  })

  it('clicking Remove calls delete_yt_dlp and hides Remove button', async () => {
    mockCall
      .mockResolvedValueOnce(true) // is_yt_dlp_installed
      .mockResolvedValueOnce(true) // delete_yt_dlp

    render(<Settings />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove yt-dlp/i })).toBeTruthy(),
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove yt-dlp/i }))
    })

    expect(mockCall).toHaveBeenCalledWith('delete_yt_dlp')
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /remove yt-dlp/i })).toBeNull(),
    )
  })
})
