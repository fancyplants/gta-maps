import type { LatLng } from './osrm'

/** Position along `coords` at time `t`, where `timeline[i]` is the time at `coords[i]`. */
export function positionAt(coords: LatLng[], timeline: number[], t: number): LatLng {
  if (!coords.length) return { lat: 0, lng: 0 }
  if (t <= 0 || coords.length === 1) return coords[0]
  const last = timeline.length - 1
  if (t >= timeline[last]) return coords[Math.min(last, coords.length - 1)]
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (timeline[mid] <= t) lo = mid
    else hi = mid
  }
  const span = timeline[hi] - timeline[lo]
  const f = span > 0 ? (t - timeline[lo]) / span : 0
  const a = coords[lo]
  const b = coords[hi]
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }
}
