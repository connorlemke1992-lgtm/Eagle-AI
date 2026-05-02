import { useState } from 'react'

const gamesList = [
  { id: 'skins', icon: '💀', name: 'Skins', desc: 'Win a hole outright, take the pot. Ties carry over.' },
  { id: 'match', icon: '⚔️', name: 'Match Play', desc: 'Head to head or 2v2. Most holes won takes it.' },
  { id: 'wolf', icon: '🐺', name: 'Wolf', desc: 'Rotating team game — the Wolf picks a partner each hole.' },
]

// ─── SKINS ───────────────────────────────────────────────────────────────────

function SkinsGame() {
  const [numPlayers, setNumPlayers] = useState(null)
  const [players, setPlayers] = useState([])
  const [setup, setSetup] = useState(true)
  const [currentHole, setCurrentHole] = useState(1)
  const [scores, setScores] = useState({}) // { holeNum: { playerIndex: score } }
  const [skins, setSkins] = useState([]) // array of { hole, winner, carried }
  const [carryover, setCarryover] = useState(0)
  const [holeScores, setHoleScores] = useState({}) // current hole input
  const [history, setHistory] = useState([])
  const [phase, setPhase] = useState('scoring') // scoring | done

  function startGame() {
    setSetup(false)
    setCurrentHole(1)
    setCarryover(0)
    setSkins([])
    setHistory([])
    setScores({})
    setHoleScores({})
  }

  function submitHole() {
    // Check all players have scores
    if (players.some((_, i) => holeScores[i] === undefined || holeScores[i] === '')) return

    const scoreArr = players.map((_, i) => parseInt(holeScores[i]))
    const minScore = Math.min(...scoreArr)
    const winners = players.filter((_, i) => scoreArr[i] === minScore)

    let newCarryover = carryover
    let skinWinner = null

    if (winners.length === 1) {
      skinWinner = winners[0]
      const skinsWon = 1 + carryover
      setSkins(prev => [...prev, { hole: currentHole, winner: skinWinner, skinsWon }])
      newCarryover = 0
    } else {
      // Tie — carry over
      newCarryover = carryover + 1
      setSkins(prev => [...prev, { hole: currentHole, winner: null, tied: true, skinsWon: 0 }])
    }

    setHistory(prev => [...prev, { hole: currentHole, scores: { ...holeScores }, winner: skinWinner, carryover: newCarryover }])
    setCarryover(newCarryover)
    setHoleScores({})

    if (currentHole >= 18) {
      setPhase('done')
    } else {
      setCurrentHole(h => h + 1)
    }
  }

  // Count skins per player
  const skinCount = {}
  players.forEach(p => { skinCount[p] = 0 })
  skins.forEach(s => {
    if (s.winner) skinCount[s.winner] = (skinCount[s.winner] || 0) + s.skinsWon
  })

  if (!numPlayers) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>💀 Skins — Setup</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 20 }}>How many players?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => {
              setNumPlayers(n)
              setPlayers(Array.from({ length: n }, (_, i) => `Player ${i + 1}`))
            }}
              style={{ background: 'var(--g1)', border: 'none', borderRadius: 12,
                padding: '20px 10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontFamily: 'Bebas Neue', color: '#4ade80' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Players</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (setup) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>💀 Skins — Players</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>Enter player names</div>
        {players.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player {i + 1}</div>
            <input value={p}
              onChange={e => {
                const n = [...players]
                n[i] = e.target.value
                setPlayers(n)
              }}
              style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8,
                padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--tx)' }} />
          </div>
        ))}
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 12,
          marginBottom: 16, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--tx)' }}>How Skins works:</strong><br/>
          • Lowest score on a hole wins the skin<br/>
          • Ties carry the skin over to the next hole<br/>
          • Most skins at the end wins
        </div>
        <button onClick={startGame}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Start Skins Game →
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const sorted = players.map(p => ({ name: p, skins: skinCount[p] || 0 }))
      .sort((a, b) => b.skins - a.skins)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 12 }}>💀 Skins — Results</div>
        {carryover > 0 && (
          <div style={{ background: '#fef3c7', borderRadius: 10, padding: 12,
            marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            ⚠️ {carryover} skin{carryover > 1 ? 's' : ''} carried over — no outright winner on last hole
          </div>
        )}
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
              color: i === 0 ? '#4ade80' : 'var(--g2)' }}>
              {p.skins} skin{p.skins !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
          <div style={{ background: 'var(--g1)', padding: '8px 14px',
            fontSize: 11, color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
            Hole by Hole
          </div>
          {skins.map((s, i) => (
            <div key={i} style={{ padding: '8px 14px',
              borderBottom: i < skins.length - 1 ? '1px solid var(--bd)' : 'none',
              display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <div style={{ color: 'var(--tx2)' }}>Hole {s.hole}</div>
              <div style={{ fontWeight: 600,
                color: s.winner ? 'var(--g2)' : '#f59e0b' }}>
                {s.winner ? `${s.winner} wins ${s.skinsWon} skin${s.skinsWon > 1 ? 's' : ''}` : 'Tied — carry over'}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => {
          setNumPlayers(null)
          setSetup(true)
          setPhase('scoring')
          setCurrentHole(1)
          setCarryover(0)
          setSkins([])
          setHistory([])
          setHoleScores({})
        }}
          style={{ width: '100%', background: 'var(--bg2)', color: 'var(--tx)',
            border: '1px solid var(--bd)', borderRadius: 10, padding: '10px',
            fontSize: 14, cursor: 'pointer', marginTop: 12 }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Hole {currentHole} of 18
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: '#fff', marginTop: 2 }}>
          💀 Skins · {carryover > 0 ? `${carryover + 1} skins up for grabs!` : '1 skin up for grabs'}
        </div>
      </div>

      {/* Skin counts */}
      <div style={{ display: 'grid',
        gridTemplateColumns: `repeat(${players.length},1fr)`,
        gap: 6, marginBottom: 12 }}>
        {players.map((p, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)',
            borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g2)', marginTop: 2 }}>
              {skinCount[p] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Score entry */}
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Enter scores for hole {currentHole}:
        </div>
        {players.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[2,3,4,5,6,7,8].map(s => (
                <button key={s} onClick={() => setHoleScores(prev => ({ ...prev, [i]: s }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    border: holeScores[i] === s ? '2px solid var(--g3)' : '1px solid var(--bd)',
                    background: holeScores[i] === s ? 'rgba(45,138,84,0.1)' : '#fff',
                    fontWeight: 600, fontSize: 13 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={submitHole}
        disabled={players.some((_, i) => holeScores[i] === undefined)}
        style={{ width: '100%', background: players.some((_, i) => holeScores[i] === undefined)
          ? 'var(--bg2)' : 'var(--g1)',
          color: players.some((_, i) => holeScores[i] === undefined) ? 'var(--tx2)' : '#fff',
          border: 'none', borderRadius: 10, padding: '13px',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
        Submit Hole {currentHole} →
      </button>

      {/* Recent history */}
      {skins.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '8px 14px',
            fontSize: 11, color: 'var(--tx2)', fontWeight: 600,
            textTransform: 'uppercase' }}>Recent</div>
          {[...skins].reverse().slice(0, 4).map((s, i) => (
            <div key={i} style={{ padding: '8px 14px',
              borderBottom: i < Math.min(skins.length, 4) - 1 ? '1px solid var(--bd)' : 'none',
              display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ color: 'var(--tx2)' }}>Hole {s.hole}</div>
              <div style={{ fontWeight: 600, color: s.winner ? 'var(--g2)' : '#f59e0b' }}>
                {s.winner ? `${s.winner} 🏆` : '🤝 Tied — carry'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MATCH PLAY ───────────────────────────────────────────────────────────────

function MatchPlayGame() {
  const [format, setFormat] = useState(null) // '1v1' | '2v2'
  const [players, setPlayers] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4'])
  const [setup, setSetup] = useState(true)
  const [currentHole, setCurrentHole] = useState(1)
  const [holeScores, setHoleScores] = useState({})
  const [matchScore, setMatchScore] = useState(0) // positive = team1 up, negative = team2 up
  const [history, setHistory] = useState([])
  const [phase, setPhase] = useState('scoring')
  const [holesRemaining, setHolesRemaining] = useState(18)

  const team1 = format === '1v1' ? [players[0]] : [players[0], players[1]]
  const team2 = format === '1v1' ? [players[1]] : [players[2], players[3]]
  const allPlayers = format === '1v1' ? [players[0], players[1]] : players

  function getStatusText() {
    const holesLeft = 18 - currentHole + 1
    if (matchScore === 0) return 'All Square'
    const up = Math.abs(matchScore)
    const leader = matchScore > 0 ? team1.join(' & ') : team2.join(' & ')
    if (up > holesLeft) return `${leader} wins ${up}&${holesLeft}`
    return `${leader} ${up} UP`
  }

  function isMatchOver() {
    const holesLeft = 18 - currentHole + 1
    return Math.abs(matchScore) > holesLeft
  }

  function submitHole() {
    const numPlayers = allPlayers.length
    if (allPlayers.some((_, i) => holeScores[i] === undefined)) return

    let team1Score, team2Score
    if (format === '1v1') {
      team1Score = parseInt(holeScores[0])
      team2Score = parseInt(holeScores[1])
    } else {
      // Best ball — best score from each team
      team1Score = Math.min(parseInt(holeScores[0]), parseInt(holeScores[1]))
      team2Score = Math.min(parseInt(holeScores[2]), parseInt(holeScores[3]))
    }

    let newMatchScore = matchScore
    let holeResult = 'halved'
    if (team1Score < team2Score) { newMatchScore += 1; holeResult = 'team1' }
    else if (team2Score < team1Score) { newMatchScore -= 1; holeResult = 'team2' }

    setHistory(prev => [...prev, {
      hole: currentHole,
      scores: { ...holeScores },
      result: holeResult,
      matchScore: newMatchScore
    }])
    setMatchScore(newMatchScore)
    setHoleScores({})

    const holesLeft = 18 - currentHole
    if (Math.abs(newMatchScore) > holesLeft || currentHole >= 18) {
      setPhase('done')
    } else {
      setCurrentHole(h => h + 1)
    }
  }

  if (!format) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>
          ⚔️ Match Play — Format
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 20 }}>
          Choose your format
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { setFormat('1v1'); setPlayers(['Player 1', 'Player 2', '', '']) }}
            style={{ background: 'var(--g1)', border: 'none', borderRadius: 14,
              padding: '20px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>👤</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                1v1 Singles
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Head to head. Lowest score wins each hole.
              </div>
            </div>
          </button>
          <button onClick={() => { setFormat('2v2'); setPlayers(['Player 1', 'Player 2', 'Player 3', 'Player 4']) }}
            style={{ background: 'var(--g1)', border: 'none', borderRadius: 14,
              padding: '20px 16px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 36 }}>👥</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                2v2 Best Ball
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Teams of 2. Best score from each team wins the hole.
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  if (setup) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>
          ⚔️ Match Play — Players
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          {format === '1v1' ? 'Enter 2 player names' : 'Enter team names'}
        </div>

        {format === '1v1' ? (
          <>
            {[0, 1].map(i => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player {i + 1}</div>
                <input value={players[i]}
                  onChange={e => { const n = [...players]; n[i] = e.target.value; setPlayers(n) }}
                  style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8,
                    padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--tx)' }} />
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g2)',
              marginBottom: 8 }}>Team 1</div>
            {[0, 1].map(i => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player {i + 1}</div>
                <input value={players[i]}
                  onChange={e => { const n = [...players]; n[i] = e.target.value; setPlayers(n) }}
                  style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8,
                    padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--tx)' }} />
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626',
              marginBottom: 8, marginTop: 4 }}>Team 2</div>
            {[2, 3].map(i => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player {i - 1}</div>
                <input value={players[i]}
                  onChange={e => { const n = [...players]; n[i] = e.target.value; setPlayers(n) }}
                  style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8,
                    padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--tx)' }} />
              </div>
            ))}
          </>
        )}

        <button onClick={() => setSetup(false)}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
          Start Match →
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const winner = matchScore > 0 ? team1.join(' & ') : matchScore < 0 ? team2.join(' & ') : null
    const holesLeft = 18 - currentHole + 1
    const up = Math.abs(matchScore)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 12 }}>
          ⚔️ Match Complete
        </div>
        <div style={{ background: 'var(--g1)', borderRadius: 14, padding: 20,
          textAlign: 'center', marginBottom: 16 }}>
          {winner ? (
            <>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase', marginBottom: 8 }}>Winner</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 36,
                color: '#4ade80', marginBottom: 4 }}>{winner}</div>
              <div style={{ fontSize: 16, color: '#fff' }}>
                {up}&{holesLeft > 0 ? holesLeft : 'OH'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, color: '#fff' }}>
                All Square
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Match ended tied after 18
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: 'var(--bg2)', padding: '8px 14px',
            fontSize: 11, color: 'var(--tx2)', fontWeight: 600,
            textTransform: 'uppercase' }}>Hole by Hole</div>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '8px 14px',
              borderBottom: i < history.length - 1 ? '1px solid var(--bd)' : 'none',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: 12 }}>
              <div style={{ color: 'var(--tx2)' }}>Hole {h.hole}</div>
              <div style={{ fontWeight: 600,
                color: h.result === 'halved' ? 'var(--tx2)'
                  : h.result === 'team1' ? 'var(--g2)' : '#dc2626' }}>
                {h.result === 'halved' ? 'Halved'
                  : h.result === 'team1' ? `${team1.join(' & ')} wins`
                  : `${team2.join(' & ')} wins`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                {h.matchScore === 0 ? 'AS'
                  : h.matchScore > 0 ? `${team1[0].split(' ')[0]} +${h.matchScore}`
                  : `${team2[0].split(' ')[0]} +${Math.abs(h.matchScore)}`}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => {
          setFormat(null)
          setSetup(true)
          setPhase('scoring')
          setCurrentHole(1)
          setMatchScore(0)
          setHistory([])
          setHoleScores({})
        }}
          style={{ width: '100%', background: 'var(--bg2)', color: 'var(--tx)',
            border: '1px solid var(--bd)', borderRadius: 10, padding: '10px',
            fontSize: 14, cursor: 'pointer' }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Match status */}
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Hole {currentHole} of 18
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 28,
          color: matchScore === 0 ? '#fff' : matchScore > 0 ? '#4ade80' : '#fca5a5',
          marginTop: 2 }}>
          {getStatusText()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          marginTop: 8, fontSize: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>
            {team1.join(' & ')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)' }}>vs</div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>
            {team2.join(' & ')}
          </div>
        </div>
      </div>

      {/* Score entry */}
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Enter scores for hole {currentHole}:
        </div>

        {format === '2v2' && (
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g2)',
            marginBottom: 8, textTransform: 'uppercase' }}>Team 1</div>
        )}
        {(format === '1v1' ? [0, 1] : [0, 1]).map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{players[i]}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[2,3,4,5,6,7,8].map(s => (
                <button key={s} onClick={() => setHoleScores(prev => ({ ...prev, [i]: s }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    border: holeScores[i] === s ? '2px solid var(--g3)' : '1px solid var(--bd)',
                    background: holeScores[i] === s ? 'rgba(45,138,84,0.1)' : '#fff',
                    fontWeight: 600, fontSize: 13 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}

        {format === '2v2' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626',
              marginBottom: 8, marginTop: 4, textTransform: 'uppercase' }}>Team 2</div>
            {[2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{players[i]}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[2,3,4,5,6,7,8].map(s => (
                    <button key={s} onClick={() => setHoleScores(prev => ({ ...prev, [i]: s }))}
                      style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                        border: holeScores[i] === s ? '2px solid #dc2626' : '1px solid var(--bd)',
                        background: holeScores[i] === s ? 'rgba(220,38,38,0.1)' : '#fff',
                        fontWeight: 600, fontSize: 13 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <button onClick={submitHole}
        disabled={allPlayers.some((_, i) => holeScores[i] === undefined)}
        style={{ width: '100%',
          background: allPlayers.some((_, i) => holeScores[i] === undefined)
            ? 'var(--bg2)' : 'var(--g1)',
          color: allPlayers.some((_, i) => holeScores[i] === undefined) ? 'var(--tx2)' : '#fff',
          border: 'none', borderRadius: 10, padding: '13px',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
        Submit Hole {currentHole} →
      </button>

      {history.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '8px 14px',
            fontSize: 11, color: 'var(--tx2)', fontWeight: 600,
            textTransform: 'uppercase' }}>Recent</div>
          {[...history].reverse().slice(0, 4).map((h, i) => (
            <div key={i} style={{ padding: '8px 14px',
              borderBottom: i < Math.min(history.length, 4) - 1 ? '1px solid var(--bd)' : 'none',
              display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ color: 'var(--tx2)' }}>Hole {h.hole}</div>
              <div style={{ fontWeight: 600,
                color: h.result === 'halved' ? 'var(--tx2)'
                  : h.result === 'team1' ? 'var(--g2)' : '#dc2626' }}>
                {h.result === 'halved' ? 'Halved'
                  : h.result === 'team1' ? `${team1[0].split(' ')[0]} wins`
                  : `${team2[0].split(' ')[0]} wins`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                {h.matchScore === 0 ? 'AS'
                  : h.matchScore > 0 ? `${team1[0].split(' ')[0]} +${h.matchScore}`
                  : `${team2[0].split(' ')[0]} +${Math.abs(h.matchScore)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── WOLF (fixed scoring) ─────────────────────────────────────────────────────

function WolfGame() {
  const [players, setPlayers] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4'])
  const [setup, setSetup] = useState(true)
  const [currentHole, setCurrentHole] = useState(1)
  const [wolfIndex, setWolfIndex] = useState(0)
  const [points, setPoints] = useState([0, 0, 0, 0])
  const [phase, setPhase] = useState('picking')
  const [partner, setPartner] = useState(null)
  const [loneWolf, setLoneWolf] = useState(false)
  const [history, setHistory] = useState([])

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
    const opponents = nonWolves.filter(p => p.index !== partner)

    if (loneWolf) {
      if (wolfWon) {
        // Lone wolf wins — gets 2 from each of 3 opponents
        newPoints[wolfIndex] += 6
        nonWolves.forEach(p => { newPoints[p.index] -= 2 })
      } else {
        // Lone wolf loses — pays 2 to each of 3 opponents
        newPoints[wolfIndex] -= 6
        nonWolves.forEach(p => { newPoints[p.index] += 2 })
      }
    } else {
      if (wolfWon) {
        // Wolf team wins — wolf + partner each get 1 from each opponent
        newPoints[wolfIndex] += opponents.length
        newPoints[partner] += opponents.length
        opponents.forEach(p => { newPoints[p.index] -= 1 })
      } else {
        // Opponents win — each opponent gets 1 from wolf and partner
        opponents.forEach(p => { newPoints[p.index] += 2 })
        newPoints[wolfIndex] -= opponents.length
        newPoints[partner] -= opponents.length
      }
    }

    setHistory(prev => [...prev, {
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
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>🐺 Wolf — Setup</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          Enter player names. Order determines who is Wolf first.
        </div>
        {players.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Player {i + 1} {i === 0 ? '(Wolf on hole 1)' : ''}
            </div>
            <input value={p}
              onChange={e => { const n = [...players]; n[i] = e.target.value; setPlayers(n) }}
              style={{ width: '100%', border: '1px solid var(--bd)', borderRadius: 8,
                padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--tx)' }} />
          </div>
        ))}
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 12,
          marginBottom: 16, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--tx)' }}>How Wolf works:</strong><br/>
          • Wolf rotates each hole (1→2→3→4→1...)<br/>
          • Wolf picks a partner after seeing tee shots, or goes Lone Wolf<br/>
          • Wolf team wins = wolf & partner each +2, opponents -1 each<br/>
          • Lone Wolf wins = +6, loses = -6
        </div>
        <button onClick={() => setSetup(false)}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px',
            fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Start Wolf Game →
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const sorted = players.map((name, i) => ({ name, pts: points[i] }))
      .sort((a, b) => b.pts - a.pts)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 12 }}>
          🐺 Wolf — Final Results
        </div>
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
            fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: '14px 16px', marginBottom: 12, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Hole {currentHole} of 18
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: .5, marginTop: 2 }}>
              🐺 {wolf} is the Wolf
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Phase</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {phase === 'picking' ? '🎯 Picking' : '🏌️ Scoring'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 6, marginBottom: 12 }}>
        {players.map((p, i) => (
          <div key={i} style={{ background: i === wolfIndex
            ? 'rgba(45,138,84,.1)' : 'var(--bg2)',
            border: i === wolfIndex ? '2px solid var(--g3)'
              : partner === i ? '2px solid #f59e0b' : '1px solid var(--bd)',
            borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx2)',
              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {i === wolfIndex ? '🐺' : partner === i ? '🤝' : ''} {p}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700,
              color: points[i] >= 0 ? 'var(--g2)' : '#dc2626', marginTop: 2 }}>
              {points[i] > 0 ? '+' : ''}{points[i]}
            </div>
          </div>
        ))}
      </div>

      {phase === 'picking' && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            {wolf}, pick your partner or go Lone Wolf:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {nonWolves.map(p => (
              <button key={p.index} onClick={() => pickPartner(p.index)}
                style={{ border: '1px solid var(--bd)', borderRadius: 10,
                  background: '#fff', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--bg2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx2)' }}>Pick as partner → 2v2</div>
                </div>
                <div style={{ fontSize: 20 }}>🤝</div>
              </button>
            ))}
          </div>
          <button onClick={goLoneWolf}
            style={{ width: '100%', background: '#7f1d1d', color: '#fff',
              border: 'none', borderRadius: 10, padding: '12px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            🐺 Go Lone Wolf (1v3) — Double or nothing!
          </button>
        </div>
      )}

      {phase === 'scoring' && (
        <div>
          <div style={{ background: 'var(--bg2)', borderRadius: 10,
            padding: 12, marginBottom: 12, fontSize: 13,
            color: 'var(--tx2)', lineHeight: 1.6 }}>
            {loneWolf ? (
              <>🐺 <strong style={{ color: 'var(--tx)' }}>{wolf}</strong> is going{' '}
              <strong style={{ color: '#dc2626' }}>Lone Wolf</strong> against everyone!</>
            ) : (
              <>🤝 <strong style={{ color: 'var(--tx)' }}>{wolf}</strong> &amp;{' '}
              <strong style={{ color: 'var(--tx)' }}>{players[partner]}</strong> vs{' '}
              {nonWolves.filter(p => p.index !== partner).map(p => p.name).join(' & ')}</>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
            Who won hole {currentHole}?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => scoreHole(true)}
              style={{ flex: 1, background: 'var(--g1)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              🐺 {loneWolf ? wolf : `${wolf} & ${players[partner]}`} won!
            </button>
            <button onClick={() => scoreHole(false)}
              style={{ flex: 1, background: '#7f1d1d', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ⚔️ Opponents won!
            </button>
          </div>
          {history.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                History
              </div>
              {[...history].reverse().slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: '1px solid var(--bd)', fontSize: 12, color: 'var(--tx2)' }}>
                  <div>Hole {h.hole} — 🐺 {h.wolf}
                    {h.loneWolf ? ' (Lone Wolf)' : h.partner ? ` & ${h.partner}` : ''}
                  </div>
                  <div style={{ fontWeight: 600, color: h.wolfWon ? 'var(--g2)' : '#dc2626' }}>
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Games() {
  const [active, setActive] = useState(null)

  if (active === 'skins') return (
    <div>
      <button onClick={() => setActive(null)}
        style={{ margin: '12px 16px', border: '1px solid var(--bd)',
          borderRadius: 8, background: 'var(--bg2)', padding: '6px 14px',
          fontSize: 12, cursor: 'pointer', color: 'var(--tx)' }}>
        ← Back to games
      </button>
      <SkinsGame />
    </div>
  )

  if (active === 'match') return (
    <div>
      <button onClick={() => setActive(null)}
        style={{ margin: '12px 16px', border: '1px solid var(--bd)',
          borderRadius: 8, background: 'var(--bg2)', padding: '6px 14px',
          fontSize: 12, cursor: 'pointer', color: 'var(--tx)' }}>
        ← Back to games
      </button>
      <MatchPlayGame />
    </div>
  )

  if (active === 'wolf') return (
    <div>
      <button onClick={() => setActive(null)}
        style={{ margin: '12px 16px', border: '1px solid var(--bd)',
          borderRadius: 8, background: 'var(--bg2)', padding: '6px 14px',
          fontSize: 12, cursor: 'pointer', color: 'var(--tx)' }}>
        ← Back to games
      </button>
      <WolfGame />
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        Choose a side game
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {gamesList.map(g => (
          <button key={g.id} onClick={() => setActive(g.id)}
            style={{ border: '1px solid var(--bd)', borderRadius: 12,
              padding: '16px 14px', cursor: 'pointer', background: '#fff',
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
            <div style={{ fontSize: 32 }}>{g.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--tx)',
                marginBottom: 3 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.4 }}>
                {g.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}