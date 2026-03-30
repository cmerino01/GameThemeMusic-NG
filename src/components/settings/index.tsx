import {
  ButtonItem,
  DropdownItem,
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from '@decky/ui'
import { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import {
  clearCache,
  clearDownloads,
  exportCache,
  importCache,
  listCacheBackups,
} from '../../cache/musicCache'
import { callable } from '@decky/api'

const isYtDlpInstalled = callable<[], boolean>('is_yt_dlp_installed')
const downloadYtDlp = callable<[], boolean>('download_yt_dlp')
const deleteYtDlp = callable<[], boolean>('delete_yt_dlp')

function Settings() {
  const [settings, updateSettings] = useSettings()
  const [backups, setBackups] = useState<string[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string | undefined>()
  const [statusMsg, setStatusMsg] = useState('')
  const [ytDlpInstalled, setYtDlpInstalled] = useState<boolean | null>(null)
  const [ytDlpDownloading, setYtDlpDownloading] = useState(false)

  useEffect(() => {
    listCacheBackups().then(setBackups)
    isYtDlpInstalled().then(setYtDlpInstalled)
  }, [])

  function flash(msg: string) {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(''), 3000)
  }

  async function handleExport() {
    try {
      await exportCache()
      const updated = await listCacheBackups()
      setBackups(updated)
      flash('Cache exported successfully.')
    } catch {
      flash('Export failed.')
    }
  }

  async function handleImport() {
    if (!selectedBackup) return
    try {
      await importCache(selectedBackup)
      flash(`Imported "${selectedBackup}".`)
    } catch {
      flash('Import failed.')
    }
  }

  async function handleClearCache() {
    try {
      await clearCache()
      setBackups([])
      setSelectedBackup(undefined)
      flash('Cache cleared.')
    } catch {
      flash('Clear cache failed.')
    }
  }

  async function handleClearDownloads() {
    try {
      await clearDownloads()
      flash('Downloads cleared.')
    } catch {
      flash('Clear downloads failed.')
    }
  }

  async function handleDownloadYtDlp() {
    setYtDlpDownloading(true)
    flash('Updating yt-dlp...')
    try {
      const ok = await downloadYtDlp()
      if (ok) {
        setYtDlpInstalled(true)
        flash('yt-dlp updated successfully.')
      } else {
        flash('yt-dlp update failed.')
      }
    } catch {
      flash('yt-dlp update failed.')
    } finally {
      setYtDlpDownloading(false)
    }
  }

  async function handleDeleteYtDlp() {
    try {
      const ok = await deleteYtDlp()
      if (ok) {
        setYtDlpInstalled(false)
        flash('yt-dlp removed.')
      } else {
        flash('Failed to remove yt-dlp.')
      }
    } catch {
      flash('Failed to remove yt-dlp.')
    }
  }

  return (
    <>
      <PanelSection title="Playback">
        <PanelSectionRow>
          <ToggleField
            label="Default Muted"
            description="Don't auto-play theme music when opening a game page."
            checked={settings.defaultMuted}
            onChange={(v) => updateSettings({ defaultMuted: v })}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <SliderField
            label="Global Volume"
            value={settings.volume * 100}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateSettings({ volume: v / 100 })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Music Source">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            description={
              ytDlpInstalled === true
                ? 'Update yt-dlp to the latest version.'
                : ytDlpInstalled === false
                  ? 'yt-dlp is not installed.'
                  : 'Checking...'
            }
            disabled={ytDlpDownloading}
            onClick={handleDownloadYtDlp}
          >
            {ytDlpDownloading ? 'Updating...' : 'Update yt-dlp'}
          </ButtonItem>
        </PanelSectionRow>

        {ytDlpInstalled && (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={handleDeleteYtDlp}>
              Remove yt-dlp
            </ButtonItem>
          </PanelSectionRow>
        )}

        <PanelSectionRow>
          <ToggleField
            label="Download Audio"
            description="Offer a download button on search results for offline playback."
            checked={settings.downloadAudio}
            onChange={(v) => updateSettings({ downloadAudio: v })}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Cache">
        {statusMsg ? (
          <PanelSectionRow>
            <span style={{ fontSize: '13px', opacity: 0.8 }}>{statusMsg}</span>
          </PanelSectionRow>
        ) : null}

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleExport}>
            Export Cache Backup
          </ButtonItem>
        </PanelSectionRow>

        {backups.length > 0 && (
          <>
            <PanelSectionRow>
              <DropdownItem
                label="Restore From Backup"
                rgOptions={backups.map((b) => ({ label: b, data: b }))}
                selectedOption={selectedBackup}
                onChange={(opt) => setSelectedBackup(opt.data as string)}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={handleImport} disabled={!selectedBackup}>
                Restore Selected Backup
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleClearCache}>
            Clear All Cache &amp; Backups
          </ButtonItem>
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleClearDownloads}>
            Clear Downloaded Audio
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  )
}

export default Settings
