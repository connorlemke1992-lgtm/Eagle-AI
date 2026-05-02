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

async function getElevationMeters(lat, lng) {
  try {
    const res = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`)
    const data = await res.json()
    return data.results?.[0]?.elevation || null
  } catch { return null }
}

function adjustYardsForElevation(yards, playerElevM, targetElevM) {
  if (!playerElevM || !targetElevM) return yards
  const diffFeet = (targetElevM - playerElevM) * 3.281
  return yards + Math.round(diffFeet / 3)
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

function getHoleCoordinates(coordinates, holeNumber, selectedTee = 2) {
  if (!coordinates?.length) return null
  const holeCoords = coordinates.filter(c => c.hole === holeNumber)
  if (!holeCoords.length) return null
  const tee = holeCoords.find(c => c.poi === 12 && c.sideFW === selectedTee) ||
              holeCoords.find(c => c.poi === 12 && c.sideFW === 2) ||
              holeCoords.find(c => c.poi === 12)
  const greenCenter = holeCoords.find(c => c.poi === 1 && c.sideFW === 2) ||
                      holeCoords.find(c => c.poi === 1)
  const greenFront = holeCoords.find(c => c.poi === 11)
  const greenBack = holeCoords.find(c => c.poi === 3)
  const hazards = holeCoords.filter(c => c.poi === 9)
  return { tee, greenCenter, greenFront, greenBack, hazards, all: holeCoords }
}

export default function HoleView({ currentHole, setCurrentHole, onCourseSelect,
  playerPos, pinPos, setPinPos, distanceToPin, showSearch, setShowSearch,
  shotHistory = [], addShot, playerElevation, pinElevation }) {

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const teeMarkerRef = useRef(null)
  const playerMarkerRef = useRef(null)
  const frontMarkerRef = useRef(null)
  const backMarkerRef = useRef(null)
  const hazardMarkersRef = useRef([])
  const measureMarkersRef = useRef([])
  const measureLineRef = useRef(null)
  const shotLinesRef = useRef([])
  const shotMarkersRef = useRef([])
  const infoWindowRef = useRef(null)
  const measureStartRef = useRef(null)
  const pinPulseRef = useRef(null)
  const shotModeRef = useRef('idle')
  const distanceLineRef = useRef(null)

  const [tapDist, setTapDist] = useState(null)
  const [tapClub, setTapClub] = useState(null)
  const [tapElevAdj, setTapElevAdj] = useState(null)
  const [courseData, setCourseData] = useState(() => {
    try {
      const stored = localStorage.getItem('selected_course')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [selectedTee, setSelectedTee] = useState(() =>
    parseInt(localStorage.getItem('selected_tee') || '2')
  )
  const [pinPosition, setPinPosition] = useState('middle') // front | middle | back
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [visitedHoles, setVisitedHoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('visited_holes') || '[]') }
    catch { return [] }
  })
  const [shotMode, setShotMode] = useState('idle')
  const [shotStart, setShotStart] = useState(null)
  const [pendingShot, setPendingShot] = useState(null)
  const [showClubPicker, setShowClubPicker] = useState(false)
  const [showShotHistory, setShowShotHistory] = useState(false)
  const [eagleAnalysis, setEagleAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [frontDist, setFrontDist] = useState(null)
  const [midDist, setMidDist] = useState(null)
  const [backDist, setBackDist] = useState(null)
  const bag = loadBag()

  const coordinates = courseData?.course?.coordinates || []
  const holes = courseData?.course?.holes ||
                courseData?.course?.tees?.male?.[0]?.holes ||
                courseData?.course?.tees?.female?.[0]?.holes || []
  const h = holes[currentHole]
  const hYards = h?.yardage || h?.yards || courseData?.course?.chosenTee?.[`length${currentHole + 1}`] || null
  const hPar = h?.par || null
  const hHcp = h?.handicap || h?.hcp || null
  const holeShots = shotHistory.filter(s => s.hole === currentHole + 1)
  const teeLabel = courseData?.course?.selectedTeeLabel || 'Middle'

  const adjustedDistToPin = distanceToPin
    ? adjustYardsForElevation(distanceToPin, playerElevation, pinElevation)
    : null
  const elevDiff = (playerElevation && pinElevation)
    ? Math.round((pinElevation - playerElevation) * 3.281)
    : null

  // Calculate distances to front/mid/back when player moves
  useEffect(() => {
    if (!playerPos || !coordinates.length) return
    const hc = getHoleCoordinates(coordinates, currentHole + 1, selectedTee)
    if (!hc) return
    if (hc.greenFront) {
      setFrontDist(haversineYards(playerPos.lat, playerPos.lng,
        parseFloat(hc.greenFront.latitude), parseFloat(hc.greenFront.longitude)))
    }
    if (hc.greenCenter) {
      setMidDist(haversineYards(playerPos.lat, playerPos.lng,
        parseFloat(hc.greenCenter.latitude), parseFloat(hc.greenCenter.longitude)))
    }
    if (hc.greenBack) {
      setBackDist(haversineYards(playerPos.lat, playerPos.lng,
        parseFloat(hc.greenCenter.latitude), parseFloat(hc.greenCenter.longitude)))
    }
  }, [playerPos, currentHole, coordinates])

  useEffect(() => {
    if (!courseData) return
    if (!visitedHoles.includes(currentHole)) setShowPinPrompt(true)
  }, [currentHole])

  useEffect(() => {
    if (playerMarkerRef.current && playerPos) {
      playerMarkerRef.current.setPosition(playerPos)
    } else if (mapInstanceRef.current && playerPos && !playerMarkerRef.current) {
      playerMarkerRef.current = new window.google.maps.Marker({
        position: playerPos, map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10, fillColor: '#60a5fa', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        }, title: 'You'
      })
    }
    // Update distance line from player to pin
    updateDistanceLine()
  }, [playerPos])

  useEffect(() => {
    if (courseData && mapRef.current && !mapInstanceRef.current && !showSearch) {
      loadGoogleMaps()
    }
  }, [courseData, showSearch])

  useEffect(() => {
    if (mapInstanceRef.current && courseData) moveToHole()
  }, [currentHole])

  useEffect(() => {
    if (mapInstanceRef.current) drawShotLines()
  }, [shotHistory, currentHole])

  function updateDistanceLine() {
    if (!mapInstanceRef.current || !playerPos || !pinPos) return
    if (distanceLineRef.current) distanceLineRef.current.setMap(null)
    distanceLineRef.current = new window.google.maps.Polyline({
      path: [playerPos, pinPos],
      geodesic: true, strokeColor: '#4ade80',
      strokeOpacity: 0.6, strokeWeight: 2,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
        offset: '0', repeat: '15px' }],
      map: mapInstanceRef.current,
    })
  }

  function getGreenCoords(holeIndex) {
    const hc = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (hc?.greenCenter) return {
      lat: parseFloat(hc.greenCenter.latitude),
      lng: parseFloat(hc.greenCenter.longitude)
    }
    const lat = courseData?.course?.location?.latitude
    const lng = courseData?.course?.location?.longitude
    if (lat && lng) return {
      lat: lat + (Math.sin(holeIndex * 1.2) * 0.0008),
      lng: lng + (Math.cos(holeIndex * 1.2) * 0.0008)
    }
    return { lat: 36.5686, lng: -121.9505 }
  }

  function getTeeCoords(holeIndex) {
    const hc = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (hc?.tee) return {
      lat: parseFloat(hc.tee.latitude),
      lng: parseFloat(hc.tee.longitude)
    }
    const green = getGreenCoords(holeIndex)
    return { lat: green.lat + 0.0003, lng: green.lng + 0.0003 }
  }

  function getPinCoords(position, holeIndex) {
    const hc = getHoleCoordinates(coordinates, holeIndex + 1, selectedTee)
    if (hc?.all) {
      const front = hc.greenFront
      const center = hc.greenCenter
      const back = hc.greenBack
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
    setPinPosition(position)
    const coords = getPinCoords(position, currentHole)
    setPinPos(coords)
    if (pinMarkerRef.current) pinMarkerRef.current.setPosition(coords)
    updateDistanceLine()
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
    let scale = 10, growing = true, count = 0
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
    if (!playerPos) { alert('GPS not available'); return }
    setShotStart({ ...playerPos })
    setShotMode('waiting_for_ball')
    shotModeRef.current = 'waiting_for_ball'
  }

  function handleBallIsHere() {
    if (!playerPos || !shotStart) return
    const dist = haversineYards(shotStart.lat, shotStart.lng, playerPos.lat, playerPos.lng)
    const suggested = bestClub(dist, bag)
    setPendingShot({
      hole: currentHole + 1, start: shotStart,
      end: { ...playerPos }, distance: dist,
      suggestedClub: suggested.name, club: suggested.name,
      timestamp: new Date().toISOString(),
    })
    setShotMode('idle')
    shotModeRef.current = 'idle'
    setShotStart(null)
    setShowClubPicker(true)
  }

  function cancelShot() {
    setShotMode('idle')
    shotModeRef.current = 'idle'
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
Was this a good strike? Any quick tip? Plain text only, no markdown.`
          }]
        })
      })
      const data = await res.json()
      setEagleAnalysis(data.content?.[0]?.text || '')
    } catch { setEagleAnalysis('') }
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
      streetViewControl: false, fullscreenControl: false,
      gestureHandling: 'greedy',
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      }
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
        }, title: 'You'
      })
    }
    drawShotLines()
    setTimeout(() => updateDistanceLine(), 500)
  }

  function placeHoleMarkers(map) {
    if (pinMarkerRef.current) pinMarkerRef.current.setMap(null)
    if (teeMarkerRef.current) teeMarkerRef.current.setMap(null)
    if (frontMarkerRef.current) frontMarkerRef.current.setMap(null)
    if (backMarkerRef.current) backMarkerRef.current.setMap(null)
    hazardMarkersRef.current.forEach(m => m.setMap(null))
    hazardMarkersRef.current = []

    const teeCoords = getTeeCoords(currentHole)
    const greenCoords = getGreenCoords(currentHole)
    const hc = getHoleCoordinates(coordinates, currentHole + 1, selectedTee)

    // Tee marker
    teeMarkerRef.current = new window.google.maps.Marker({
      position: teeCoords, map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8, fillColor: '#ffffff', fillOpacity: 1,
        strokeColor: '#333', strokeWeight: 2,
      },
      title: 'Tee Box',
      label: { text: 'T', color: '#333', fontSize: '9px', fontWeight: 'bold' }
    })

    // Pin marker
    pinMarkerRef.current = new window.google.maps.Marker({
      position: greenCoords, map, draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#4ade80', fillOpacity: 1,
        strokeColor: '#fff', strokeWeight: 2,
      },
      title: 'Pin'
    })
    setPinPos({ lat: greenCoords.lat, lng: greenCoords.lng })
    pinMarkerRef.current.addListener('dragend', (e) => {
      setPinPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      updateDistanceLine()
    })

    // Front of green marker
    if (hc?.greenFront) {
      const frontCoords = { lat: parseFloat(hc.greenFront.latitude), lng: parseFloat(hc.greenFront.longitude) }
      frontMarkerRef.current = new window.google.maps.Marker({
        position: frontCoords, map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6, fillColor: '#fbbf24', fillOpacity: 0.9,
          strokeColor: '#fff', strokeWeight: 1,
        },
        title: 'Front of Green',
        label: { text: 'F', color: '#fff', fontSize: '8px', fontWeight: 'bold' }
      })
    }

    // Back of green marker
    if (hc?.greenBack) {
      const backCoords = { lat: parseFloat(hc.greenBack.latitude), lng: parseFloat(hc.greenBack.longitude) }
      backMarkerRef.current = new window.google.maps.Marker({
        position: backCoords, map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6, fillColor: '#f97316', fillOpacity: 0.9,
          strokeColor: '#fff', strokeWeight: 1,
        },
        title: 'Back of Green',
        label: { text: 'B', color: '#fff', fontSize: '8px', fontWeight: 'bold' }
      })
    }

    // Hazards
    if (hc?.hazards?.length) {
      hc.hazards.forEach(hazard => {
        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(hazard.latitude), lng: parseFloat(hazard.longitude) },
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
    map.addListener('click', async (e) => {
      if (shotModeRef.current === 'waiting_for_ball') return

      measureMarkersRef.current.forEach(m => m.setMap(null))
      measureMarkersRef.current = []
      if (measureLineRef.current) measureLineRef.current.setMap(null)

      const refPoint = playerPos || { lat: e.latLng.lat(), lng: e.latLng.lng() }
      const rawDist = haversineYards(
        refPoint.lat, refPoint.lng || refPoint.lng,
        e.latLng.lat(), e.latLng.lng()
      )

      const targetElev = await getElevationMeters(e.latLng.lat(), e.latLng.lng())
      const adjDist = adjustYardsForElevation(rawDist, playerElevation, targetElev)
      const elevAdj = (playerElevation && targetElev)
        ? Math.round((targetElev - playerElevation) * 3.281)
        : null
      const club = bestClub(adjDist, bag)

      // Draw line from player (or tap start) to tapped point
      if (playerPos) {
        measureLineRef.current = new window.google.maps.Polyline({
          path: [playerPos, e.latLng],
          geodesic: true, strokeColor: '#ffcc00',
          strokeOpacity: 0.9, strokeWeight: 2,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
            offset: '0', repeat: '15px' }],
          map,
        })
      }

      const endM = new window.google.maps.Marker({
        position: e.latLng, map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8, fillColor: '#ffcc00', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        }
      })
      measureMarkersRef.current.push(endM)

      infoWindowRef.current.setContent(`
        <div style="font-family:Inter,sans-serif;padding:6px;min-width:140px">
          <div style="font-size:22px;font-weight:800;color:#111;line-height:1">${adjDist}y</div>
          ${elevAdj !== null && elevAdj !== 0 ? `
            <div style="font-size:11px;color:#666;margin-top:2px">
              ${rawDist}y flat · ${elevAdj > 0 ? '+' : ''}${elevAdj}ft
            </div>` : ''}
          <div style="font-size:14px;color:#1a5c33;font-weight:700;margin-top:4px">
            ${club.name}
          </div>
          <div style="font-size:11px;color:#888">${club.yards}y club</div>
        </div>
      `)
      infoWindowRef.current.open(map, endM)
      setTapDist(adjDist)
      setTapClub(club)
      setTapElevAdj(elevAdj)
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
    if (distanceLineRef.current) distanceLineRef.current.setMap(null)
    infoWindowRef.current?.close()
    setTapDist(null)
    setTapClub(null)
    setTapElevAdj(null)
    setShotMode('idle')
    shotModeRef.current = 'idle'
    setShotStart(null)
    drawShotLines()
    setTimeout(() => updateDistanceLine(), 300)
  }

  if (showSearch) {
    return (
      <CourseSearch onCourseSelect={(data) => {
        setCourseData(data)
        onCourseSelect(data)
        if (data?.selectedTee) setSelectedTee(data.selectedTee)
        if (data?.course?.selectedTee) setSelectedTee(data.course.selectedTee)
        setVisitedHoles([])
        localStorage.removeItem('visited_holes')
        mapInstanceRef.current = null
      }} />
    )
  }

  const activeDistToPin = adjustedDistToPin || distanceToPin

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

      {/* Full screen map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Top hole info bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
        background: 'rgba(15,30,20,0.92)', backdropFilter: 'blur(8px)',
        padding: '10px 16px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
            disabled={currentHole === 0}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              color: '#fff', fontSize: 16, opacity: currentHole === 0 ? 0.3 : 1 }}>←</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#fff', lineHeight: 1 }}>
                Hole {currentHole + 1}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                Par {hPar || '—'} · {hYards || '—'} yds
                {hHcp ? ` · Hcp ${hHcp}` : ''}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)',
              marginTop: 2 }}>
              {courseData?.course?.club_name || ''}
            </div>
          </div>

          <button onClick={() => setCurrentHole(Math.min(17, currentHole + 1))}
            disabled={currentHole >= 17}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              color: '#fff', fontSize: 16, opacity: currentHole >= 17 ? 0.3 : 1 }}>→</button>
        </div>
      </div>

      {/* Front / Mid / Back distance selector */}
      {(frontDist || midDist || backDist || playerPos) && (
        <div style={{ position: 'absolute', top: 78, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          display: 'flex', gap: 6 }}>
          {[
            { key: 'front', label: 'Front', dist: frontDist, color: '#fbbf24' },
            { key: 'middle', label: 'Mid', dist: midDist, color: '#4ade80' },
            { key: 'back', label: 'Back', dist: backDist, color: '#f97316' },
          ].map(p => (
            <button key={p.key}
              onClick={() => selectPinPosition(p.key)}
              style={{ background: pinPosition === p.key
                ? 'rgba(74,222,128,0.9)' : 'rgba(15,30,20,0.85)',
                border: pinPosition === p.key ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
                textAlign: 'center', backdropFilter: 'blur(8px)', minWidth: 70 }}>
              <div style={{ fontSize: 10, color: pinPosition === p.key
                ? '#1a3a2a' : 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {p.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800,
                fontFamily: 'Bebas Neue',
                color: pinPosition === p.key ? '#1a3a2a' : (p.dist ? '#fff' : 'rgba(255,255,255,0.3)') }}>
                {p.dist || '—'}
              </div>
              <div style={{ fontSize: 9, color: pinPosition === p.key
                ? '#1a3a2a' : 'rgba(255,255,255,0.4)' }}>yds</div>
            </button>
          ))}
        </div>
      )}

      {/* Pin prompt overlay */}
      {showPinPrompt && (
        <div style={{ position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 20,
          background: 'rgba(15,30,20,0.95)', borderRadius: 16,
          padding: 20, width: 280, backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74,222,128,0.3)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            📍 Where is the pin on Hole {currentHole + 1}?
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
            Select a position — Eagle will place the pin on the actual green
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Front', icon: '⬆️', key: 'front' },
              { label: 'Middle', icon: '🎯', key: 'middle' },
              { label: 'Back', icon: '⬇️', key: 'back' },
            ].map(p => (
              <button key={p.key} onClick={() => selectPinPosition(p.key)}
                style={{ background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '10px 6px', cursor: 'pointer',
                  textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
              </button>
            ))}
          </div>
          <button onClick={dismissPrompt}
            style={{ width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
              padding: '8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Skip — I'll drag the pin manually
          </button>
        </div>
      )}

      {/* Tap distance bubble */}
      {tapDist && (
        <div style={{ position: 'absolute', bottom: 180, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(15,30,20,0.92)', borderRadius: 14,
          padding: '10px 20px', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(74,222,128,0.3)',
          display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase' }}>Distance</div>
            <div style={{ fontSize: 32, fontWeight: 800,
              fontFamily: 'Bebas Neue', color: '#fff', lineHeight: 1 }}>
              {tapDist}y
            </div>
            {tapElevAdj !== null && tapElevAdj !== 0 && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {tapElevAdj > 0 ? `▲ +${tapElevAdj}ft` : `▼ ${tapElevAdj}ft`}
              </div>
            )}
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.15)' }} />
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase' }}>Club</div>
            <div style={{ fontSize: 24, fontWeight: 800,
              fontFamily: 'Bebas Neue', color: '#4ade80', lineHeight: 1 }}>
              {tapClub?.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {tapClub?.yards}y
            </div>
          </div>
          <button onClick={() => setTapDist(null)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Live distance to pin bubble */}
      {activeDistToPin && !tapDist && (
        <div style={{ position: 'absolute', bottom: 180, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(15,30,20,0.92)', borderRadius: 14,
          padding: '8px 20px', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(74,222,128,0.2)',
          textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            To Pin
          </div>
          <div style={{ fontSize: 36, fontWeight: 800,
            fontFamily: 'Bebas Neue', color: '#4ade80', lineHeight: 1 }}>
            {activeDistToPin}y
          </div>
          {elevDiff !== null && elevDiff !== 0 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {elevDiff > 0 ? `▲ ${elevDiff}ft uphill` : `▼ ${Math.abs(elevDiff)}ft downhill`}
            </div>
          )}
        </div>
      )}

      {/* Shot mode banner */}
      {shotMode === 'waiting_for_ball' && (
        <div style={{ position: 'absolute', top: 130, left: 16, right: 16,
          zIndex: 10, background: '#fef3c7', borderRadius: 10,
          padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
            🟡 Shot start marked — walk to your ball
          </div>
        </div>
      )}

      {/* Eagle analysis */}
      {(eagleAnalysis || analysisLoading) && (
        <div style={{ position: 'absolute', top: shotMode === 'waiting_for_ball' ? 185 : 130,
          left: 16, right: 16, zIndex: 10,
          background: 'rgba(15,30,20,0.92)', borderRadius: 12,
          padding: 14, backdropFilter: 'blur(8px)',
          border: '1px solid rgba(74,222,128,0.3)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            🎯 Eagle AI · Shot Analysis
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
            {analysisLoading ? '...' : eagleAnalysis}
          </div>
          <button onClick={() => setEagleAnalysis('')}
            style={{ marginTop: 6, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Club picker overlay */}
      {showClubPicker && pendingShot && (
        <div style={{ position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 20,
          background: 'rgba(15,30,20,0.95)', borderRadius: 16,
          padding: 20, width: 300, backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74,222,128,0.3)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            🏌️ {pendingShot.distance} yards
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
            Was that your {pendingShot.suggestedClub}?
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
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{c.yards}y</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
        zIndex: 10, background: 'rgba(15,30,20,0.92)',
        backdropFilter: 'blur(8px)', padding: '10px 16px' }}>

        {/* Shot tracking */}
        <div style={{ display: 'grid',
          gridTemplateColumns: shotMode === 'waiting_for_ball' ? '1fr 1fr' : '1fr 1fr',
          gap: 8, marginBottom: 8 }}>
          {shotMode === 'idle' ? (
            <>
              <button onClick={handleIJustHit}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none',
                  borderRadius: 10, padding: '10px', cursor: 'pointer',
                  color: '#fff', fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🏌️ I Just Hit
              </button>
              <button onClick={() => setShowDrawer(!showDrawer)}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none',
                  borderRadius: 10, padding: '10px', cursor: 'pointer',
                  color: '#fff', fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                📋 {showDrawer ? 'Hide' : 'More'}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleBallIsHere}
                style={{ background: '#4ade80', border: 'none',
                  borderRadius: 10, padding: '10px', cursor: 'pointer',
                  color: '#1a3a2a', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                📍 Ball is Here
              </button>
              <button onClick={cancelShot}
                style={{ background: '#fee2e2', border: 'none',
                  borderRadius: 10, padding: '10px', cursor: 'pointer',
                  color: '#991b1b', fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                ✕ Cancel
              </button>
            </>
          )}
        </div>

        {/* Drawer */}
        {showDrawer && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setShowPinPrompt(true)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none',
                  borderRadius: 8, padding: '8px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                🟢 Move Pin
              </button>
              <button onClick={() => { onCourseSelect(null); setCourseData(null); mapInstanceRef.current = null }}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none',
                  borderRadius: 8, padding: '8px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                🔄 Change Course
              </button>
            </div>
            {holeShots.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shot History — Hole {currentHole + 1}
                </div>
                {holeShots.map((shot, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '4px 0', fontSize: 12, color: 'rgba(255,255,255,0.7)',
                    borderBottom: i < holeShots.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <span>Shot {i + 1} — {shot.club}</span>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>{shot.distance}y</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)',
              textAlign: 'center', marginTop: 8 }}>
              Tap map to measure · drag 🟢 to move pin
            </div>
          </div>
        )}
      </div>
    </div>
  )
}