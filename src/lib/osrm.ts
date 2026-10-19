export type LatLng = { lat: number; lng: number }

export interface OsrmIntersection {
  location: [number, number]
  bearings: number[]
}

export interface OsrmStep {
  distance: number
  duration: number
  name: string
  driving_side?: 'left' | 'right'
  maneuver: { type: string; modifier?: string; location: [number, number] }
  intersections: OsrmIntersection[]
}

export interface OsrmRoute {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
  legs: {
    steps: OsrmStep[]
    annotation?: { distance: number[]; duration: number[] }
  }[]
}

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<OsrmRoute> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = 'overview=full&geometries=geojson&steps=true&annotations=distance,duration'
  const res = await fetch(`${OSRM_URL}/${coords}?${params}`, { signal })
  if (!res.ok) throw new Error(`Routing failed (${res.status})`)
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || 'No driveable route found between those points')
  }
  return data.routes[0] as OsrmRoute
}
