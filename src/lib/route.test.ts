import { expect, it } from 'vitest'
import { positionAt } from './route'

const coords = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 10 },
  { lat: 10, lng: 10 },
]

it('interpolates between timeline points', () => {
  expect(positionAt(coords, [0, 10, 30], 5)).toEqual({ lat: 0, lng: 5 })
  expect(positionAt(coords, [0, 10, 30], 20)).toEqual({ lat: 5, lng: 10 })
})

it('clamps to the ends', () => {
  expect(positionAt(coords, [0, 10, 30], -1)).toEqual(coords[0])
  expect(positionAt(coords, [0, 10, 30], 99)).toEqual(coords[2])
})
