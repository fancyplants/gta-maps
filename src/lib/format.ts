const imperial = typeof navigator !== 'undefined' && /^en-(US|LR|MM)$/i.test(navigator.language)

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s} s`
  const totalMin = Math.round(s / 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Clock-style time for the HUD, e.g. 12:07 or 1:02:45. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function formatDistance(meters: number): string {
  if (imperial) {
    const mi = meters / 1609.344
    return mi < 0.2 ? `${Math.round(meters * 3.28084)} ft` : `${mi.toFixed(mi < 10 ? 1 : 0)} mi`
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

export function formatSpeed(kmh: number): string {
  return imperial ? `${Math.round(kmh / 1.609344)} mph` : `${Math.round(kmh)} km/h`
}
