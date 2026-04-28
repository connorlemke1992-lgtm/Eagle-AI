import { useState, useEffect, useRef } from 'react'
import CourseSearch from './CourseSearch'

function haversineYards(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.094)
}

const bag = {
  "Driver":265,"3 Wood":235,"5 Wood":215,"Hybrid":200,
  "4 Iron":190,"5 Iron":177,"6 Iron":164,"7 Iron":151,
  "8 Iron":138,"9 Iron":124,"PW":112,"GW":98,"SW":82,"LW":65
}

function bestClub(yards) {
  return Object.entries(bag)
    .map(([n,d]) => ({n, d, diff: Math.abs(d-yards)}))
    .sort((a,b) => a.diff-b.diff)[0]
}

export default function HoleView({ currentHole, setCurrentHole }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const teeMarkerRef = useRef(null)
  const measureMarkersRef = useRef([])
  const measureLineRef = useRef(null)
  const infoWindowRef = useRef(null)
  const measureStartRef = useRef(null)
  const [tapDist, setTapDist] = useState(null)
  const [tapClub, setTapClub] = useState(null)
  const [courseData, setCourseData] = useState(null)
  const [showSearch, setShowSearch] = useState(true)

  const holes = courseData?.course?.tees?.male?.[0]?.holes ||
                courseData?.course?.tees?.female?.[0]?.holes || []

  const h = holes[currentHole]

  useEffect(() => {
    if (courseData && mapRef.current && !mapInstanceRef.current) {
      loadGoogleMaps()
    }
  }, [courseData])

  useEffect(() => {
    if (mapInstanceRef.current && courseData) {
      moveToHole()
    }
  }, [currentHole])

  function getHoleCoords(holeIndex) {
    const lat = courseData?.course?.location?.latitude
    const lng = courseData?.course?.location?.longitude
    if (lat && lng) {
      // Spread holes around course center since free API
      // doesn't include per-hole GPS
      const offset = 0.0008
      return {
        lat: lat + (Math.sin(holeIndex * 1.2) * offset),
        lng: lng + (Math.cos(holeIndex * 1.2) * offset)
      }
    }
    // Fallback to Pebble Beach
    return { lat: 36.5686, lng: -121.9505 }
  }

  function loadGoogleMaps() {
    if (window.google?.maps) {
      initMap()
      return
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      existing.addEventListener('load', initMap)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }

  function initMap() {
    if (!mapRef.current) return
    const coords = getHoleCoords(currentHole)
    const map = new window.google.maps.Map(mapRef.current, {
      center: coords,
      zoom: 17,
      mapTypeId: 'satellite',
      tilt: 0,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
    mapInstanceRef.current = map
    infoWindowRef.current = new window.google.maps.InfoWindow()
    placeHoleMarkers(map)
    addMapClickListener(map)

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
        if (!mapRef.userMarker) {
          mapRef.userMarker = new window.google.maps.Marker({
            position: userPos,
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#60a5fa',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
            title: 'You'
          })
        } else {
          mapRef.userMarker.setPosition(userPos)
        }
      }, null, { enableHighAccuracy: true })
    }
  }

  function placeHoleMarkers(map) {
    if (pinMarkerRef.current) pinMarkerRef.current.setMap(null)
    if (teeMarkerRef.current) teeMarkerRef.current.setMap(null)

    const coords = getHoleCoords(currentHole)

    // Tee marker — slightly behind pin
    const teeLat = coords.lat + 0.0003
    const teeLng = coords.lng + 0.0003
    teeMarkerRef.current = new window.google.maps.Marker({
      position: { lat: teeLat, lng: teeLng },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: '#333',
        strokeWeight: 2,
      },
      title: 'Tee Box',
      label: {
        text: 'T',
        color: '#333',
        fontSize: '10px',
        fontWeight: 'bold'
      }
    })

    // Pin marker — draggable so player can adjust daily
    pinMarkerRef.current = new window.google.maps.Marker({
      position: coords,
      map,
      draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4ade80',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      title: 'Pin — drag to move flag'
    })
  }

  function addMapClickListener(map) {
    map.addListener('click', (e) => {
      if (!measureStartRef.current) {
        // First tap — set start point
        measureStartRef.current = e.latLng
        measureMarkersRef.current.forEach(m => m.setMap(null))
        measureMarkersRef.current = []
        if (measureLineRef.current) measureLineRef.current.setMap(null)

        const startM = new window.google.maps.Marker({
          position: e.latLng,
          map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#ffcc00',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          }
        })
        measureMarkersRef.current.push(startM)

        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px">
            <div style="font-weight:600;color:#111">Start set ✓</div>
            <div style="font-size:12px;color:#555;margin-top:2px">
              Now tap your target
            </div>
          </div>
        `)
        infoWindowRef.current.open(map, startM)

      } else {
        // Second tap — draw line and show distance
        const dist = haversineYards(
          measureStartRef.current.lat(),
          measureStartRef.current.lng(),
          e.latLng.lat(),
          e.latLng.lng()
        )
        const club = bestClub(dist)

        if (measureLineRef.current) measureLineRef.current.setMap(null)
        measureLineRef.current = new window.google.maps.Polyline({
          path: [measureStartRef.current, e.latLng],
          geodesic: true,
          strokeColor: '#ffcc00',
          strokeOpacity: 0.9,
          strokeWeight: 3,
          map,
        })

        const endM = new window.google.maps.Marker({
          position: e.latLng,
          map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          }
        })
        measureMarkersRef.current.push(endM)

        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:150px">
            <div style="font-size:20px;font-weight:700;color:#111">
              ${dist} yards
            </div>
            <div style="font-size:13px;color:#1a5c33;font-weight:600;margin-top:2px">
              Hit ${club.n} (${club.d}y club)
            </div>
            <div style="font-size:11px;color:#888;margin-top:4px">
              Tap anywhere to measure again
            </div>
          </div>
        `)
        infoWindowRef.current.open(map, endM)

        setTapDist(dist)
        setTapClub(club)
        measureStartRef.current = null
      }
    })
  }

  function moveToHole() {
    const coords = getHoleCoords(currentHole)
    mapInstanceRef.current.panTo(coords)
    mapInstanceRef.current.setZoom(17)
    placeHoleMarkers(mapInstanceRef.current)
    measureMarkersRef.current.forEach(m => m.setMap(null))
    measureMarkersRef.current = []
    if (measureLineRef.current) measureLineRef.current.setMap(null)
    infoWindowRef.current?.close()
    setTapDist(null)
    setTapClub(null)
    measureStartRef.current = null
  }

  if (showSearch) {
    return (
      <CourseSearch onCourseSelect={(data) => {
        setCourseData(data)
        setShowSearch(false)
        mapInstanceRef.current = null
      }} />
    )
  }

  return (
    <div style={{ padding: 16 }}>

      {/* Course name + change button */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 18,
            color: 'var(--tx)' }}>
            {courseData?.course?.club_name || 'Course loaded'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            📍 {courseData?.course?.location?.city}, {courseData?.course?.location?.state}
          </div>
        </div>
        <button onClick={() => {
          setShowSearch(true)
          mapInstanceRef.current = null
          setCourseData(null)
        }}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 12px',
            fontSize: 12, cursor: 'pointer', color: 'var(--tx)' }}>
          Change course
        </button>
      </div>

      {/* Hole nav */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole === 0 ? 0.3 : 1 }}>
          ← Prev
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 20 }}>
            Hole {currentHole + 1}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            Par {h?.par} · {h?.yardage} yds · Hcp {h?.handicap}
          </div>
        </div>
        <button
          onClick={() => setCurrentHole(Math.min(holes.length - 1, currentHole + 1))}
          disabled={currentHole >= holes.length - 1}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole >= holes.length - 1 ? 0.3 : 1 }}>
          Next →
        </button>
      </div>

      {/* Hint */}
      <div style={{ background: 'var(--bg2)', borderRadius: 8,
        padding: '8px 12px', fontSize: 12, color: 'var(--tx2)',
        marginBottom: 10, textAlign: 'center' }}>
        👆 Tap 1 = start · Tap 2 = target · Line shows exact yardage · Drag 🟢 to move pin
      </div>

      {/* Google Map */}
      <div ref={mapRef}
        style={{ width: '100%', height: 380, borderRadius: 12,
          overflow: 'hidden', marginBottom: 12,
          border: '1px solid var(--bd)' }} />

      {/* Distance result */}
      {tapDist && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: '14px 16px', marginBottom: 12, color: '#fff',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Distance
            </div>
            <div style={{ fontSize: 36, fontWeight: 700,
              fontFamily: 'Bebas Neue', letterSpacing: 1 }}>
              {tapDist} yards
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Club
            </div>
            <div style={{ fontSize: 28, fontWeight: 700,
              fontFamily: 'Bebas Neue', color: '#4ade80' }}>
              {tapClub?.n}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
              {tapClub?.d}y club
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#60a5fa', label: 'Your position' },
          { color: '#ffffff', label: 'Tee box' },
          { color: '#4ade80', label: 'Pin (draggable)' },
          { color: '#ffcc00', label: 'Measure start' },
          { color: '#ef4444', label: 'Measure end' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center',
            gap: 6, fontSize: 11, color: 'var(--tx2)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%',
              background: l.color, border: '1px solid #ccc',
              flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}