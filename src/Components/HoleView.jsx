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

export default function HoleView({ currentHole, setCurrentHole, onCourseSelect, playerPos, pinPos, setPinPos, distanceToPin, showSearch, setShowSearch }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const teeMarkerRef = useRef(null)
  const playerMarkerRef = useRef(null)
  const measureMarkersRef = useRef([])
  const measureLineRef = useRef(null)
  const infoWindowRef = useRef(null)
  const measureStartRef = useRef(null)
  const pinPulseRef = useRef(null)
  const [tapDist, setTapDist] = useState(null)
  const [tapClub, setTapClub] = useState(null)
  const [courseData, setCourseData] = useState(() => {
    try {
      const stored = localStorage.getItem('selected_course')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [visitedHoles, setVisitedHoles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('visited_holes') || '[]')
    } catch { return [] }
  })

  const holes = courseData?.course?.tees?.male?.[0]?.holes ||
                courseData?.course?.tees?.female?.[0]?.holes || []
  const h = holes[currentHole]

  useEffect(() => {
    if (!courseData) return
    if (!visitedHoles.includes(currentHole)) {
      setShowPinPrompt(true)
    }
  }, [currentHole])

  useEffect(() => {
    if (playerMarkerRef.current && playerPos) {
      playerMarkerRef.current.setPosition(playerPos)
    } else if (mapInstanceRef.current && playerPos && !playerMarkerRef.current) {
      playerMarkerRef.current = new window.google.maps.Marker({
        position: playerPos,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10, fillColor: '#60a5fa', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        },
        title: 'You'
      })
    }
  }, [playerPos])

  useEffect(() => {
    if (courseData && mapRef.current && !mapInstanceRef.current && !showSearch) {
      loadGoogleMaps()
    }
  }, [courseData, showSearch])

  useEffect(() => {
    if (mapInstanceRef.current && courseData) {
      moveToHole()
    }
  }, [currentHole])

  function getHoleCoords(holeIndex) {
    const lat = courseData?.course?.location?.latitude
    const lng = courseData?.course?.location?.longitude
    if (lat && lng) {
      return {
        lat: lat + (Math.sin(holeIndex * 1.2) * 0.0008),
        lng: lng + (Math.cos(holeIndex * 1.2) * 0.0008)
      }
    }
    return { lat: 36.5686, lng: -121.9505 }
  }

  function getPinOffset(position, holeIndex) {
    const coords = getHoleCoords(holeIndex)
    const offsets = {
      front: { lat: coords.lat - 0.0001, lng: coords.lng },
      middle: { lat: coords.lat, lng: coords.lng },
      back: { lat: coords.lat + 0.0001, lng: coords.lng },
    }
    return offsets[position] || coords
  }

  function selectPinPosition(position) {
    const coords = getPinOffset(position, currentHole)
    setPinPos(coords)
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setPosition(coords)
    }
    const updated = [...new Set([...visitedHoles, currentHole])]
    setVisitedHoles(updated)
    localStorage.setItem('visited_holes', JSON.stringify(updated))
    setShowPinPrompt(false)
  }

  function dismissPrompt() {
    const updated = [...new Set([...visitedHoles, currentHole])]
    setVisitedHoles(updated)
    localStorage.setItem('visited_holes', JSON.stringify(updated))
    setShowPinPrompt(false)
  }

  function startPinPulse() {
    if (!pinMarkerRef.current || !mapInstanceRef.current) return
    let scale = 10
    let growing = true
    let count = 0
    if (pinPulseRef.current) clearInterval(pinPulseRef.current)
    const interval = setInterval(() => {
      if (count > 20) {
        clearInterval(interval)
        pinMarkerRef.current?.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10, fillColor: '#4ade80', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        })
        return
      }
      scale = growing ? scale + 1 : scale - 1
      if (scale >= 16) growing = false
      if (scale <= 10) { growing = true; count++ }
      pinMarkerRef.current?.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale, fillColor: '#4ade80',
        fillOpacity: growing ? 0.8 : 1,
        strokeColor: '#fff', strokeWeight: 2,
      })
    }, 100)
    pinPulseRef.current = interval
  }

  function loadGoogleMaps() {
    if (window.google?.maps) { initMap(); return }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) { existing.addEventListener('load', initMap); return }
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
    if (playerPos) {
      playerMarkerRef.current = new window.google.maps.Marker({
        position: playerPos, map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10, fillColor: '#60a5fa', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        },
        title: 'You'
      })
    }
  }

  function placeHoleMarkers(map) {
    if (pinMarkerRef.current) pinMarkerRef.current.setMap(null)
    if (teeMarkerRef.current) teeMarkerRef.current.setMap(null)
    const coords = getHoleCoords(currentHole)
    const teeLat = coords.lat + 0.0003
    const teeLng = coords.lng + 0.0003
    teeMarkerRef.current = new window.google.maps.Marker({
      position: { lat: teeLat, lng: teeLng }, map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#ffffff', fillOpacity: 1,
        strokeColor: '#333', strokeWeight: 2,
      },
      title: 'Tee Box',
      label: { text: 'T', color: '#333', fontSize: '10px', fontWeight: 'bold' }
    })
    pinMarkerRef.current = new window.google.maps.Marker({
      position: coords, map, draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#4ade80', fillOpacity: 1,
        strokeColor: '#fff', strokeWeight: 2,
      },
      title: 'Pin — drag to move flag'
    })
    setPinPos({ lat: coords.lat, lng: coords.lng })
    pinMarkerRef.current.addListener('dragend', (e) => {
      setPinPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })
    setTimeout(() => startPinPulse(), 500)
  }

  function addMapClickListener(map) {
    map.addListener('click', (e) => {
      if (!measureStartRef.current) {
        measureStartRef.current = e.latLng
        measureMarkersRef.current.forEach(m => m.setMap(null))
        measureMarkersRef.current = []
        if (measureLineRef.current) measureLineRef.current.setMap(null)
        const startM = new window.google.maps.Marker({
          position: e.latLng, map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9, fillColor: '#ffcc00', fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 2,
          }
        })
        measureMarkersRef.current.push(startM)
        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px">
            <div style="font-weight:600;color:#111">Start set ✓</div>
            <div style="font-size:12px;color:#555;margin-top:2px">Now tap your target</div>
          </div>
        `)
        infoWindowRef.current.open(map, startM)
      } else {
        const dist = haversineYards(
          measureStartRef.current.lat(), measureStartRef.current.lng(),
          e.latLng.lat(), e.latLng.lng()
        )
        const club = bestClub(dist)
        if (measureLineRef.current) measureLineRef.current.setMap(null)
        measureLineRef.current = new window.google.maps.Polyline({
          path: [measureStartRef.current, e.latLng],
          geodesic: true, strokeColor: '#ffcc00',
          strokeOpacity: 0.9, strokeWeight: 3, map,
        })
        const endM = new window.google.maps.Marker({
          position: e.latLng, map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9, fillColor: '#ef4444', fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 2,
          }
        })
        measureMarkersRef.current.push(endM)
        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:150px">
            <div style="font-size:20px;font-weight:700;color:#111">${dist} yards</div>
            <div style="font-size:13px;color:#1a5c33;font-weight:600;margin-top:2px">
              Hit ${club.n} (${club.d}y club)
            </div>
            <div style="font-size:11px;color:#888;margin-top:4px">Tap anywhere to measure again</div>
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
        onCourseSelect(data)
        setVisitedHoles([])
        localStorage.removeItem('visited_holes')
        mapInstanceRef.current = null
      }} />
    )
  }

  return (
    <div style={{ padding: 16 }}>

      {/* Pin placement prompt */}
      {showPinPrompt && (
        <div style={{ background: 'var(--g1)', borderRadius: 14,
          padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            📍 Where is the pin on Hole {currentHole + 1}?
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
            Select a position or drag the 🟢 pin on the map for exact placement
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Front', icon: '⬆️', desc: 'Front of green' },
              { label: 'Middle', icon: '🎯', desc: 'Center of green' },
              { label: 'Back', icon: '⬇️', desc: 'Back of green' },
            ].map(p => (
              <button key={p.label} onClick={() => selectPinPosition(p.label.toLowerCase())}
                style={{ background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '10px 6px', cursor: 'pointer',
                  textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)',
                  marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={dismissPrompt}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
              padding: '8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Skip — I'll drag the pin manually
          </button>
        </div>
      )}

      {/* Course header */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--tx)' }}>
            {courseData?.course?.club_name || 'Course loaded'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            📍 {courseData?.course?.location?.city}, {courseData?.course?.location?.state}
          </div>
        </div>
        <button onClick={() => {
          onCourseSelect(null)
          setCourseData(null)
          mapInstanceRef.current = null
        }}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 12px',
            fontSize: 12, cursor: 'pointer', color: 'var(--tx)' }}>
          Change course
        </button>
      </div>

      {/* Live distance banner */}
      {distanceToPin && (
        <div style={{ background: 'var(--g1)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%',
              background: '#4ade80' }} />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Live distance to pin
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700,
            fontFamily: 'Bebas Neue', color: '#4ade80' }}>
            {distanceToPin} yds
          </div>
        </div>
      )}

      {/* Move Pin button */}
      <button onClick={() => setShowPinPrompt(true)}
        style={{ width: '100%', background: '#fff',
          border: '1px solid var(--bd)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🟢</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)' }}>
              Move Pin
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
              Change today's flag position
            </div>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--tx2)' }}>→</span>
      </button>

      {/* Hole nav */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole === 0 ? 0.3 : 1 }}>← Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 20 }}>
            Hole {currentHole + 1}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            Par {h?.par} · {h?.yardage} yds · Hcp {h?.handicap}
          </div>
        </div>
        <button onClick={() => setCurrentHole(Math.min(holes.length - 1, currentHole + 1))}
          disabled={currentHole >= holes.length - 1}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole >= holes.length - 1 ? 0.3 : 1 }}>Next →</button>
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: 8,
        padding: '8px 12px', fontSize: 12, color: 'var(--tx2)',
        marginBottom: 10, textAlign: 'center' }}>
        👆 Tap 1 = start · Tap 2 = target · Drag 🟢 pin to move flag · 🔵 = you
      </div>

      <div ref={mapRef}
        style={{ width: '100%', height: 380, borderRadius: 12,
          overflow: 'hidden', marginBottom: 12,
          border: '1px solid var(--bd)' }} />

      {tapDist && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: '14px 16px', marginBottom: 12, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>Distance</div>
            <div style={{ fontSize: 36, fontWeight: 700,
              fontFamily: 'Bebas Neue', letterSpacing: 1 }}>{tapDist} yards</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>Club</div>
            <div style={{ fontSize: 28, fontWeight: 700,
              fontFamily: 'Bebas Neue', color: '#4ade80' }}>{tapClub?.n}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{tapClub?.d}y club</div>
          </div>
        </div>
      )}

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
              background: l.color, border: '1px solid #ccc', flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}