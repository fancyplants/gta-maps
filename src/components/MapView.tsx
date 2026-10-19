import L from 'leaflet'
import { useEffect } from 'react'
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../lib/osrm'

interface Props {
  from: LatLng | null
  to: LatLng | null
  path: LatLng[]
  gtaCar?: LatLng
  legalCar?: LatLng
  onMapClick: (at: LatLng) => void
}

const blip = (cls: string) => L.divIcon({ className: '', html: `<div class="blip ${cls}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] })
const startIcon = blip('blip-start')
const endIcon = blip('blip-end')
const gtaIcon = blip('blip-gta')

function ClickHandler({ onClick }: { onClick: (at: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function FitToRoute({ path }: { path: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (path.length < 2) return
    const wide = window.innerWidth > 760
    map.fitBounds(L.latLngBounds(path.map((p) => [p.lat, p.lng])), {
      paddingTopLeft: wide ? [420, 40] : [24, 24],
      paddingBottomRight: wide ? [40, 40] : [24, window.innerHeight * 0.45],
    })
  }, [map, path])
  return null
}

export function MapView({ from, to, path, gtaCar, legalCar, onMapClick }: Props) {
  const line = path.map((p) => [p.lat, p.lng] as [number, number])
  return (
    <MapContainer className="map" center={[34.05, -118.3]} zoom={11} zoomControl={false} attributionControl={false}>
      <AttributionControl position="topright" prefix={false} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · Routing <a href="https://project-osrm.org">OSRM</a> · Search <a href="https://photon.komoot.io">Photon</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickHandler onClick={onMapClick} />
      <FitToRoute path={path} />
      {line.length > 1 && (
        <>
          <Polyline positions={line} pathOptions={{ color: '#2a0638', weight: 11, opacity: 0.9 }} />
          <Polyline positions={line} pathOptions={{ color: '#c33cff', weight: 6, opacity: 1 }} />
        </>
      )}
      {from && <Marker position={[from.lat, from.lng]} icon={startIcon} />}
      {to && <Marker position={[to.lat, to.lng]} icon={endIcon} />}
      {legalCar && (
        <CircleMarker center={[legalCar.lat, legalCar.lng]} radius={8} pathOptions={{ color: '#fff', fillColor: '#4da3ff', fillOpacity: 1, weight: 2 }} />
      )}
      {gtaCar && <Marker position={[gtaCar.lat, gtaCar.lng]} icon={gtaIcon} zIndexOffset={1000} />}
    </MapContainer>
  )
}
