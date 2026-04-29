import { useState, useEffect, useRef } from 'react'
import MyBag from './MyBag'

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

export default function Caddie({ currentHole, setCurrentHole, selectedCourse, playerPos, pinPos, distanceToPin }) {
  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('idle')
  const [advice, setAdvice] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [coords, setCoords] = useState(null)
  const [showMyBag, setShowMyBag] = useState(false)
  const [bag, setBag] = useState(loadBag)
  const lastAdvicePosRef = useRef(null)
  const weatherRef = useRef(null)

  // Reload bag when returning from MyBag screen
  function handleBackFromBag() {
    setBag(loadBag())
    setShowMyBag(false)
  }

  if (showMyBag) {
    return <MyBag onBack={handleBackFromBag} />
  }

  const realHoles = selectedCourse?.course?.tees?.male?.[0]?.holes ||
                    selectedCourse?.course?.tees?.female?.[0]?.holes || null
  const h = realHoles ? realHoles[currentHole] : fallbackHoles[currentHole]
  const courseName = selectedCourse?.course?.club_name || null
  const holeYards = realHoles ? h?.yardage : h?.yards
  const holePar = h?.par
  const holeHcp = h?.handicap || h?.hcp
  const holeName = realHoles ? `Hole ${currentHole + 1} at ${courseName}` : h?.name

  const ranked = Object.entries(bag)
    .map(([name, dist]) => ({ name, dist, diff: Math.abs(dist - (distanceToPin || holeYards || 0)) }))
    .sort((a, b) => a.diff - b.diff)

  // Auto-refresh advice when player moves 30+ yards
  useEffect(() => {
    if (!playerPos || !weatherRef.current) return
    if (!lastAdvicePosRef.current) {
      lastAdvicePosRef.current = playerPos
      return
    }
    const movedYards = haversineYards(
      lastAdvicePosRef.current.lat,
      lastAdvicePosRef.current.lng,
      playerPos.lat,
      playerPos.lng
    )
    if (movedYards >= 30) {
      lastAdvicePosRef.current = playerPos
      generateAdvice(weatherRef.current)
    }
  }, [playerPos])

  async function getLocation() {
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        await fetchWeather(c.lat, c.lng)
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  async function fetchWeather(lat, lng) {
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
      await generateAdvice(w)
    } catch {
      setStatus('error')
    }
  }

  async function generateAdvice(w) {
    if (adviceLoading) return
    setAdviceLoading(true)
    setAdvice('')

    const holeContext = courseName
      ? `Hole ${currentHole + 1} at ${courseName} — Par ${holePar}, ${holeYards} yards, Handicap ${holeHcp}`
      : `Hole ${currentHole + 1} — "${h?.name}" (Par ${holePar}, ${holeYards} yards, ${h?.type})`

    const distanceContext = distanceToPin
      ? `Player's current distance to the pin: ${distanceToPin} yards.`
      : `Total hole distance: ${holeYards} yards.`

    const prompt = `You are Eagle, an elite AI golf caddie. Give a short, confident caddie tip (2-3 sentences max) for this exact situation:

${holeContext}

${distanceContext}

LIVE CONDITIONS:
- Wind: ${w.windSpeed} mph from the ${w.windDir}, gusting ${w.windGusts} mph
- Temperature: ${w.temp}°F
- Humidity: ${w.humidity}%
- Rain: ${w.rain ? 'Yes — wet conditions' : 'No'}

Player's exact club distances: ${JSON.stringify(bag)}

Account for wind, temperature and conditions to recommend the exact club and adjusted yardage. Be specific.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setAdvice(data.content?.[0]?.text || 'Could not load advice.')
    } catch {
      setAdvice('Could not connect to AI. Check your internet.')
    }
    setAdviceLoading(false)
  }

  useEffect(() => {
    if (weatherRef.current) generateAdvice(weatherRef.current)
  }, [currentHole, selectedCourse])

  useEffect(() => {
    if (weatherRef.current && distanceToPin) {
      generateAdvice(weatherRef.current)
    }
  }, [pinPos])

  return (
    <div style={{ padding: 16 }}>

      {/* My Bag button */}
      <button onClick={() => setShowMyBag(true)}
        style={{ width: '100%', background: '#fff',
          border: '1px solid var(--bd)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏌️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tx)' }}>
              Stock Yardages
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
              Edit your club distances
            </div>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--tx2)' }}>→</span>
      </button>

      {/* Course banner */}
      {courseName && (
        <div style={{ background: 'var(--g1)', borderRadius: 10,
          padding: '8px 14px', marginBottom: 12, display: 'flex',
          alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⛳</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {courseName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              Hole {currentHole + 1} · Par {holePar} · {holeYards} yds
            </div>
          </div>
        </div>
      )}

      {/* Live distance banner */}
      {distanceToPin && (
        <div style={{ background: '#1a3a2a', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              📍 Live distance to pin
            </div>
            <div style={{ fontSize: 28, fontWeight: 700,
              fontFamily: 'Bebas Neue', color: '#4ade80' }}>
              {distanceToPin} yards
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>Club</div>
            <div style={{ fontSize: 22, fontWeight: 700,
              fontFamily: 'Bebas Neue', color: '#fff' }}>
              {ranked[0]?.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
              {ranked[0]?.dist}y club
            </div>
          </div>
        </div>
      )}

      {/* Hole nav */}
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
            Par {holePar} · {holeYards} yds · {holeName}
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
            Tap below to pull live wind and weather at your exact location.
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
        <div style={{ background: '#fee2e2', borderRadius: 12,
          padding: 16, marginBottom: 12 }}>
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

      {status === 'ready' && weather && (
        <>
          <div style={{ background: 'var(--g1)', borderRadius: 12,
            padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80' }}></div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                fontWeight: 600 }}>Live conditions</div>
              <button onClick={() => coords && fetchWeather(coords.lat, coords.lng)}
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff',
                    marginTop: 2 }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--g1)', borderRadius: 12,
            padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%',
                background: 'var(--g3)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16 }}>🎯</div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Eagle AI Caddie
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {adviceLoading ? 'Updating advice...' : 'Live advice'}
                </div>
              </div>
              {adviceLoading && (
                <div style={{ marginLeft: 'auto', fontSize: 11,
                  color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                  🔄 Recalculating...
                </div>
              )}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.7 }}>
              {adviceLoading ? '...' : advice}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Clubs for this distance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6, marginBottom: 12 }}>
            {ranked.slice(0, 3).map((c, i) => (
              <div key={c.name}
                style={{ background: '#fff',
                  border: i === 0 ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                  {c.dist} yds
                </div>
                <div style={{ fontSize: 10, marginTop: 4, fontWeight: 500,
                  padding: '2px 8px', borderRadius: 10, display: 'inline-block',
                  background: i === 0 ? 'rgba(45,138,84,0.12)' : 'var(--bg2)',
                  color: i === 0 ? 'var(--g2)' : 'var(--tx2)' }}>
                  {i === 0 ? 'Recommended' : 'Alt'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}