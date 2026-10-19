import type { Comparison, WantedLevel } from '../lib/gtaModel'
import { formatDistance, formatDuration, formatSpeed } from '../lib/format'

interface Props {
  comparison: Comparison
  level: WantedLevel
  racing: boolean
  onStart: () => void
}

export function Results({ comparison: c, level, racing, onStart }: Props) {
  const saved = c.legal.totalS - c.gta.totalS
  const pct = Math.round((saved / c.legal.totalS) * 100)
  return (
    <section className="results">
      <div className="times">
        <div className="time-card legal">
          <div className="time-label">Law-abiding</div>
          <div className="time-value">{formatDuration(c.legal.totalS)}</div>
          <div className="time-sub">{formatDistance(c.distanceM)}</div>
        </div>
        <div className="time-card gta">
          <div className="time-label">
            GTA <span className="mini-stars">{'★'.repeat(level)}</span>
          </div>
          <div className="time-value">{formatDuration(c.gta.totalS)}</div>
          <div className="time-sub">top speed {formatSpeed(c.gta.topSpeedKmh)}</div>
        </div>
      </div>

      <div className="saved">
        You'd save <strong>{formatDuration(saved)}</strong> ({pct}% faster)
      </div>

      <dl className="stats">
        <div>
          <dt>Red lights run</dt>
          <dd>{c.stats.redLightsRun}</dd>
        </div>
        <div>
          <dt>Cars weaved past</dt>
          <dd>{c.stats.carsWeavedPast}</dd>
        </div>
        <div>
          <dt>Expected crashes</dt>
          <dd>{c.stats.crashes}</dd>
        </div>
        <div>
          <dt>Roadblocks</dt>
          <dd>{c.stats.roadblocks}</dd>
        </div>
      </dl>

      <button type="button" className="start" onClick={onStart} disabled={racing}>
        {racing ? 'Mission in progress…' : 'Start mission'}
      </button>

      <details className="breakdown">
        <summary>How these times are worked out</summary>
        <table>
          <tbody>
            <tr className="head">
              <th colSpan={2}>Law-abiding</th>
            </tr>
            <tr>
              <td>Driving at normal speeds</td>
              <td>{formatDuration(c.legal.drivingS)}</td>
            </tr>
            <tr>
              <td>Waiting at junctions</td>
              <td>{formatDuration(c.legal.junctionWaitS)}</td>
            </tr>
            <tr>
              <td>Waiting to turn</td>
              <td>{formatDuration(c.legal.turnWaitS)}</td>
            </tr>
            <tr className="head">
              <th colSpan={2}>GTA</th>
            </tr>
            <tr>
              <td>Flat-out driving</td>
              <td>{formatDuration(c.gta.cruiseS)}</td>
            </tr>
            <tr>
              <td>Braking for corners</td>
              <td>{formatDuration(c.gta.corneringS)}</td>
            </tr>
            <tr>
              <td>Crashes</td>
              <td>{formatDuration(c.gta.crashS)}</td>
            </tr>
            <tr>
              <td>Dodging roadblocks</td>
              <td>{formatDuration(c.gta.roadblockS)}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Both drives follow the same roads. The law-abiding time is OSRM's free-flow estimate plus expected waits at
          city junctions and turns. The GTA time drives each stretch at a multiple of its normal speed (more with each
          star, up to a top speed), never stops, brakes and launches through corners with simple car physics, and pays
          time for expected crashes and, from three stars, police roadblocks. It's for fun, not for real life.
        </p>
      </details>
    </section>
  )
}
