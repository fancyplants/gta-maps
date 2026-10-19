import { describe, expect, it } from 'vitest'
import { compareDrives, type WantedLevel } from './gtaModel'
import type { OsrmRoute, OsrmStep } from './osrm'

const kmh = (v: number) => v / 3.6

function step(type: string, modifier: string | undefined, distance: number, speedKmh: number, junctions: number): OsrmStep {
  return {
    distance,
    duration: speedKmh > 0 ? distance / kmh(speedKmh) : 0,
    name: '',
    driving_side: 'right',
    maneuver: { type, modifier, location: [0, 0] },
    intersections: Array.from({ length: junctions + 1 }, () => ({ location: [0, 0] as [number, number], bearings: [0, 90, 180] })),
  }
}

// 10 km of city streets at 40 km/h with a few turns, then 10 km of highway at 100 km/h.
function cityThenHighway(): OsrmRoute {
  const steps = [
    step('depart', 'right', 3000, 40, 25),
    step('turn', 'left', 3000, 40, 25),
    step('turn', 'right', 4000, 40, 30),
    step('on ramp', 'slight right', 10000, 100, 3),
    step('arrive', undefined, 0, 0, 0),
  ]
  const moving = steps.filter((s) => s.distance > 0)
  const coords: [number, number][] = [[0, 0], ...moving.map((_, i) => [i + 1, 0] as [number, number])]
  return {
    distance: moving.reduce((a, s) => a + s.distance, 0),
    duration: moving.reduce((a, s) => a + s.duration, 0),
    geometry: { coordinates: coords },
    legs: [{ steps, annotation: { distance: moving.map((s) => s.distance), duration: moving.map((s) => s.duration) } }],
  }
}

describe('compareDrives', () => {
  it('makes the GTA drive much faster than the legal drive', () => {
    const c = compareDrives(cityThenHighway(), 3)
    expect(c.gta.totalS).toBeLessThan(c.legal.totalS * 0.6)
    expect(c.gta.totalS).toBeGreaterThan(c.legal.totalS * 0.2)
  })

  it('adds junction and turn waits only to the legal drive', () => {
    const c = compareDrives(cityThenHighway(), 1)
    expect(c.legal.junctionWaitS).toBe(80 * 4)
    expect(c.legal.turnWaitS).toBe(15 + 6)
    expect(c.legal.totalS).toBeCloseTo(c.legal.drivingS + 80 * 4 + 21)
  })

  it('gets faster with each wanted level and runs the same red lights', () => {
    const route = cityThenHighway()
    const runs = ([1, 2, 3, 4, 5] as WantedLevel[]).map((l) => compareDrives(route, l))
    for (let i = 1; i < runs.length; i++) expect(runs[i].gta.totalS).toBeLessThan(runs[i - 1].gta.totalS)
    expect(new Set(runs.map((r) => r.stats.redLightsRun)).size).toBe(1)
    expect(runs[0].stats.roadblocks).toBe(0)
    expect(runs[4].stats.roadblocks).toBeGreaterThan(0)
  })

  it('respects the top speed cap', () => {
    const c = compareDrives(cityThenHighway(), 5)
    expect(c.gta.topSpeedKmh).toBeCloseTo(230)
    const one = compareDrives(cityThenHighway(), 1)
    expect(one.gta.topSpeedKmh).toBeCloseTo(130)
  })

  it('produces timelines that end at each total', () => {
    const c = compareDrives(cityThenHighway(), 2)
    expect(c.legal.timeline).toHaveLength(5)
    expect(c.legal.timeline.at(-1)).toBeCloseTo(c.legal.totalS)
    expect(c.gta.timeline.at(-1)).toBeCloseTo(c.gta.totalS)
  })
})
