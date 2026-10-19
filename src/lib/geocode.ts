import type { LatLng } from './osrm'

export interface Place extends LatLng {
  label: string
}

const PHOTON_URL = 'https://photon.komoot.io'

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

function labelFor(p: PhotonFeature['properties']): string {
  const street = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street
  const parts = [p.name, p.name ? undefined : street, p.city ?? p.county, p.state, p.country]
  return [...new Set(parts.filter(Boolean))].join(', ')
}

function toPlace(f: PhotonFeature): Place {
  const [lng, lat] = f.geometry.coordinates
  return { lat, lng, label: labelFor(f.properties) || `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
}

export async function searchPlaces(query: string, near?: LatLng, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en' })
  if (near) {
    params.set('lat', String(near.lat))
    params.set('lon', String(near.lng))
  }
  const res = await fetch(`${PHOTON_URL}/api/?${params}`, { signal })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const data = await res.json()
  return (data.features as PhotonFeature[]).map(toPlace)
}

export async function reverseGeocode(at: LatLng): Promise<Place> {
  const fallback = { ...at, label: `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}` }
  try {
    const res = await fetch(`${PHOTON_URL}/reverse?lat=${at.lat}&lon=${at.lng}&lang=en`)
    if (!res.ok) return fallback
    const data = await res.json()
    const f = (data.features as PhotonFeature[])[0]
    return f ? { ...at, label: toPlace(f).label } : fallback
  } catch {
    return fallback
  }
}
