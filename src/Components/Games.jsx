import { useState } from 'react'

const gamesList = [
  { id: 'skins', icon: '💀', name: 'Skins',
    desc: 'Win a hole outright, take the pot. Ties carry over.' },
  { id: 'stableford', icon: '⭐', name: 'Stableford',
    desc: 'Points per hole relative to par. Most points wins.' },
  { id: 'match', icon: '⚔️', name: 'Match Play',
    desc: 'Head to head, hole by hole. Most holes won takes it.' },
  { id: 'nassau', icon: '🏆', name: 'Nassau',
    desc: 'Three bets: front 9, back 9, and overall 18.' },
  { id: 'wolf', icon: '🐺', name: 'Wolf',
    desc: 'Rotating team game — the Wolf picks a partner each hole.' },
]

const btn = (onClick, label, style = {}) => (
  <button onClick={onClick} style={{
    border: '1px solid var(--bd)', borderRadius: 8,
    background: 'var(--bg2)', padding: '8px 14px',
    fontFamily: 'Inter,sans-serif', fontSize: 13,
    cursor: 'pointer', color: 'var(--tx)',
    transition: 'all .15s', ...style
  }}>{label}</button>
)

function WolfGame() {
  const [players, setPlayers] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4'])
  const [setup, setSetup] = useState(true)
  const [currentHole, setCurrentHole] = useState(1)
  const [wolfIndex, setWolfIndex] = useState(0)
  const [points, setPoints] = useState([0, 0, 0, 0])
  const [phase, setPhase] = useState('picking') // picking | scoring
  const [partner, setPartner] = useState(null) // null = lone wolf, index = partner
  const [loneWolf, setLoneWolf] = useState(false)
  const [history, setHistory] = useState([])
  const [editingName, setEditingName] = useState(null)

  const wolf = players[wolfIndex]
  const nonWolves = players.map((p, i) => ({ name: p, index: i }))
    .filter(p => p.index !== wolfIndex)

  function nextWolf(hole) {
    return (hole - 1) % 4
  }

  function pickPartner(index) {
    setPartner(index)
    setLoneWolf(false)
    setPhase('scoring')
  }

  function goLoneWolf() {
    setLoneWolf(true)
    setPartner(null)
    setPhase('scoring')
  }

  function scoreHole(wolfWon) {
    const newPoints = [...points]
    const bet = 1

    if (loneWolf) {
      if (wolfWon) {
        // Wolf beats everyone — gets 2 points from each
        newPoints[wolfIndex] += 2 * 3
        nonWolves.forEach(p => { newPoints[p.index] -= 2 })
      } else {
        // Everyone beats lone wolf — each gets 2 from wolf
        nonWolves.forEach(p => { newPoints[p.index] += 2 })
        newPoints[wolfIndex] -= 2 * 3
      }
    } else {
      if (wolfWon) {
        // Wolf team wins — wolf and partner get 1 from each opponent
        newPoints[wolfIndex] += 2
        newPoints[partner] += 2
        nonWolves.filter(p => p.index !== partner).forEach(p => {
          newPoints[p.index] -= 1
        })
        newPoints[wolfIndex] -= 0 // already added
      } else {
        // Opponents win
        nonWolves.filter(p => p.index !== partner).forEach(p => {
          newPoints[p.index] += 2
        })
        newPoints[wolfIndex] -= 2
        newPoints[partner] -= 2
      }
    }

    setHistory([...history, {
      hole: currentHole,
      wolf: players[wolfIndex],
      partner: partner !== null ? players[partner] : null,
      loneWolf,
      wolfWon
    }])

    setPoints(newPoints)

    if (currentHole < 18) {
      const nextHole = currentHole + 1
      setCurrentHole(nextHole)
      setWolfIndex(nextWolf(nextHole))
      setPartner(null)
      setLoneWolf(false)
      setPhase('picking')
    } else {
      setPhase('done')
    }
  }

  if (setup) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22,
          marginBottom: 4 }}>🐺 Wolf — Player Setup</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          Enter the 4 player names. Order determines who is Wolf first.
        </div>

        {players.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tx2)',
              marginBottom: 4, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Player {i + 1} {i === 0 ? '(Wolf on hole 1)' : ''}
            </div>
            <input
              value={p}
              onChange={e => {
                const n = [...players]
                n[i] = e.target.value
                setPlayers(n)
              }}
              style={{ width: '100%', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', fontSize: 14,
                background: '#fff', color: 'var(--tx)' }}
            />
          </div>
        ))}

        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: 12, marginBottom: 16, fontSize: 13,
          color: 'var(--tx2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--tx)' }}>How Wolf works:</strong><br/>
          • The Wolf rotates each hole (1→2→3→4→1...)<br/>
          • After each player hits, Wolf decides to pick them or pass<br/>
          • Wolf can go <strong>Lone Wolf</strong> (1v3) for double points<br/>
          • Wolf team wins = +2pts each, opponents -1pt each<br/>
          • Lone Wolf wins = +6pts, loses = -6pts
        </div>

        <button onClick={() => setSetup(false)}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px',
            fontFamily: 'Inter,sans-serif', fontSize: 15,
            fontWeight: 600, cursor: 'pointer' }}>
          Start Wolf Game →
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const sorted = [...players.map((name, i) => ({ name, pts: points[i] }))]
      .sort((a, b) => b.pts - a.pts)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22,
          marginBottom: 12 }}>🐺 Wolf — Final Results</div>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ background: i === 0 ? 'var(--g1)' : 'var(--bg2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600,
                color: i === 0 ? '#fff' : 'var(--tx)' }}>{p.name}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700,
              color: i === 0 ? '#4ade80' : p.pts >= 0 ? 'var(--g2)' : '#dc2626' }}>
              {p.pts > 0 ? '+' : ''}{p.pts}
            </div>
          </div>
        ))}
        <button onClick={() => {
          setSetup(true)
          setCurrentHole(1)
          setWolfIndex(0)
          setPoints([0,0,0,0])
          setPhase('picking')
          setPartner(null)
          setLoneWolf(false)
          setHistory([])
        }}
          style={{ width: '100%', background: 'var(--bg2)', color: 'var(--tx)',
            border: '1px solid var(--bd)', borderRadius: 10, padding: '10px',
            fontFamily: 'Inter,sans-serif', fontSize: 14, cursor: 'pointer',
            marginTop: 8 }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>

      {/* Hole header */}
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: '14px 16px', marginBottom: 12, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Hole {currentHole} of 18
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 24,
              letterSpacing: .5, marginTop: 2 }}>
              🐺 {wolf} is the Wolf
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
              Phase
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {phase === 'picking' ? '🎯 Picking' : '🏌️ Scoring'}
            </div>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 6, marginBottom: 12 }}>
        {players.map((p, i) => (
          <div key={i} style={{ background: i === wolfIndex
            ? 'rgba(45,138,84,.1)' : 'var(--bg2)',
            border: i === wolfIndex ? '2px solid var(--g3)'
              : partner === i ? '2px solid #f59e0b' : '1px solid var(--bd)',
            borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx2)',
              textOverflow: 'ellipsis', overflow: 'hidden',
              whiteSpace: 'nowrap' }}>
              {i === wolfIndex ? '🐺' : partner === i ? '🤝' : ''} {p}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700,
              color: points[i] >= 0 ? 'var(--g2)' : '#dc2626',
              marginTop: 2 }}>
              {points[i] > 0 ? '+' : ''}{points[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Picking phase */}
      {phase === 'picking' && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            {wolf}, pick your partner or go Lone Wolf:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8,
            marginBottom: 10 }}>
            {nonWolves.map(p => (
              <button key={p.index} onClick={() => pickPartner(p.index)}
                style={{ border: '1px solid var(--bd)', borderRadius: 10,
                  background: '#fff', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--bg2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                    Pick as partner → 2v2
                  </div>
                </div>
                <div style={{ fontSize: 20 }}>🤝</div>
              </button>
            ))}
          </div>
          <button onClick={goLoneWolf}
            style={{ width: '100%', background: '#7f1d1d', color: '#fff',
              border: 'none', borderRadius: 10, padding: '12px',
              fontFamily: 'Inter,sans-serif', fontSize: 14,
              fontWeight: 600, cursor: 'pointer' }}>
            🐺 Go Lone Wolf (1v3) — Double or nothing!
          </button>
        </div>
      )}

      {/* Scoring phase */}
      {phase === 'scoring' && (
        <div>
          <div style={{ background: 'var(--bg2)', borderRadius: 10,
            padding: 12, marginBottom: 12, fontSize: 13,
            color: 'var(--tx2)', lineHeight: 1.6 }}>
            {loneWolf ? (
              <>🐺 <strong style={{ color: 'var(--tx)' }}>{wolf}</strong> is going <strong style={{ color: '#dc2626' }}>Lone Wolf</strong> against everyone!</>
            ) : (
              <>🤝 <strong style={{ color: 'var(--tx)' }}>{wolf}</strong> &amp; <strong style={{ color: 'var(--tx)' }}>{players[partner]}</strong> vs {nonWolves.filter(p => p.index !== partner).map(p => p.name).join(' & ')}</>
            )}
          </div>

          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
            Who won hole {currentHole}?
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => scoreHole(true)}
              style={{ flex: 1, background: 'var(--g1)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px',
                fontFamily: 'Inter,sans-serif', fontSize: 14,
                fontWeight: 600, cursor: 'pointer' }}>
              🐺 {loneWolf ? wolf : `${wolf} & ${players[partner]}`} won!
            </button>
            <button onClick={() => scoreHole(false)}
              style={{ flex: 1, background: '#7f1d1d', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px',
                fontFamily: 'Inter,sans-serif', fontSize: 14,
                fontWeight: 600, cursor: 'pointer' }}>
              ⚔️ Opponents won!
            </button>
          </div>

          {/* Hole history */}
          {history.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600,
                color: 'var(--tx2)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 6 }}>
                History
              </div>
              {[...history].reverse().slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: '1px solid var(--bd)', fontSize: 12,
                  color: 'var(--tx2)' }}>
                  <div>Hole {h.hole} — 🐺 {h.wolf}
                    {h.loneWolf ? ' (Lone Wolf)' : h.partner ? ` & ${h.partner}` : ''}
                  </div>
                  <div style={{ fontWeight: 600,
                    color: h.wolfWon ? 'var(--g2)' : '#dc2626' }}>
                    {h.wolfWon ? 'Wolf won' : 'Opponents won'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Games() {
  const [active, setActive] = useState(null)

  if (active === 'wolf') {
    return (
      <div style={{ padding: 0 }}>
        <button onClick={() => setActive(null)}
          style={{ margin: '12px 16px', border: '1px solid var(--bd)',
            borderRadius: 8, background: 'var(--bg2)', padding: '6px 14px',
            fontFamily: 'Inter,sans-serif', fontSize: 12,
            cursor: 'pointer', color: 'var(--tx)' }}>
          ← Back to games
        </button>
        <WolfGame />
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 12 }}>
        Choose a side game
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {gamesList.map(g => (
          <div key={g.id} onClick={() => setActive(g.id)}
            style={{
              border: active === g.id ? '2px solid var(--g3)'
                : '1px solid var(--bd)',
              borderRadius: 12, padding: 14, cursor: 'pointer',
              background: active === g.id
                ? 'rgba(45,138,84,0.05)' : '#fff' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{g.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4,
              lineHeight: 1.4 }}>{g.desc}</div>
          </div>
        ))}
      </div>
      {active && active !== 'wolf' && (
        <div style={{ background: 'var(--bg2)', borderRadius: 12,
          padding: 16, marginTop: 12, textAlign: 'center',
          color: 'var(--tx2)', fontSize: 13 }}>
          {gamesList.find(g => g.id === active)?.name} — coming soon!
        </div>
      )}
    </div>
  )
}