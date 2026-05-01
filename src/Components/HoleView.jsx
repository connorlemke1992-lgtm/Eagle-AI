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

function loadBag() {
  try {
    const stored = localStorage.getItem('my_bag')
    if (stored) {
      const arr = JSON.parse(stored)
      return arr.map(c => ({ name: c.name, yards: c.yards }))
    }
  } catch {}
  return [
    { name: 'Driver', yards: 265 }, { name: '3 Wood', yards: 235 },
    { name: '5 Wood', yards: 215 }, { name: 'Hybrid', yards: 200 },
    { name: '4 Iron', yards: 190 }, { name: '5 Iron', yards: 177 },
    { name: '6 Iron', yards: 164 }, { name: '7 Iron', yards: 151 },
    { name: '8 Iron', yards: 138 }, { name: '9 Iron', yards: 124 },
    { name: 'PW', yards: 112 }, { name: 'GW', yards: 98 },
    { name: 'SW', yards: 82 }, { name: 'LW', yards: 65 },
  ]
}

function bestClub(yards, bag) {
  return bag.reduce((best, club) =>
    Math.abs(club.yards - yards) < Math.abs(best.yards - yards) ? club : best
  )
}

// GolfAPI poi mapping confirmed from real data:
// poi 12 = tee box (sideFW: 1=back, 2=middle, 3=forward)
// poi 1  = green center
// poi 11 = front of green
// poi 3  = back of green
// poi 9  = hazard
// poi 2  = fairway point
function getHoleCoordinates(coordinates, holeNumber, selectedTee = 2) {
  if (!coordinates || !coordinates.length) return null
  const holeCoords = coordinates.filter(c => c.hole === holeNumber)
  if (!holeCoords.length) return null

  const tee = holeCoords.find(c => c.poi === 12 && c.sideFW === selectedTee) ||
              holeCoords.find(c => c.poi === 12 && c.sideFW === 2) ||
              holeCoords.find(c => c.poi === 12)

  const greenCenter = holeCoords.find(c => c.poi === 1 && c.sideFW === 2) ||
                      holeCoords.find(c => c.poi === 1) ||
                      holeCoords.find(c => c.poi === 11) ||
                      holeCoords.find(c => c.poi === 3)

  const hazards = holeCoords.filter(c => c.poi === 9)

  return { tee, greenCenter, hazards, all: holeCoords }
}

export default function HoleView({ currentHole, setCurrentHole, onCourseSelect,
  playerPos, pinPos, setPinPos, distanceToPin, showSearch, setShowSearch,
  shotHistory = [], addShot }) {

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const teeMarkerRef = useRef(null)
  const playerMarkerRef = useRef(null)
  const hazardMarkersRef = useRef([])
  const measureMarkersRef = useRef([])
  const measureLineRef = useRef(null)
  const shotLinesRef = useRef([])
  const shotMarkersRef = useRef([])
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
  const [selectedTee, setSelectedTee] = useState(() => {
    return parseInt(localStorage.getItem('selected_tee') || '2')
  })
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [visitedHoles, setVisitedHoles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('visited_holes') || '[]')
    } catch { return [] }
  })
  const [shotMode, setShotMode] = useState('idle')
  const [shotStart, setShotStart] = useState(null)
  const [pendingShot, setPendingShot] = useState(null)
  const [showClubPicker, setShowClubPicker] = useState(false)
  const [showShotHistory, setShowShotHistory] = useState(false)
  const [eagleAnalysis, setEagleAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const bag = loadBag()

  const holes = courseData?.course?.tees?.male?.[0]?.holes ||
                courseData?.course?.tees?.female?.[0]?.holes || []
  const h = holes[currentHole]
  const coordinates = courseData?.course?.coordinates || []
  const holeShots = shotHistory.filter(s => s.hole === currentHole + 1)
  const teeLabel = courseData?.selectedTeeLabel ||
    (selectedTee === 1 ? 'Back' : selectedTee === 3 ? 'Forward' : 'Middle')

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

  useEffect(() => {
    if (mapInstanceRef.current) {
      drawShotLines()
    }
  }, [shotHistory, currentHole])

  function getGreenCoords(holeIndex) {
    const realCoords = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (realCoords?.greenCenter) {
      return {
        lat: parseFloat(realCoords.greenCenter.latitude),
        lng: parseFloat(realCoords.greenCenter.longitude)
      }
    }
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

  function getTeeCoords(holeIndex) {
    const realCoords = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (realCoords?.tee) {
      return {
        lat: parseFloat(realCoords.tee.latitude),
        lng: parseFloat(realCoords.tee.longitude)
      }
    }
    const green = getGreenCoords(holeIndex)
    return { lat: green.lat + 0.0003, lng: green.lng + 0.0003 }
  }

  function getPinOffset(position, holeIndex) {
    const realCoords = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (realCoords?.all) {
      const front = realCoords.all.find(c => c.poi === 11)
      const center = realCoords.all.find(c => c.poi === 1)
      const back = realCoords.all.find(c => c.poi === 3)
      if (position === 'front' && front)
        return { lat: parseFloat(front.latitude), lng: parseFloat(front.longitude) }
      if (position === 'middle' && center)
        return { lat: parseFloat(center.latitude), lng: parseFloat(center.longitude) }
      if (position === 'back' && back)
        return { lat: parseFloat(back.latitude), lng: parseFloat(back.longitude) }
    }
    const green = getGreenCoords(holeIndex)
    const offsets = {
      front: { lat: green.lat - 0.0001, lng: green.lng },
      middle: green,
      back: { lat: green.lat + 0.0001, lng: green.lng },
    }
    return offsets[position] || green
  }

  function selectPinPosition(position) {
    const coords = getPinOffset(position, currentHole)
    setPinPos(coords)
    if (pinMarkerRef.current) pinMarkerRef.current.setPosition(coords)
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

  function drawShotLines() {
    shotLinesRef.current.forEach(l => l.setMap(null))
    shotMarkersRef.current.forEach(m => m.setMap(null))
    shotLinesRef.current = []
    shotMarkersRef.current = []

    holeShots.forEach((shot, i) => {
      if (!shot.start || !shot.end) return
      const line = new window.google.maps.Polyline({
        path: [shot.start, shot.end],
        geodesic: true, strokeColor: '#f59e0b',
        strokeOpacity: 0.9, strokeWeight: 3,
        map: mapInstanceRef.current,
      })
      shotLinesRef.current.push(line)

      const startM = new window.google.maps.Marker({
        position: shot.start, map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7, fillColor: '#f59e0b', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        },
        label: { text: String(i + 1), color: '#fff', fontSize: '9px', fontWeight: 'bold' }
      })
      shotMarkersRef.current.push(startM)

      const endM = new window.google.maps.Marker({
        position: shot.end, map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7, fillColor: '#ef4444', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        }
      })
      shotMarkersRef.current.push(endM)
    })
  }

  function handleIJustHit() {
    if (!playerPos) {
      alert('GPS not available — make sure location is enabled')
      return
    }
    setShotStart({ ...playerPos })
    setShotMode('waiting_for_ball')
  }

  function handleBallIsHere() {
    if (!playerPos || !shotStart) return
    const dist = haversineYards(
      shotStart.lat, shotStart.lng,
      playerPos.lat, playerPos.lng
    )
    const suggested = bestClub(dist, bag)
    setPendingShot({
      hole: currentHole + 1,
      start: shotStart,
      end: { ...playerPos },
      distance: dist,
      suggestedClub: suggested.name,
      club: suggested.name,
      timestamp: new Date().toISOString(),
    })
    setShotMode('idle')
    setShotStart(null)
    setShowClubPicker(true)
  }

  function cancelShot() {
    setShotMode('idle')
    setShotStart(null)
  }

  async function confirmShot(clubName) {
    const shot = { ...pendingShot, club: clubName }
    addShot(shot)
    setShowClubPicker(false)
    setPendingShot(null)
    await analyzeShot(shot)
  }

  async function analyzeShot(shot) {
    setAnalysisLoading(true)
    setEagleAnalysis('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `You are Eagle, an elite golf caddie. Give a 1-2 sentence reaction to this shot:
Hole ${shot.hole}, hit ${shot.club} for ${shot.distance} yards.
Stock distance for ${shot.club}: ${bag.find(b => b.name === shot.club)?.yards || '?'} yards.
Was this a good strike? Any quick tip for the next shot? Plain text only, no markdown.`
          }]
        })
      })
      const data = await res.json()
      setEagleAnalysis(data.content?.[0]?.text || '')
    } catch {
      setEagleAnalysis('')
    }
    setAnalysisLoading(false)
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
    const teeCoords = getTeeCoords(currentHole)
    const map = new window.google.maps.Map(mapRef.current, {
      center: teeCoords, zoom: 17, mapTypeId: 'satellite', tilt: 0,
      zoomControl: true, mapTypeControl: false,
      streetViewControl: false, fullscreenControl: true,
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
    drawShotLines()
  }

  function placeHoleMarkers(map) {
    if (pinMarkerRef.current) pinMarkerRef.current.setMap(null)
    if (teeMarkerRef.current) teeMarkerRef.current.setMap(null)
    hazardMarkersRef.current.forEach(m => m.setMap(null))
    hazardMarkersRef.current = []

    const teeCoords = getTeeCoords(currentHole)
    const greenCoords = getGreenCoords(currentHole)

    // Tee box — white dot with T label
    teeMarkerRef.current = new window.google.maps.Marker({
      position: teeCoords, map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#ffffff', fillOpacity: 1,
        strokeColor: '#333', strokeWeight: 2,
      },
      title: `Tee Box (${teeLabel})`,
      label: { text: 'T', color: '#333', fontSize: '10px', fontWeight: 'bold' }
    })

    // Pin — green dot on green center
    pinMarkerRef.current = new window.google.maps.Marker({
      position: greenCoords, map, draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#4ade80', fillOpacity: 1,
        strokeColor: '#fff', strokeWeight: 2,
      },
      title: 'Pin — drag to move flag'
    })
    setPinPos({ lat: greenCoords.lat, lng: greenCoords.lng })
    pinMarkerRef.current.addListener('dragend', (e) => {
      setPinPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })

    // Hazards — red dots
    const holeCoords = getHoleCoordinates(coordinates, currentHole + 1, selectedTee)
    if (holeCoords?.hazards?.length) {
      holeCoords.hazards.forEach(hazard => {
        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(hazard.latitude),
            lng: parseFloat(hazard.longitude)
          },
          map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6, fillColor: '#ef4444', fillOpacity: 0.8,
            strokeColor: '#fff', strokeWeight: 1,
          },
          title: 'Hazard'
        })
        hazardMarkersRef.current.push(marker)
      })
    }

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
        const club = bestClub(dist, bag)
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
              Hit ${club.name} (${club.yards}y club)
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
    const teeCoords = getTeeCoords(currentHole)
    mapInstanceRef.current.panTo(teeCoords)
    mapInstanceRef.current.setZoom(17)
    placeHoleMarkers(mapInstanceRef.current)
    measureMarkersRef.current.forEach(m => m.setMap(null))
    measureMarkersRef.current = []
    if (measureLineRef.current) measureLineRef.current.setMap(null)
    infoWindowRef.current?.close()
    setTapDist(null)
    setTapClub(null)
    measureStartRef.current = null
    setShotMode('idle')
    setShotStart(null)
    drawShotLines()
  }

  if (showSearch) {
    return (
      <CourseSearch onCourseSelect={(data) => {
        setCourseData(data)
        onCourseSelect(data)
        if (data?.selectedTee) setSelectedTee(data.selectedTee)
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
            {coordinates.length > 0
              ? 'Select a position — Eagle will place the pin on the actual green'
              : 'Select a position or drag the 🟢 pin on the map'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Front', icon: '⬆️', desc: 'Front of green' },
              { label: 'Middle', icon: '🎯', desc: 'Center of green' },
              { label: 'Back', icon: '⬇️', desc: 'Back of green' },
            ].map(p => (
              <button key={p.label}
                onClick={() => selectPinPosition(p.label.toLowerCase())}
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

      {/* Club picker */}
      {showClubPicker && pendingShot && (
        <div style={{ background: 'var(--g1)', borderRadius: 14,
          padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            🏌️ Shot logged — {pendingShot.distance} yards
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
            Was that your {pendingShot.suggestedClub}? ({bag.find(b => b.name === pendingShot.suggestedClub)?.yards}y club)
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => confirmShot(pendingShot.suggestedClub)}
              style={{ flex: 1, background: '#4ade80', border: 'none',
                borderRadius: 10, padding: '12px', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, color: '#1a3a2a' }}>
              ✅ Yes, {pendingShot.suggestedClub}
            </button>
            <button onClick={() => setPendingShot(p => ({ ...p, showAllClubs: true }))}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '12px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, color: '#fff' }}>
              ✏️ Change
            </button>
          </div>
          {pendingShot.showAllClubs && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {bag.map(c => (
                <button key={c.name} onClick={() => confirmShot(c.name)}
                  style={{ background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
                    textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                    {c.yards}y
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Eagle shot analysis */}
      {(eagleAnalysis || analysisLoading) && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              background: 'var(--g3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14 }}>🎯</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Eagle AI · Shot Analysis
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
            {analysisLoading ? '...' : eagleAnalysis}
          </div>
          <button onClick={() => setEagleAnalysis('')}
            style={{ marginTop: 8, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Shot tracking */}
      <div style={{ display: 'grid',
        gridTemplateColumns: shotMode === 'waiting_for_ball' ? '1fr 1fr' : '1fr',
        gap: 8, marginBottom: 12 }}>
        {shotMode === 'idle' && (
          <button onClick={handleIJustHit}
            style={{ background: 'var(--g1)', border: 'none',
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏌️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>I Just Hit</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  Tap to mark shot start
                </div>
              </div>
            </div>
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        )}
        {shotMode === 'waiting_for_ball' && (
          <>
            <button onClick={handleBallIsHere}
              style={{ background: '#4ade80', border: 'none',
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, color: '#1a3a2a', fontWeight: 700, fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              Ball is Here
            </button>
            <button onClick={cancelShot}
              style={{ background: '#fee2e2', border: 'none',
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, color: '#991b1b', fontWeight: 600, fontSize: 13 }}>
              ✕ Cancel
            </button>
          </>
        )}
      </div>

      {shotMode === 'waiting_for_ball' && (
        <div style={{ background: '#fef3c7', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
            🟡 Shot start marked — walk to your ball then tap "Ball is Here"
          </div>
        </div>
      )}

      {/* Shot history */}
      {holeShots.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowShotHistory(!showShotHistory)}
            style={{ width: '100%', background: '#fff',
              border: '1px solid var(--bd)', borderRadius: 10,
              padding: '10px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)' }}>
                  Shot History — Hole {currentHole + 1}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                  {holeShots.length} shot{holeShots.length !== 1 ? 's' : ''} tracked
                </div>
              </div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--tx2)' }}>
              {showShotHistory ? '▲' : '▼'}
            </span>
          </button>
          {showShotHistory && (
            <div style={{ background: '#fff', border: '1px solid var(--bd)',
              borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
              {holeShots.map((shot, i) => (
                <div key={i} style={{ padding: '10px 14px',
                  borderBottom: i < holeShots.length - 1 ? '1px solid var(--bd)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--g1)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, color: '#fff',
                      fontWeight: 700 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{shot.club}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                        {shot.distance} yards
                        {bag.find(b => b.name === shot.club) && (
                          <span style={{ marginLeft: 6,
                            color: shot.distance >= bag.find(b => b.name === shot.club).yards * 0.95
                              ? '#166534' : '#991b1b' }}>
                            ({shot.distance >= bag.find(b => b.name === shot.club).yards * 0.95
                              ? 'Solid' : 'Short'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx2)' }}>Shot {i + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course header */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--tx)' }}>
            {courseData?.course?.club_name || 'Course loaded'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            📍 {courseData?.course?.location?.city}, {courseData?.course?.location?.state}
            {coordinates.length > 0 && (
              <span style={{ color: 'var(--g2)', fontWeight: 600 }}>· Real GPS ✅</span>
            )}
            <span style={{ background: 'var(--bg2)', borderRadius: 6,
              padding: '1px 6px', fontWeight: 600 }}>
              {teeLabel} Tees
            </span>
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

      {/* Live distance */}
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

      {/* Move Pin */}
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
            Par {h?.par || '—'} · {h?.yardage || h?.yards || '—'} yds ·
            Hcp {h?.handicap || h?.hcp || '—'}
          </div>
        </div>
        <button onClick={() => setCurrentHole(Math.min((holes.length || 18) - 1, currentHole + 1))}
          disabled={currentHole >= (holes.length || 18) - 1}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole >= (holes.length || 18) - 1 ? 0.3 : 1 }}>Next →</button>
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: 8,
        padding: '8px 12px', fontSize: 12, color: 'var(--tx2)',
        marginBottom: 10, textAlign: 'center' }}>
        👆 Tap 1 = start · Tap 2 = target · Drag 🟢 pin · 🔵 = you · 🟡 = shots
        {coordinates.length > 0 && ' · 🔴 = hazards'}
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
              fontFamily: 'Bebas Neue', color: '#4ade80' }}>{tapClub?.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
              {tapClub?.yards}y club
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#60a5fa', label: 'Your position' },
          { color: '#ffffff', label: 'Tee box' },
          { color: '#4ade80', label: 'Pin (draggable)' },
          { color: '#f59e0b', label: 'Shot line' },
          { color: '#ffcc00', label: 'Measure start' },
          { color: '#ef4444', label: 'Measure end' },
          ...(coordinates.length > 0 ? [{ color: '#ef4444', label: 'Hazards' }] : []),
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