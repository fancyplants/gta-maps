import { LEVEL_NAMES, type WantedLevel } from '../lib/gtaModel'

interface Props {
  level: WantedLevel
  onChange: (level: WantedLevel) => void
}

export function WantedStars({ level, onChange }: Props) {
  return (
    <div className="wanted">
      <div className="wanted-label">
        Wanted level <span className="wanted-name">{LEVEL_NAMES[level - 1]}</span>
      </div>
      <div className="stars" role="radiogroup" aria-label="Wanted level">
        {([1, 2, 3, 4, 5] as WantedLevel[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === level}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`star ${n <= level ? 'on' : ''}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
