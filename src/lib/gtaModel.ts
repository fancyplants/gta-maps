import type { OsrmRoute, OsrmStep } from './osrm'

export type WantedLevel = 1 | 2 | 3 | 4 | 5

/**
 * Tuning knobs for each wanted level (index 0 = one star).
 * Higher stars mean faster, more reckless driving, but also more crashes and police.
 */
export const LEVELS = {
  speedMultiplier: [1.3, 1.5, 1.75, 2.0, 2.3],
  topSpeedKmh: [140, 170, 200, 230, 260],
  // How much harder you're willing to throw the car into a corner.
  cornerGrip: [1.0, 1.08, 1.16, 1.24, 1.32],
  // Expected crashes per km of city street (highways use 30% of this).
  crashesPerKm: [0.03, 0.06, 0.1, 0.15, 0.22],
  // Expected police roadblocks per km.
  roadblocksPerKm: [0, 0, 0.03, 0.06, 0.1],
}

export const LEVEL_NAMES = ['Cautious', 'Spirited', 'Reckless', 'Unhinged', 'Rampage'] as const

const ACCEL = 5 // m/s², sports car launch
const BRAKE = 9 // m/s²
const CRASH_COST_S = 8 // bounce off, recover, keep going
const ROADBLOCK_COST_S = 12 // swerve around the cop cars

// A road whose normal speed is below this is treated as a city street with junctions and traffic.
const URBAN_SPEED_MS = 70 / 3.6

// Law-abiding delays on city streets.
const JUNCTION_WAIT_S = 4 // average wait per junction passed (signals, stop signs, yielding)
const CROSS_TURN_WAIT_S = 15 // turning across oncoming traffic
const SAME_SIDE_TURN_WAIT_S = 6
const RED_LIGHT_SHARE_PER_JUNCTION = 0.1
const RED_LIGHT_SHARE_PER_TURN = 0.3

const CARS_PER_KM = { urban: 25, highway: 35 }

// Speed you can carry through each kind of turn at one star, km/h.
const CORNER_SPEED_KMH: Record<string, number> = {
  uturn: 15,
  'sharp left': 25,
  'sharp right': 25,
  left: 35,
  right: 35,
  'slight left': 70,
  'slight right': 70,
}
const ROUNDABOUT_SPEED_KMH = 30

export interface DriveEstimate {
  totalS: number
  /** Cumulative seconds at each geometry point, for animating a marker along the route. */
  timeline: number[]
}

export interface Comparison {
  distanceM: number
  legal: DriveEstimate & {
    drivingS: number
    junctionWaitS: number
    turnWaitS: number
  }
  gta: DriveEstimate & {
    cruiseS: number
    corneringS: number
    crashS: number
    roadblockS: number
    topSpeedKmh: number
  }
  stats: {
    redLightsRun: number
    carsWeavedPast: number
    crashes: number
    roadblocks: number
  }
}

interface Segment {
  distance: number
  duration: number
}

const isTurn = (step: OsrmStep) => !['depart', 'arrive', 'continue', 'new name', 'notification'].includes(step.maneuver.type)

function crossesTraffic(step: OsrmStep): boolean {
  const mod = step.maneuver.modifier ?? ''
  const side = step.driving_side ?? 'right'
  if (mod === 'uturn') return true
  return side === 'right' ? mod.includes('left') : mod.includes('right')
}

function cornerSpeedMs(step: OsrmStep, grip: number): number | undefined {
  const t = step.maneuver.type
  let kmh: number | undefined
  if (t === 'roundabout' || t === 'rotary' || t === 'roundabout turn' || t === 'exit roundabout') {
    kmh = ROUNDABOUT_SPEED_KMH
  } else if (isTurn(step) || t === 'continue') {
    kmh = CORNER_SPEED_KMH[step.maneuver.modifier ?? '']
  }
  return kmh === undefined ? undefined : (kmh * grip) / 3.6
}

/** Extra time from braking to `vc` and accelerating back, compared with holding speed. */
function cornerLoss(vIn: number, vc: number, vOut: number): number {
  const brake = vIn > vc ? (vIn - vc) ** 2 / (2 * BRAKE * vIn) : 0
  const accel = vOut > vc ? (vOut - vc) ** 2 / (2 * ACCEL * vOut) : 0
  return brake + accel
}

function speedOf(s: Segment): number {
  return s.duration > 0 ? s.distance / s.duration : 0
}

function cumulative(times: number[], scaleTo: number): number[] {
  const sum = times.reduce((a, b) => a + b, 0)
  const k = sum > 0 ? scaleTo / sum : 0
  const out = [0]
  for (const t of times) out.push(out[out.length - 1] + t * k)
  return out
}

/** Per-geometry-segment distance and duration, falling back to splitting steps evenly. */
function segmentsFor(route: OsrmRoute): Segment[] {
  const coords = route.geometry.coordinates
  const ann = route.legs.flatMap((l) => (l.annotation ? l.annotation.distance.map((d, i) => ({ distance: d, duration: l.annotation!.duration[i] })) : []))
  if (ann.length === coords.length - 1 && ann.length > 0) return ann
  // No usable annotation: spread the route evenly over the geometry.
  const n = Math.max(coords.length - 1, 1)
  return Array.from({ length: n }, () => ({ distance: route.distance / n, duration: route.duration / n }))
}

export function compareDrives(route: OsrmRoute, level: WantedLevel): Comparison {
  const i = level - 1
  const mult = LEVELS.speedMultiplier[i]
  const capMs = LEVELS.topSpeedKmh[i] / 3.6
  const grip = LEVELS.cornerGrip[i]
  const gtaSpeed = (v: number) => Math.min(v * mult, capMs)

  const segments = segmentsFor(route)
  const steps = route.legs.flatMap((l) => l.steps)

  // Legal drive: OSRM's free-flow time plus waiting at junctions and turns on city streets.
  const drivingS = segments.reduce((a, s) => a + s.duration, 0)
  let junctionWaitS = 0
  let turnWaitS = 0
  let urbanJunctions = 0
  let urbanTurns = 0

  // GTA drive: same roads, faster, no waiting, physics for the corners.
  let corneringS = 0
  let urbanKm = 0
  let highwayKm = 0

  steps.forEach((step, idx) => {
    const v = speedOf(step)
    const urban = v > 0 && v < URBAN_SPEED_MS
    const junctions = Math.max(step.intersections.length - 1, 0)
    if (urban) {
      urbanJunctions += junctions
      junctionWaitS += junctions * JUNCTION_WAIT_S
      urbanKm += step.distance / 1000
      if (isTurn(step)) {
        urbanTurns++
        turnWaitS += crossesTraffic(step) ? CROSS_TURN_WAIT_S : SAME_SIDE_TURN_WAIT_S
      }
    } else {
      highwayKm += step.distance / 1000
    }

    const vc = cornerSpeedMs(step, grip)
    if (vc !== undefined && idx > 0) {
      const vIn = gtaSpeed(speedOf(steps[idx - 1]))
      const vOut = gtaSpeed(v)
      corneringS += cornerLoss(vIn, vc, vOut)
    }
  })

  // Launch from a standstill and stop at the end.
  if (steps.length) {
    const vStart = gtaSpeed(speedOf(steps[0]))
    const vEnd = gtaSpeed(speedOf(steps[steps.length - 1]))
    corneringS += vStart / (2 * ACCEL) + vEnd / (2 * BRAKE)
  }

  const gtaSegTimes = segments.map((s) => {
    const v = speedOf(s)
    return v > 0 ? s.distance / gtaSpeed(v) : 0
  })
  const cruiseS = gtaSegTimes.reduce((a, b) => a + b, 0)
  const crashes = urbanKm * LEVELS.crashesPerKm[i] + highwayKm * LEVELS.crashesPerKm[i] * 0.3
  const roadblocks = (urbanKm + highwayKm) * LEVELS.roadblocksPerKm[i]
  const crashS = crashes * CRASH_COST_S
  const roadblockS = roadblocks * ROADBLOCK_COST_S

  const carsWeavedPast = segments.reduce((a, s) => {
    const v = speedOf(s)
    if (v <= 0) return a
    const density = v < URBAN_SPEED_MS ? CARS_PER_KM.urban : CARS_PER_KM.highway
    return a + (s.distance / 1000) * density * (1 - v / gtaSpeed(v))
  }, 0)
  const topSpeedKmh = segments.reduce((m, s) => Math.max(m, gtaSpeed(speedOf(s))), 0) * 3.6

  const legalTotal = drivingS + junctionWaitS + turnWaitS
  const gtaTotal = cruiseS + corneringS + crashS + roadblockS

  return {
    distanceM: route.distance,
    legal: {
      totalS: legalTotal,
      timeline: cumulative(segments.map((s) => s.duration), legalTotal),
      drivingS,
      junctionWaitS,
      turnWaitS,
    },
    gta: {
      totalS: gtaTotal,
      timeline: cumulative(gtaSegTimes, gtaTotal),
      cruiseS,
      corneringS,
      crashS,
      roadblockS,
      topSpeedKmh,
    },
    stats: {
      redLightsRun: Math.round(urbanJunctions * RED_LIGHT_SHARE_PER_JUNCTION + urbanTurns * RED_LIGHT_SHARE_PER_TURN),
      carsWeavedPast: Math.round(carsWeavedPast),
      crashes: Math.round(crashes * 10) / 10,
      roadblocks: Math.round(roadblocks * 10) / 10,
    },
  }
}
