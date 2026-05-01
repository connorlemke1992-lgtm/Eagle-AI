import { useState, useEffect, useRef } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Login from './Components/Login'
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

async function getElevationMeters(lat, lng) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`
    )
    const data = await res.json()
    return data.results?.[0]?.elevation || null
  } catch {
    return null
  }
}

// Returns adjusted yardage based on elevation difference
// Rule of thumb: 1 yard adjustment per 3 feet of elevation change
export function adjustYardsForElevation(yards, playerElevM, greenElevM) {
  if (!playerElevM || !greenElevM) return yards
  const diffFeet = (greenElevM - playerElevM) * 3.281
  const adjustment = Math.round(diffFeet / 3)
  return yards + adjustment
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
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
  const [playerElevation, setPlayerElevation] = useState(null)
  const [pinPos, setPinPos] = useState(null)
  const [pinElevation, setPinElevation] = useState(null)
  const [distanceToPin, setDistanceToPin] = useState(null)
  const [shotHistory, setShotHistory] = useState([])
  const [roundHistory, setRoundHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('round_history') || '[]')
    } catch { return [] }
  })
  const [showProfile, setShowProfile] = useState(false)
  const lastHoleSwitch = useRef(null)
  const lastElevationFetch = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

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

  function addShot(shot) {
    setShotHistory(prev => [...prev, shot])
  }

  function finishRound(courseRating, slopeRating) {
    const holeStats = (() => {
      try { return JSON.parse(localStorage.getItem('hole_stats') || '{}') }
      catch { return {} }
    })()

    const totalStrokes = scores.reduce((a, b) => b !== null ? a + b : a, 0)

    const round = {
      id: Date.now(),
      date: new Date().toISOString(),
      course: selectedCourse?.course?.club_name || 'Unknown Course',
      scores: [...scores],
      holeStats,
      shotHistory: [...shotHistory],
      holesPlayed: scores.filter(s => s !== null).length,
      score: totalStrokes,
      courseRating: courseRating || null,
      slope: slopeRating || null,
    }

    const updated = [round, ...roundHistory]
    setRoundHistory(updated)
    localStorage.setItem('round_history', JSON.stringify(updated))

    setScores(new Array(18).fill(null))
    setShotHistory([])
    localStorage.removeItem('hole_stats')
    localStorage.removeItem('visited_holes')
    setCurrentHole(0)
    setActiveTab('stats')
  }

  function clearRound() {
    setScores(new Array(18).fill(null))
    setShotHistory([])
    localStorage.removeItem('hole_stats')
    localStorage.removeItem('visited_holes')
    setCurrentHole(0)
  }

  async function handleSignOut() {
    await signOut(auth)
    setUser(null)
    setShowProfile(false)
  }

  // Watch GPS position + capture device altitude
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPlayerPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        // Use device altitude if available
        if (pos.coords.altitude !== null) {
          setPlayerElevation(pos.coords.altitude)
        }
      },
      null,
      { enableHighAccuracy: true, timeout: 12000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Fetch Google elevation for player if device altitude not available
  useEffect(() => {
    if (!playerPos || playerElevation !== null) return
    const now = Date.now()
    if (lastElevationFetch.current && now - lastElevationFetch.current < 30000) return
    lastElevationFetch.current = now
    getElevationMeters(playerPos.lat, playerPos.lng).then(elev => {
      if (elev !== null) setPlayerElevation(elev)
    })
  }, [playerPos])

  // Fetch pin elevation when pin moves
  useEffect(() => {
    if (!pinPos) return
    getElevationMeters(pinPos.lat, pinPos.lng).then(elev => {
      if (elev !== null) setPinElevation(elev)
    })
  }, [pinPos])

  useEffect(() => {
    if (playerPos && pinPos) {
      setDistanceToPin(haversineYards(
        playerPos.lat, playerPos.lng,
        pinPos.lat, pinPos.lng
      ))
    }
  }, [playerPos, pinPos])

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
      if (dist < closestDist) { closestDist = dist; closestHole = i }
    })

    const now = Date.now()
    if (
      closestDist < 150 && closestHole !== currentHole &&
      (!lastHoleSwitch.current || now - lastHoleSwitch.current > 30000)
    ) {
      setCurrentHole(closestHole)
      lastHoleSwitch.current = now
    }
  }, [playerPos, selectedCourse])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--g1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 48,
            color: '#4db87a', letterSpacing: 2 }}>⛳ Eagle AI</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

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
        <div style={{ display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 4 }}>
          <button onClick={() => setShowProfile(!showProfile)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%',
              background: '#4ade80', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700,
              color: '#1a3a2a' }}>
              {user.displayName?.[0]?.toUpperCase() ||
                user.email?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
              {user.displayName?.split(' ')[0] || 'Golfer'}
            </span>
          </button>
          {distanceToPin && (
            <div style={{ background: '#4ade80', borderRadius: 20,
              padding: '3px 10px', fontSize: 12, color: '#1a3a2a', fontWeight: 700 }}>
              📍 {distanceToPin} yds to pin
            </div>
          )}
        </div>
      </div>

      {/* Profile dropdown */}
      {showProfile && (
        <div style={{ background: 'var(--g1)', padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 13, color: '#fff', marginBottom: 4 }}>
            👋 {user.displayName || 'Golfer'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            {user.email}
          </div>
          <button onClick={handleSignOut}
            style={{ background: '#fee2e2', border: 'none', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', color: '#991b1b',
              fontWeight: 600, fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      )}

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
            playerElevation={playerElevation}
            pinElevation={pinElevation}
          />
        )}
        {activeTab === 'scorecard' && (
          <Scorecard
            scores={scores}
            setScores={setScores}
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
            selectedCourse={selectedCourse}
            onFinishRound={finishRound}
            onClearRound={clearRound}
          />
        )}
        {activeTab === 'stats' && (
          <Stats
            scores={scores}
            shotHistory={shotHistory}
            roundHistory={roundHistory}
            selectedCourse={selectedCourse}
          />
        )}
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
            shotHistory={shotHistory}
            addShot={addShot}
            playerElevation={playerElevation}
            pinElevation={pinElevation}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid var(--bd)',
        display: 'flex', zIndex: 100 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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