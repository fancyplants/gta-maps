import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from './components/MapView'
import { MissionPassed } from './components/MissionPassed'
import { PlaceInput } from './components/PlaceInput'
import { Results } from './components/Results'
import { WantedStars } from './components/WantedStars'
import { formatClock } from './lib/format'
import { reverseGeocode, type Place } from './lib/geocode'
import { compareDrives, type WantedLevel } from './lib/gtaModel'
import { fetchRoute, type LatLng, type OsrmRoute } from './lib/osrm'
import { positionAt } from './lib/route'

// How long the GTA car takes to reach the destination in the replay, in real seconds.
const RACE_SECONDS = 10

function readHash(): { from?: LatLng; to?: LatLng; level?: WantedLevel } {
  const p = new URLSearchParams(window.location.hash.slice(1))
  const pt = (v: string | null) => {
    const [lat, lng] = (v ?? '').split(',').map(Number)
    return Number.isFinite(lat) && Number.isFinite(lng) && v ? { lat, lng } : undefined
  }
  const w = Number(p.get('w'))
  return { from: pt(p.get('from')), to: pt(p.get('to')), level: w >= 1 && w <= 5 ? (w as WantedLevel) : undefined }
}

const coord = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`

export default function App() {
  const initial = useMemo(readHash, [])
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [level, setLevel] = useState<WantedLevel>(initial.level ?? 3)
  const [route, setRoute] = useState<OsrmRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simT, setSimT] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)
  const raf = useRef(0)

  const placeAt = useCallback(async (at: LatLng, set: (p: Place) => void) => {
    set({ ...at, label: 'Dropped pin' })
    set(await reverseGeocode(at))
  }, [])

  // Restore a shared link.
  useEffect(() => {
    if (initial.from) placeAt(initial.from, setFrom)
    if (initial.to) placeAt(initial.to, setTo)
  }, [initial, placeAt])

  useEffect(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', coord(from))
    if (to) p.set('to', coord(to))
    p.set('w', String(level))
    window.history.replaceState(null, '', `#${p}`)
  }, [from, to, level])

  // Fetch the route only when the endpoints move, not when the label is filled in.
  const fromKey = from && coord(from)
  const toKey = to && coord(to)
  useEffect(() => {
    setRoute(null)
    stopRace()
    if (!from || !to) return
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetchRoute(from, to, ctrl.signal)
      .then(setRoute)
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey])

  const comparison = useMemo(() => (route ? compareDrives(route, level) : null), [route, level])
  const path = useMemo(() => route?.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })) ?? [], [route])

  function stopRace() {
    cancelAnimationFrame(raf.current)
    setSimT(null)
    setPassed(false)
  }

  const startRace = () => {
    if (!comparison) return
    stopRace()
    const scale = comparison.gta.totalS / RACE_SECONDS
    const t0 = performance.now()
    let shown = false
    const tick = (now: number) => {
      const t = ((now - t0) / 1000) * scale
      setSimT(t)
      if (!shown && t >= comparison.gta.totalS) {
        shown = true
        setPassed(true)
      }
      if (t < comparison.legal.totalS) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // Changing the wanted level mid-race would desync the replay, so reset it.
  const changeLevel = (l: WantedLevel) => {
    stopRace()
    setLevel(l)
  }

  const onMapClick = (at: LatLng) => {
    if (!from) placeAt(at, setFrom)
    else placeAt(at, setTo)
  }

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => placeAt({ lat: pos.coords.latitude, lng: pos.coords.longitude }, setFrom),
      () => setError("Couldn't get your location"),
    )
  }

  const racing = simT !== null && comparison !== null
  const gtaCar = racing ? positionAt(path, comparison.gta.timeline, simT) : undefined
  const legalCar = racing ? positionAt(path, comparison.legal.timeline, simT) : undefined

  return (
    <div className="app">
      <MapView from={from} to={to} path={path} gtaCar={gtaCar} legalCar={legalCar} onMapClick={onMapClick} />

      <aside className="panel">
        <h1 className="logo">
          GTA <span>Maps</span>
        </h1>

        <div className="places">
          <PlaceInput
            label="Start"
            dotClass="dot-start"
            value={from}
            near={to ?? undefined}
            placeholder="Start, or click the map"
            onChange={setFrom}
            extra={
              <button type="button" className="icon-btn" title="Use my location" aria-label="Use my location" onClick={useMyLocation}>
                ◎
              </button>
            }
          />
          <PlaceInput
            label="Destination"
            dotClass="dot-end"
            value={to}
            near={from ?? undefined}
            placeholder="Destination, or click the map"
            onChange={setTo}
            extra={
              <button
                type="button"
                className="icon-btn"
                title="Swap start and destination"
                aria-label="Swap start and destination"
                onClick={() => {
                  setFrom(to)
                  setTo(from)
                }}
              >
                ⇅
              </button>
            }
          />
        </div>

        <WantedStars level={level} onChange={changeLevel} />

        {loading && <p className="hint">Plotting a route…</p>}
        {error && <p className="error">{error}</p>}
        {!from && !to && !loading && <p className="hint">Search for two places or click the map twice to set a start and a destination.</p>}
        {comparison && !loading && <Results comparison={comparison} level={level} racing={racing} onStart={startRace} />}
      </aside>

      {racing && (
        <div className="hud" aria-live="off">
          {(
            [
              ['gta', 'GTA', comparison.gta.totalS],
              ['legal', 'Legal', comparison.legal.totalS],
            ] as const
          ).map(([cls, label, total]) => (
            <div key={cls} className={`hud-row ${cls}`}>
              <span>{label}</span>
              {simT >= total ? (
                formatClock(total)
              ) : (
                <div className="hud-bar" aria-hidden>
                  <div style={{ width: `${(simT / total) * 100}%` }} />
                </div>
              )}
            </div>
          ))}
          <button type="button" className="hud-stop" onClick={stopRace}>
            End
          </button>
        </div>
      )}

      {passed && comparison && <MissionPassed comparison={comparison} onClose={() => setPassed(false)} />}
    </div>
  )
}
