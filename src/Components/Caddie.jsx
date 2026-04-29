import { useState, useEffect } from 'react'

const holes = [
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

const bag = {
  "Driver":265,"3 Wood":235,"5 Wood":215,"Hybrid":200,
  "4 Iron":190,"5 Iron":177,"6 Iron":164,"7 Iron":151,
  "8 Iron":138,"9 Iron":124,"PW":112,"GW":98,"SW":82,"LW":65
}

function degreesToCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export default function Caddie({ currentHole, setCurrentHole }) {
  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('idle')
  const [advice, setAdvice] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)

  const h = holes[currentHole]

  async function getLocation() {
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await fetchWeather(pos.coords.latitude, pos.coords.longitude)
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
        windDeg: Math.round(c.wind_direction_10m),
        windGusts: Math.round(c.wind_gusts_10m),
        temp: Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        rain: c.precipitation > 0,
      }
      setWeather(w)
      setStatus('ready')
      await generateAdvice(w)
    } catch {
      setStatus('error')
    }
  }

  async function generateAdvice(w) {
    setAdviceLoading(true)
    setAdvice('')
    const hole = holes[currentHole]
    const prompt = `You are Eagle, an elite AI golf caddie. Give a short, confident caddie tip (2-3 sentences max) for this exact situation:

Hole ${currentHole + 1} — "${hole.name}" (Par ${hole.par}, ${hole.yards} yards, ${hole.type})

LIVE CONDITIONS RIGHT NOW:
- Wind: ${w.windSpeed} mph from the ${w.windDir}, gusting ${w.windGusts} mph
- Temperature: ${w.temp}°F
- Humidity: ${w.humidity}%
- Rain: ${w.rain ? 'Yes — wet conditions' : 'No'}

Player bag distances: ${JSON.stringify(bag)}

Tell them: what club to hit, and one key thing to watch for in this wind.`

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
          model: 'claude-sonnet-4-20250514',
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
    if (weather) generateAdvice(weather)
  }, [currentHole])

  const ranked = Object.entries(bag)
    .map(([name, dist]) => ({ name, dist, diff: Math.abs(dist - h.yards) }))
    .sort((a, b) => a.diff - b.diff)

  return (
    <div style={{ padding: 16 }}>

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
            Par {h.par} · {h.yards} yds · {h.name}
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
            No manual inputs needed.
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
              <button onClick={() => fetchWeather(0, 0)}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.6)',
                  fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
                ↻ Refresh
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 8 }}>
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
                  {adviceLoading ? 'Thinking...' : 'Live advice'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.7 }}>
              {adviceLoading ? '...' : advice}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            marginBottom: 8 }}>
            Clubs for this hole
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