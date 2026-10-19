import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type Place } from '../lib/geocode'
import type { LatLng } from '../lib/osrm'

interface Props {
  label: string
  dotClass: string
  value: Place | null
  near?: LatLng
  placeholder: string
  onChange: (place: Place | null) => void
  extra?: React.ReactNode
}

export function PlaceInput({ label, dotClass, value, near, placeholder, onChange, extra }: Props) {
  const [text, setText] = useState(value?.label ?? '')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const typed = useRef(false)

  // Keep the box in sync when the place is set from the map.
  useEffect(() => {
    typed.current = false
    setText(value?.label ?? '')
  }, [value])

  useEffect(() => {
    if (!typed.current || text.trim().length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(text.trim(), near, ctrl.signal)
        .then((r) => {
          setResults(r)
          setActive(0)
          setOpen(true)
        })
        .catch(() => {})
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [text, near])

  const pick = (p: Place) => {
    setOpen(false)
    setResults([])
    onChange(p)
  }

  return (
    <div className="place">
      <span className={`place-dot ${dotClass}`} aria-hidden />
      <div className="place-field">
        <label>
          <span className="sr-only">{label}</span>
          <input
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
              typed.current = true
              setText(e.target.value)
              if (!e.target.value) onChange(null)
            }}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (!open || !results.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => (a + 1) % results.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => (a - 1 + results.length) % results.length)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                pick(results[active])
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
        </label>
        {open && results.length > 0 && (
          <ul className="suggestions" role="listbox">
            {results.map((r, i) => (
              <li
                key={`${r.lat},${r.lng},${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(r)
                }}
              >
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {extra}
    </div>
  )
}
