import { parseStoredSettings, DEFAULT_SETTINGS } from './settings'

describe('parseStoredSettings', () => {
  it('returns defaults when input is null', () => {
    expect(parseStoredSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when input is not JSON', () => {
    expect(parseStoredSettings('not-json{')).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when version is unknown', () => {
    const blob = JSON.stringify({ defaultMode: 'quality', theme: 'light', version: 999 })
    expect(parseStoredSettings(blob)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when input is not an object', () => {
    expect(parseStoredSettings('"just-a-string"')).toEqual(DEFAULT_SETTINGS)
    expect(parseStoredSettings('42')).toEqual(DEFAULT_SETTINGS)
    expect(parseStoredSettings('null')).toEqual(DEFAULT_SETTINGS)
  })

  it('parses a valid v1 blob', () => {
    const blob = JSON.stringify({ defaultMode: 'quality', theme: 'light', version: 1 })
    expect(parseStoredSettings(blob)).toEqual({
      defaultMode: 'quality',
      theme: 'light',
      version: 1,
    })
  })

  it('falls back to defaults for unknown field values', () => {
    const blob = JSON.stringify({ defaultMode: 'ultra', theme: 'sepia', version: 1 })
    expect(parseStoredSettings(blob)).toEqual(DEFAULT_SETTINGS)
  })
})
