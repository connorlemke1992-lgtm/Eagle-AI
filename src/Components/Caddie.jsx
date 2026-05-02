import { useState, useEffect, useRef } from 'react'
import MyBag from './MyBag'
import Handicap from './Handicap'

const fallbackHoles = [
  {par:4,yards:412,hcp:7,name:"The Opener",type:"Dogleg Right"},
  {par:5,yards:531,hcp:3,name:"The Long Walk",type:"Straight"},
  {par:3,yards:178,hcp:15,name:"Carry or Die",type:"Island Green"},
  {par:4,yards:387,hcp:11,name:"Risk & Reward",type:"Dogleg Left"},
  {par:4,yards:445,hcp:1,name:"The Beast",type:"Long Par 4"},
  {par:3,yards:152,hcp:17,name:"The Dip",type:"Downhill"},
  {par:5,yards:568,hcp:5,name:"Snake Run",type:"Double Dogleg"},
  {par:4,yards:398,hcp:9,name:"Fairway Wide",type:"Straight"},
  {par:4,yards:421,hcp:13,name:"The Climb",type:"Uphill"},
  {par:4,yards:403,hcp:8,name:"Turn Here",type:"Dogleg"},
  {par:5,yards:544,hcp:2,name:"Eagle Alley",type:"Par 5"},
  {par:3,yards:169,hcp:16,name:"The Mirror",type:"Water Left"},
  {par:4,yards:415,hcp:10,name:"The Elbow",type:"Dogleg Right"},
  {par:4,yards:462,hcp:4,name:"The Grind",type:"Straight"},
  {par:3,yards:195,hcp:14,name:"Tough Carry",type:"Long Par 3"},
  {par:5,yards:552,hcp:6,name:"Eagle's Nest",type:"Risk/Reward"},
  {par:4,yards:391,hcp:12,name:"Driveable?",type:"Short Par 4"},
  {par:4,yards:437,hcp:18,name:"The Closer",type:"Finishing"},
]

const defaultBag = {
  "Driver":265,"3 Wood":235,"5 Wood":215,"Hybrid":200,
  "4 Iron":190,"5 Iron":177,"6 Iron":164,"7 Iron":151,
  "8 Iron":138,"9 Iron":124,"PW":112,"GW":98,"SW":82,"LW":65
}

function degreesToCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

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
      return Object.fromEntries(arr.map(c => [c.name, c.yards]))
    }
  } catch {}
  return defaultBag
}

function loadShotShape() {
  return localStorage.getItem('shot_shape') || 'fade'
}

function getScoreContext(scores, holes) {
  const played = scores.filter(s => s !== null)
  if (played.length === 0) return null
  const totalStrokes = played.reduce((a, b) => a + b, 0)
  const totalPar = holes.slice(0, played.length).reduce((a, h) => a + (h?.par || 4), 0)
  const diff = totalStrokes - totalPar
  if (diff <= -2) return 'Player is playing great — 2+ under par. Play aggressive.'
  if (diff === -1) return 'Player is 1 under par. Stay aggressive but smart.'
  if (diff === 0) return 'Player is even par. Play your game, take calculated risks.'
  if (diff <= 2) return 'Player is 1-2 over par. Play smart, avoid bogey makers.'
  if (diff <= 5) return 'Player is 3-5 over par. Play conservative, minimize mistakes.'
  return 'Player is struggling. Play safe, focus on bogey golf.'
}

function drawPuttLine(canvas, img, puttData) {
  const ctx = canvas.getContext('2d')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)
  const w = canvas.width
  const h = canvas.height
  const breakDir = puttData.breakDirection || 'straight'
  const breakAmount = puttData.breakAmount || 'slight'
  const startX = puttData.startX || 0.5
  const startY = puttData.startY || 0.85
  const endX = puttData.endX || 0.5
  const endY = puttData.endY || 0.15
  const sx = startX * w
  const sy = startY * h
  const ex = endX * w
  const ey = endY * h
  const breakOffset = breakAmount === 'significant' ? 0.35
    : breakAmount === 'moderate' ? 0.25 : 0.15
  const midX = (sx + ex) / 2
  const midY = (sy + ey) / 2
  let cpx = midX, cpy = midY
  if (breakDir === 'left') { cpx = midX - (w * breakOffset); cpy = midY }
  else if (breakDir === 'right') { cpx = midX + (w * breakOffset); cpy = midY }
  else if (breakDir === 'left-to-right') { cpx = midX + (w * breakOffset); cpy = midY + (h * 0.1) }
  else if (breakDir === 'right-to-left') { cpx = midX - (w * breakOffset); cpy = midY + (h * 0.1) }
  else { cpx = midX + (w * 0.02); cpy = midY }
  ctx.shadowColor = '#4ade80'
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(cpx, cpy, ex, ey)
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = Math.max(w * 0.008, 4)
  ctx.lineCap = 'round'
  ctx.setLineDash([])
  ctx.stroke()
  const angle = Math.atan2(ey - cpy, ex - cpx)
  const arrowSize = Math.max(w * 0.025, 12)
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - arrowSize * Math.cos(angle - Math.PI/6), ey - arrowSize * Math.sin(angle - Math.PI/6))
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - arrowSize * Math.cos(angle + Math.PI/6), ey - arrowSize * Math.sin(angle + Math.PI/6))
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = Math.max(w * 0.006, 3)
  ctx.stroke()
  ctx.shadowColor = '#fff'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(sx, sy, Math.max(w * 0.015, 8), 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.font = `bold ${Math.max(w * 0.025, 14)}px Inter, sans-serif`
  ctx.fillStyle = '#4ade80'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 8
  ctx.textAlign = 'center'
  ctx.fillText('Aim here', ex, ey - Math.max(w * 0.02, 12))
  ctx.shadowBlur = 0
}

function EagleVision({ onClose, bag, weather, distanceToPin,
  currentHole, holePar, holeYards, courseName }) {
  const [mode, setMode] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [photoData, setPhotoData] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [puttData, setPuttData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showLine, setShowLine] = useState(false)
  const fileRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    if (puttData && photo && canvasRef.current && imgRef.current && showLine) {
      const img = imgRef.current
      if (img.complete) drawPuttLine(canvasRef.current, img, puttData)
      else img.onload = () => drawPuttLine(canvasRef.current, img, puttData)
    }
  }, [puttData, showLine])

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setPuttData(null)
    setAnalysis('')
    setShowLine(false)
    const reader = new FileReader()
    reader.onload = () => setPhotoData(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  async function analyzePhoto() {
    if (!photoData) return
    setLoading(true)
    setAnalysis('')
    setPuttData(null)
    setShowLine(false)

    const liePrompt = `You are Eagle, an elite PGA-level golf caddie analyzing a photo of a golfer's ball and lie.
Analyze this image and provide:
1. Type of lie
2. Recommended club
3. Key shot adjustment
4. One specific tip
Context: Hole ${currentHole + 1}${courseName ? ` at ${courseName}` : ''} — Par ${holePar}, ${holeYards} yards
${distanceToPin ? `Distance to pin: ${distanceToPin} yards` : ''}
${weather ? `Wind: ${weather.windSpeed} mph from ${weather.windDir}` : ''}
Player bag: ${JSON.stringify(bag)}
Keep response under 80 words. Plain text only, no markdown.`

    const puttPrompt = `You are Eagle, an elite PGA-level golf caddie analyzing a photo of a putt.
Respond with ONLY a JSON object:
{
  "analysis": "2-3 sentence putting advice",
  "breakDirection": "left" or "right" or "straight" or "left-to-right" or "right-to-left",
  "breakAmount": "slight" or "moderate" or "significant",
  "startX": 0.5,
  "startY": 0.85,
  "endX": 0.5,
  "endY": 0.15,
  "aimPoint": "description of where to aim"
}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photoData } },
              { type: 'text', text: mode === 'lie' ? liePrompt : puttPrompt }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      if (mode === 'putt') {
        try {
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
          setAnalysis(parsed.analysis || text)
          setPuttData(parsed)
          setShowLine(true)
        } catch { setAnalysis(text) }
      } else {
        setAnalysis(text)
      }
    } catch { setAnalysis('Could not analyze photo. Please try again.') }
    setLoading(false)
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onClose}
        style={{ border: '1px solid var(--bd)', borderRadius: 8,
          background: '#fff', padding: '6px 14px', cursor: 'pointer',
          fontSize: 13, marginBottom: 16 }}>← Back</button>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 26, marginBottom: 4 }}>
        📸 Eagle Vision
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 20 }}>
        AI-powered shot and putt analysis
      </div>
      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setMode('lie')}
            style={{ background: 'var(--g1)', border: 'none', borderRadius: 14,
              padding: '20px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 40 }}>⛳</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Analyze My Lie
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Take a photo of your ball position. Eagle will read your lie and recommend the right shot.
              </div>
            </div>
          </button>
          <button onClick={() => setMode('putt')}
            style={{ background: 'var(--g1)', border: 'none', borderRadius: 14,
              padding: '20px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 40 }}>🎯</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Read My Putt
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Take a photo showing your ball and the hole. Eagle reads the break and draws the putt line.
              </div>
            </div>
          </button>
        </div>
      )}
      {mode && (
        <div>
          <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
              {mode === 'lie' ? '⛳ Lie Analysis' : '🎯 Putt Line Reader'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {mode === 'lie'
                ? 'Take a photo showing your ball and the ground around it clearly.'
                : 'Get low and take a photo showing your ball AND the hole in the same frame.'}
            </div>
          </div>
          {photo && (
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <img ref={imgRef} src={photo} alt="Golf" style={{ display: 'none' }} crossOrigin="anonymous" />
              {showLine && puttData ? (
                <div>
                  <canvas ref={canvasRef}
                    style={{ width: '100%', borderRadius: 12, border: '2px solid #4ade80', display: 'block' }} />
                  <div style={{ background: 'var(--g1)', borderRadius: 8, padding: '8px 12px', marginTop: 8,
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 3, background: '#4ade80', borderRadius: 2 }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                      {puttData.breakDirection === 'straight'
                        ? 'Straight putt — aim at center of hole'
                        : `Breaking ${puttData.breakDirection} — ${puttData.breakAmount} break`}
                    </div>
                  </div>
                </div>
              ) : (
                <img src={photo} alt="Golf shot"
                  style={{ width: '100%', borderRadius: 12, maxHeight: 300,
                    objectFit: 'cover', border: '1px solid var(--bd)', display: 'block' }} />
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', background: photo ? '#fff' : 'var(--g1)',
              border: photo ? '1px solid var(--bd)' : 'none',
              borderRadius: 12, padding: '14px', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, marginBottom: 12,
              color: photo ? 'var(--tx)' : '#fff' }}>
            {photo ? '📸 Retake Photo' : '📸 Take Photo'}
          </button>
          {photo && !loading && !analysis && (
            <button onClick={analyzePhoto}
              style={{ width: '100%', background: '#4ade80', border: 'none',
                borderRadius: 12, padding: '14px', cursor: 'pointer',
                fontWeight: 700, fontSize: 15, color: '#1a3a2a', marginBottom: 12 }}>
              {mode === 'putt' ? '🎯 Read Putt & Draw Line' : '🎯 Analyze with Eagle AI'}
            </button>
          )}
          {loading && (
            <div style={{ background: 'var(--g1)', borderRadius: 12,
              padding: 16, textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                {mode === 'putt' ? '🔍 Eagle is reading the break...' : '🔍 Eagle is analyzing your lie...'}
              </div>
            </div>
          )}
          {analysis && (
            <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--g3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎯</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Eagle AI · {mode === 'lie' ? 'Lie Analysis' : 'Putt Read'}
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7 }}>
                {analysis}
              </div>
              {puttData?.aimPoint && (
                <div style={{ marginTop: 10, padding: '8px 12px',
                  background: 'rgba(74,222,128,0.15)', borderRadius: 8,
                  border: '1px solid rgba(74,222,128,0.3)' }}>
                  <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>
                    🎯 Aim Point: {puttData.aimPoint}
                  </div>
                </div>
              )}
              <button onClick={() => { setAnalysis(''); setPhoto(null); setPhotoData(null); setPuttData(null); setShowLine(false) }}
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', border: 'none',
                  borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                📸 Analyze Another
              </button>
            </div>
          )}
          <button onClick={() => { setMode(null); setPhoto(null); setPhotoData(null); setAnalysis(''); setPuttData(null); setShowLine(false) }}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, color: 'var(--tx2)' }}>
            ← Choose different mode
          </button>
        </div>
      )}
    </div>
  )
}

export default function Caddie({ currentHole, setCurrentHole, selectedCourse,
  playerPos, pinPos, setPinPos, distanceToPin, playerElevation, scores = [] }) {

  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('idle')
  const [advice, setAdvice] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [coords, setCoords] = useState(null)
  const [showMyBag, setShowMyBag] = useState(false)
  const [showHandicap, setShowHandicap] = useState(false)
  const [showEagleVision, setShowEagleVision] = useState(false)
  const [bag, setBag] = useState(loadBag)
  const [mapLoaded, setMapLoaded] = useState(false)
  const lastAdvicePosRef = useRef(null)
  const weatherRef = useRef(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const playerMarkerRef = useRef(null)
  const autoRefreshRef = useRef(null)

  function handleBackFromBag() {
    setBag(loadBag())
    setShowMyBag(false)
  }

  const realHoles = selectedCourse?.course?.holes ||
                    selectedCourse?.course?.tees?.male?.[0]?.holes ||
                    selectedCourse?.course?.tees?.female?.[0]?.holes || null
  const h = realHoles ? realHoles[currentHole] : fallbackHoles[currentHole]
  const courseName = selectedCourse?.course?.club_name || null
  const holeYards = h?.yardage || h?.yards
  const holePar = h?.par

  const ranked = Object.entries(bag)
    .map(([name, dist]) => ({ name, dist,
      diff: Math.abs(dist - (distanceToPin || holeYards || 0)) }))
    .sort((a, b) => a.diff - b.diff)

  const recommendedClub = ranked[0]

  useEffect(() => {
    if (status !== 'ready' || !coords) return
    autoRefreshRef.current = setInterval(() => {
      fetchWeather(coords.lat, coords.lng, false)
    }, 15000)
    return () => clearInterval(autoRefreshRef.current)
  }, [status, coords])

  useEffect(() => {
    if (!playerPos || !weatherRef.current) return
    if (!lastAdvicePosRef.current) {
      lastAdvicePosRef.current = playerPos
      return
    }
    const movedYards = haversineYards(
      lastAdvicePosRef.current.lat, lastAdvicePosRef.current.lng,
      playerPos.lat, playerPos.lng
    )
    if (movedYards >= 30) {
      lastAdvicePosRef.current = playerPos
      generateAdvice(weatherRef.current)
    }
    if (mapInstanceRef.current && playerPos) {
      if (!playerMarkerRef.current) {
        playerMarkerRef.current = new window.google.maps.Marker({
          position: playerPos, map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10, fillColor: '#60a5fa', fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 2,
          }, title: 'You'
        })
      } else {
        playerMarkerRef.current.setPosition(playerPos)
      }
    }
  }, [playerPos])

  useEffect(() => {
    if (weatherRef.current) generateAdvice(weatherRef.current)
  }, [currentHole, selectedCourse])

  useEffect(() => {
    if (weatherRef.current && distanceToPin) generateAdvice(weatherRef.current)
  }, [pinPos])

  useEffect(() => {
    if (selectedCourse && mapRef.current && !mapInstanceRef.current) loadMiniMap()
  }, [selectedCourse, mapLoaded])

  useEffect(() => {
    if (mapInstanceRef.current && selectedCourse) moveMiniMap()
  }, [currentHole])

  if (showMyBag) return <MyBag onBack={handleBackFromBag} />
  if (showHandicap) return <Handicap onBack={() => setShowHandicap(false)} />
  if (showEagleVision) return (
    <EagleVision
      onClose={() => setShowEagleVision(false)}
      bag={bag}
      weather={weather}
      distanceToPin={distanceToPin}
      currentHole={currentHole}
      holePar={holePar}
      holeYards={holeYards}
      courseName={courseName}
    />
  )

  function getHoleCoords(holeIndex) {
    const lat = selectedCourse?.course?.location?.latitude
    const lng = selectedCourse?.course?.location?.longitude
    if (lat && lng) {
      return {
        lat: lat + (Math.sin(holeIndex * 1.2) * 0.0008),
        lng: lng + (Math.cos(holeIndex * 1.2) * 0.0008)
      }
    }
    return { lat: 36.5686, lng: -121.9505 }
  }

  function loadMiniMap() {
    if (window.google?.maps) { initMiniMap(); return }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) { existing.addEventListener('load', initMiniMap); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`
    script.async = true
    script.onload = initMiniMap
    document.head.appendChild(script)
  }

  function initMiniMap() {
    if (!mapRef.current) return
    const c = getHoleCoords(currentHole)
    const map = new window.google.maps.Map(mapRef.current, {
      center: c, zoom: 17, mapTypeId: 'satellite', tilt: 0,
      zoomControl: false, mapTypeControl: false,
      streetViewControl: false, fullscreenControl: false,
      gestureHandling: 'none',
    })
    mapInstanceRef.current = map
    pinMarkerRef.current = new window.google.maps.Marker({
      position: c, map, draggable: true,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: '#4ade80', fillOpacity: 1,
        strokeColor: '#fff', strokeWeight: 2,
      }, title: 'Pin'
    })
    setPinPos({ lat: c.lat, lng: c.lng })
    pinMarkerRef.current.addListener('dragend', (e) => {
      setPinPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })
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
  }

  function moveMiniMap() {
    const c = getHoleCoords(currentHole)
    mapInstanceRef.current.panTo(c)
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setPosition(c)
      setPinPos({ lat: c.lat, lng: c.lng })
    }
  }

  async function getLocation() {
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        await fetchWeather(c.lat, c.lng, true)
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  async function fetchWeather(lat, lng, showAdvice = true) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      const c = data.current
      const w = {
        windSpeed: Math.round(c.wind_speed_10m),
        windDir: degreesToCardinal(c.wind_direction_10m),
        windGusts: Math.round(c.wind_gusts_10m),
        temp: Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        rain: c.precipitation > 0,
      }
      setWeather(w)
      weatherRef.current = w
      setStatus('ready')
      if (showAdvice) await generateAdvice(w)
    } catch { setStatus('error') }
  }

  async function generateAdvice(w) {
    if (adviceLoading) return
    setAdviceLoading(true)
    setAdvice('')

    const shotShape = loadShotShape()
    const altitudeFt = (playerElevation || 1600) * 3.281
    const altitudeBonus = ((altitudeFt / 1000) * 2).toFixed(1)
    const tempEffect = w.temp < 70 ? ((70 - w.temp) / 10 * -1).toFixed(1) : '+0'
    const humidityEffect = w.humidity < 40 ? '+1' : w.humidity > 80 ? '-1' : '+0'
    const greenFirmness = w.rain
      ? 'soft — ball will stop quickly, less rollout'
      : w.temp > 85
        ? 'firm and fast — plan for significant rollout'
        : 'normal conditions'

    const holesArr = realHoles || fallbackHoles
    const scoreContext = getScoreContext(scores, holesArr)

    const holeContext = courseName
      ? `Hole ${currentHole + 1} at ${courseName} — Par ${holePar}, ${holeYards} yards`
      : `Hole ${currentHole + 1} — Par ${holePar}, ${holeYards} yards`

    const distanceContext = distanceToPin
      ? `Player is ${distanceToPin} yards from the pin.`
      : `Full hole distance: ${holeYards} yards.`

    // Wind effect on shot shape
    const windShapeNote = shotShape === 'fade'
      ? `Player hits a fade (left to right). Wind from ${w.windDir} will ${w.windDir.includes('W') ? 'amplify' : 'reduce'} the fade effect.`
      : shotShape === 'draw'
        ? `Player hits a draw (right to left). Wind from ${w.windDir} will ${w.windDir.includes('E') ? 'amplify' : 'reduce'} the draw effect.`
        : `Player hits it straight.`

    const prompt = `You are Eagle, an elite AI golf caddie. Give exactly 2 sentences of caddie advice — no more.

${holeContext}
${distanceContext}
${scoreContext ? scoreContext : ''}

CONDITIONS:
Wind: ${w.windSpeed} mph from ${w.windDir}, gusting ${w.windGusts} mph
Temperature: ${w.temp}°F (distance effect: ${tempEffect}%)
Humidity: ${w.humidity}% (distance effect: ${humidityEffect}%)
Altitude: ${Math.round(altitudeFt)}ft above sea level (distance bonus: +${altitudeBonus}%)
Green firmness: ${greenFirmness}
Shot shape: ${shotShape} — ${windShapeNote}
Player bag: ${JSON.stringify(bag)}

RULES:
- Sentence 1: Name the exact club and net adjusted yardage accounting for ALL conditions (wind + altitude + temp + humidity)
- Sentence 2: One specific tip based on shot shape, wind direction, and green firmness
- No markdown, no asterisks, plain text only
- Maximum 2 sentences, no exceptions`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setAdvice(data.content?.[0]?.text || 'Could not load advice.')
    } catch { setAdvice('Could not connect to AI.') }
    setAdviceLoading(false)
  }

  return (
    <div style={{ padding: 16 }}>

      <button onClick={() => setShowMyBag(true)}
        style={{ width: '100%', background: '#fff',
          border: '1px solid var(--bd)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏌️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)' }}>
              Stock Yardages
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
              Edit clubs · set shot shape
            </div>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--tx2)' }}>→</span>
      </button>

      <button onClick={() => setShowHandicap(true)}
        style={{ width: '100%', background: '#fff',
          border: '1px solid var(--bd)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)' }}>My Handicap</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>WHS handicap index tracker</div>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--tx2)' }}>→</span>
      </button>

      <button onClick={() => setShowEagleVision(true)}
        style={{ width: '100%', background: 'var(--g1)',
          border: 'none', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📸</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Eagle Vision</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              AI lie & putt line analysis
            </div>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>→</span>
      </button>

      {courseName && (
        <div style={{ background: 'var(--g1)', borderRadius: 10,
          padding: '8px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⛳</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{courseName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                Hole {currentHole + 1} · Par {holePar} · {holeYards} yds
              </div>
            </div>
          </div>
          {status === 'ready' && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
              Live
            </div>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div style={{ background: 'var(--g1)', borderRadius: 14,
          padding: '16px', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '14px 10px', textAlign: 'center',
            border: '2px solid #4ade80' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Hit This
            </div>
            <div style={{ fontSize: 32, fontWeight: 800,
              fontFamily: 'Bebas Neue', color: '#4ade80', letterSpacing: 1 }}>
              {recommendedClub?.name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {recommendedClub?.dist}y club
            </div>
          </div>
          {distanceToPin && (
            <div style={{ background: 'rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase' }}>To Pin</div>
              <div style={{ fontSize: 28, fontWeight: 700,
                fontFamily: 'Bebas Neue', color: '#fff' }}>
                {distanceToPin}y
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'ready' && weather && (
        <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Live conditions
            </div>
            <button onClick={() => coords && fetchWeather(coords.lat, coords.lng, false)}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.6)',
                fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
              ↻ Refresh
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { icon: '💨', label: 'Wind', val: weather.windSpeed + ' mph' },
              { icon: '🧭', label: 'From', val: weather.windDir },
              { icon: '🌡', label: 'Temp', val: weather.temp + '°F' },
              { icon: '💧', label: 'Humid', val: weather.humidity + '%' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>{s.icon}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              background: 'var(--g3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14 }}>🎯</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Eagle AI · {adviceLoading ? 'Thinking...' : 'Live advice'}
            </div>
            {adviceLoading && (
              <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                🔄
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
            {adviceLoading ? '...' : advice}
          </div>
        </div>
      )}

      {selectedCourse && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Hole Map · Drag 🟢 to move pin
          </div>
          <div ref={(el) => {
            mapRef.current = el
            if (el && !mapInstanceRef.current) setMapLoaded(true)
          }}
            style={{ width: '100%', height: 200, borderRadius: 12,
              overflow: 'hidden', border: '1px solid var(--bd)' }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
          disabled={currentHole === 0}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole === 0 ? 0.3 : 1 }}>← Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22 }}>
            Hole {currentHole + 1}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            Par {holePar} · {holeYards} yds
          </div>
        </div>
        <button onClick={() => setCurrentHole(Math.min(17, currentHole + 1))}
          disabled={currentHole === 17}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            opacity: currentHole === 17 ? 0.3 : 1 }}>Next →</button>
      </div>

      {status === 'idle' && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: 20, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>
            Enable live conditions
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13,
            marginBottom: 14, lineHeight: 1.5 }}>
            Tap below to pull live wind and weather. Auto-refreshes every 15 seconds.
          </div>
          <button onClick={getLocation}
            style={{ background: 'var(--g3)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontWeight: 600,
              fontSize: 14, cursor: 'pointer' }}>
            Get live conditions
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: 20, textAlign: 'center', marginBottom: 12, color: '#fff' }}>
          🌦 Reading your location and live weather...
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: '#fee2e2', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
            Could not get location
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 10 }}>
            Make sure location is enabled in your browser settings.
          </div>
          <button onClick={getLocation}
            style={{ background: '#991b1b', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Alternatives
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)',
            gap: 6, marginBottom: 12 }}>
            {ranked.slice(1, 3).map((c) => (
              <div key={c.name} style={{ background: '#fff',
                border: '1px solid var(--bd)', borderRadius: 10,
                padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                  {c.dist} yds
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}