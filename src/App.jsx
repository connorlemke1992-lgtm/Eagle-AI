import { useState, useEffect, useRef } from 'react'
import Caddie from './Components/Caddie'
import Scorecard from './Components/Scorecard'
import Stats from './Components/Stats'
import Games from './Components/Games'
import Coach from './Components/Coach'
import HoleView from './Components/HoleView'

const tabs = [
  { id: 'caddie', label: 'Caddie', icon: '🎯' },
  { id: 'scorecard', label: 'Card', icon: '📋' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'games', label: 'Games', icon: '🏆' },
  { id: 'coach', label: 'Coach', icon: '💬' },
  { id: 'map', label: 'Map', icon: '🗺️' },
]

function haversineYards(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.094)
}

export default function App() {
  const [activeTab, setActiveTab] = useState('caddie')
  const [scores, setScores] = useState(new Array(18).fill(null))
  const [currentHole, setCurrentHole] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState(() => {
    try {
      const stored = localStorage.getItem('selected_course')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [showCourseSearch, setShowCourseSearch] = useState(() => {
    try {
      const stored = localStorage.getItem('selected_course')
      return !stored
    } catch { return true }
  })
  const [playerPos, setPlayerPos] = useState(null)
  const [pinPos, setPinPos] = useState(null)
  const [distanceToPin, setDistanceToPin] = useState(null)
  const lastHoleSwitch = useRef(null)

  function handleCourseSelect(data) {
    setSelectedCourse(data)
    if (data) {
      localStorage.setItem('selected_course', JSON.stringify(data))
      setShowCourseSearch(false)
    } else {
      localStorage.removeItem('selected_course')
      setShowCourseSearch(true)
    }
  }

  // Global GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
        setPlayerPos(newPos)
      },
      null,
      { enableHighAccuracy: true, timeout: 12000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Update distance whenever player or pin moves
  useEffect(() => {
    if (playerPos && pinPos) {
      const dist = haversineYards(
        playerPos.lat, playerPos.lng,
        pinPos.lat, pinPos.lng
      )
      setDistanceToPin(dist)
    }
  }, [playerPos, pinPos])

  // Auto hole detection based on GPS
  useEffect(() => {
    if (!playerPos || !selectedCourse) return
    const holes = selectedCourse?.course?.tees?.male?.[0]?.holes ||
                  selectedCourse?.course?.tees?.female?.[0]?.holes || []
    if (holes.length === 0) return
    const courseLat = selectedCourse?.course?.location?.latitude
    const courseLng = selectedCourse?.course?.location?.longitude
    if (!courseLat || !courseLng) return

    const holePositions = holes.map((_, i) => ({
      lat: courseLat + (Math.sin(i * 1.2) * 0.0008),
      lng: courseLng + (Math.cos(i * 1.2) * 0.0008),
    }))

    let closestHole = 0
    let closestDist = Infinity
    holePositions.forEach((pos, i) => {
      const dist = haversineYards(playerPos.lat, playerPos.lng, pos.lat, pos.lng)
      if (dist < closestDist) {
        closestDist = dist
        closestHole = i
      }
    })

    const now = Date.now()
    if (
      closestDist < 150 &&
      closestHole !== currentHole &&
      (!lastHoleSwitch.current || now - lastHoleSwitch.current > 30000)
    ) {
      setCurrentHole(closestHole)
      lastHoleSwitch.current = now
    }
  }, [playerPos, selectedCourse])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--g1)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 26,
            color: '#4db87a', letterSpacing: 1 }}>⛳ Eagle AI</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
            {selectedCourse
              ? `📍 ${selectedCourse.course?.club_name}`
              : 'Your tour-level caddie'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '4px 12px', fontSize: 13, color: '#fff', fontWeight: 600 }}>
            HCP: 14.2
          </div>
          {distanceToPin && (
            <div style={{ background: '#4ade80', borderRadius: 20,
              padding: '3px 10px', fontSize: 12, color: '#1a3a2a', fontWeight: 700 }}>
              📍 {distanceToPin} yds to pin
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 70 }}>
        {activeTab === 'caddie' && (
          <Caddie
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
            selectedCourse={selectedCourse}
            playerPos={playerPos}
            pinPos={pinPos}
            setPinPos={setPinPos}
            distanceToPin={distanceToPin}
          />
        )}
        {activeTab === 'scorecard' && (
          <Scorecard scores={scores} setScores={setScores}
            currentHole={currentHole} setCurrentHole={setCurrentHole} />
        )}
        {activeTab === 'stats' && <Stats scores={scores} />}
        {activeTab === 'games' && <Games />}
        {activeTab === 'coach' && (
          <Coach
            currentHole={currentHole}
            selectedCourse={selectedCourse}
            distanceToPin={distanceToPin}
          />
        )}
        {activeTab === 'map' && (
          <HoleView
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
            onCourseSelect={handleCourseSelect}
            playerPos={playerPos}
            pinPos={pinPos}
            setPinPos={setPinPos}
            distanceToPin={distanceToPin}
            showSearch={showCourseSearch}
            setShowSearch={setShowCourseSearch}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid var(--bd)',
        display: 'flex', zIndex: 100 }}>
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, border: 'none', background: 'transparent',
              padding: '10px 4px', cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 3,
              color: activeTab === tab.id ? 'var(--g2)' : 'var(--tx2)',
              fontWeight: activeTab === tab.id ? 600 : 400 }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}