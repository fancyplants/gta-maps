import type { Comparison } from '../lib/gtaModel'
import { formatClock, formatDuration } from '../lib/format'

interface Props {
  comparison: Comparison
  onClose: () => void
}

export function MissionPassed({ comparison: c, onClose }: Props) {
  return (
    <div className="mission-overlay" role="dialog" aria-label="Mission passed" onClick={onClose}>
      <div className="mission-banner" onClick={(e) => e.stopPropagation()}>
        <div className="mission-title">mission passed</div>
        <div className="mission-respect">Time saved +{formatDuration(c.legal.totalS - c.gta.totalS)}</div>
        <dl className="mission-stats">
          <div>
            <dt>Your time</dt>
            <dd>{formatClock(c.gta.totalS)}</dd>
          </div>
          <div>
            <dt>Law-abiding time</dt>
            <dd>{formatClock(c.legal.totalS)}</dd>
          </div>
          <div>
            <dt>Red lights run</dt>
            <dd>{c.stats.redLightsRun}</dd>
          </div>
          <div>
            <dt>Cars weaved past</dt>
            <dd>{c.stats.carsWeavedPast}</dd>
          </div>
        </dl>
        <button type="button" className="mission-continue" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  )
}
