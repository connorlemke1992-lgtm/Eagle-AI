import { useState } from 'react'

function loadHoleStats() {
  try { return JSON.parse(localStorage.getItem('hole_stats') || '{}') }
  catch { return {} }
}

const defaultHoles = [
  {par:4},{par:5},{par:3},{par:4},{par:4},{par:3},
  {par:5},{par:4},{par:4},{par:4},{par:5},{par:3},
  {par:4},{par:4},{par:3},{par:5},{par:4},{par:4},
]

function getPlusMinus(diff) {
  if (diff === null || diff === undefined) return '—'
  if (diff === 0) return 'E'
  if (diff > 0) return '+' + diff
  return diff
}

function getPlusMinusColor(diff) {
  if (diff === null || diff === undefined) return 'var(--tx2)'
  if (diff < 0) return '#166534'
  if (diff > 0) return '#991b1b'
  return 'var(--tx2)'
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--bd)',
      borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--tx2)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Bebas Neue',
        color: color || 'var(--tx)', letterSpacing: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--tx2)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bg2)',
        borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%',
          background: color || 'var(--g2)', borderRadius: 4,
          transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)',
        minWidth: 36, textAlign: 'right' }}>{pct}%</div>
    </div>
  )
}

function ScoreDisplay({ score, par, size = 18 }) {
  if (score === null || score === undefined) return <span>—</span>
  const diff = score - par
  const numStyle = {
    fontSize: size * 0.55, fontWeight: 600, color: 'var(--tx)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 1,
  }
  if (diff <= -2) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', width: size + 6, height: size + 6 }}>
        <span style={{ position: 'absolute', width: size + 6, height: size + 6,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={{ position: 'absolute', width: size, height: size,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else if (diff === -1) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <span style={{ position: 'absolute', width: size, height: size,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else if (diff === 0) {
    return <span style={numStyle}>{score}</span>
  } else if (diff === 1) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <span style={{ position: 'absolute', width: size, height: size,
          border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else if (diff === 2) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', width: size + 6, height: size + 6 }}>
        <span style={{ position: 'absolute', width: size + 6, height: size + 6,
          border: '1.5px solid #111' }} />
        <span style={{ position: 'absolute', width: size, height: size,
          border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else {
    return <span style={numStyle}>{score}</span>
  }
}

function RoundDetail({ round, onBack }) {
  const holes = defaultHoles
  const played = round.scores.map((s, i) => ({
    score: s, hole: i, par: holes[i]?.par || 4
  })).filter(h => h.score !== null)

  const totalStrokes = played.reduce((a, h) => a + h.score, 0)
  const totalPar = played.reduce((a, h) => a + h.par, 0)
  const diff = totalStrokes - totalPar
  const date = new Date(round.date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })

  const front9 = round.scores.slice(0, 9)
  const back9 = round.scores.slice(9)
  const front9Par = holes.slice(0, 9).reduce((a, h) => a + h.par, 0)
  const back9Par = holes.slice(9).reduce((a, h) => a + h.par, 0)
  const front9Strokes = front9.reduce((a, b) => b !== null ? a + b : a, 0)
  const back9Strokes = back9.reduce((a, b) => b !== null ? a + b : a, 0)
  const front9Played = front9.filter(s => s !== null).length
  const back9Played = back9.filter(s => s !== null).length

  const eagles = played.filter(h => h.score <= h.par - 2).length
  const birdies = played.filter(h => h.score === h.par - 1).length
  const pars = played.filter(h => h.score === h.par).length
  const bogeys = played.filter(h => h.score === h.par + 1).length
  const doubles = played.filter(h => h.score >= h.par + 2).length

  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack}
        style={{ border: '1px solid var(--bd)', borderRadius: 8,
          background: '#fff', padding: '6px 14px', cursor: 'pointer',
          fontSize: 13, marginBottom: 16 }}>← Back</button>

      {/* Round header */}
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff',
          marginBottom: 4 }}>{round.course}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)',
          marginBottom: 12 }}>{date}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Score', val: totalStrokes },
            { label: 'vs Par', val: getPlusMinus(diff),
              color: diff < 0 ? '#4ade80' : diff > 0 ? '#fca5a5' : '#fff' },
            { label: 'Holes', val: played.length },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700,
                fontFamily: 'Bebas Neue', color: s.color || '#fff' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
        gap: 6, marginBottom: 16 }}>
        {[
          { label: 'Eagles+', val: eagles, color: '#854d0e', bg: '#fef08a' },
          { label: 'Birdies', val: birdies, color: '#991b1b', bg: '#fecaca' },
          { label: 'Pars', val: pars, color: 'var(--tx)', bg: '#fff' },
          { label: 'Bogeys', val: bogeys, color: '#1e40af', bg: '#dbeafe' },
          { label: 'Doubles+', val: doubles, color: '#7f1d1d', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg,
            border: '1px solid var(--bd)', borderRadius: 10,
            padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: s.color, textTransform: 'uppercase',
              marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700,
              fontFamily: 'Bebas Neue', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Scorecard table */}
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--g1)', color: '#fff' }}>
              {['Hole','Par','Score','+/-'].map(col => (
                <th key={col} style={{ padding: '8px 4px', textAlign: 'center',
                  fontWeight: 500, fontSize: 10 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.slice(0, 9).map((h, i) => {
              const s = round.scores[i]
              const d = s !== null ? s - h.par : null
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.par}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par} size={18} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                </tr>
              )
            })}
            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>OUT {front9Par}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700 }}>{front9Played > 0 ? front9Strokes : '—'}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(front9Played > 0 ? front9Strokes - front9Par : null) }}>
                {front9Played > 0 ? getPlusMinus(front9Strokes - front9Par) : '—'}
              </td>
            </tr>
            {holes.slice(9).map((h, i) => {
              const idx = i + 9
              const s = round.scores[idx]
              const d = s !== null ? s - h.par : null
              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.par}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par} size={18} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                </tr>
              )
            })}
            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>IN {back9Par}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700 }}>{back9Played > 0 ? back9Strokes : '—'}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(back9Played > 0 ? back9Strokes - back9Par : null) }}>
                {back9Played > 0 ? getPlusMinus(back9Strokes - back9Par) : '—'}
              </td>
            </tr>
            <tr style={{ background: 'var(--g1)' }}>
              <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12, color: '#fff' }}>TOTAL</td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 14, color: '#4ade80' }}>
                {played.length > 0 ? totalStrokes : '—'}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12,
                color: diff < 0 ? '#4ade80' : diff > 0 ? '#fca5a5' : '#fff' }}>
                {played.length > 0 ? getPlusMinus(diff) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ThisRound({ scores, shotHistory, selectedCourse }) {
  const holeStats = loadHoleStats()

  const realHoles = (() => {
    try {
      const stored = localStorage.getItem('selected_course')
      if (stored) {
        const data = JSON.parse(stored)
        const holes = data?.course?.tees?.male?.[0]?.holes ||
                      data?.course?.tees?.female?.[0]?.holes
        if (holes) return holes.map(h => ({ par: h.par }))
      }
    } catch {}
    return defaultHoles
  })()

  const played = scores.map((s, i) => ({
    score: s, hole: i, par: realHoles[i]?.par || 4
  })).filter(h => h.score !== null)

  const totalStrokes = played.reduce((a, h) => a + h.score, 0)
  const totalPar = played.reduce((a, h) => a + h.par, 0)
  const holesPlayed = played.length
  const scoringAvg = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : '—'
  const vsParTotal = totalStrokes - totalPar

  const eagles = played.filter(h => h.score <= h.par - 2).length
  const birdies = played.filter(h => h.score === h.par - 1).length
  const pars = played.filter(h => h.score === h.par).length
  const bogeys = played.filter(h => h.score === h.par + 1).length
  const doubles = played.filter(h => h.score === h.par + 2).length
  const triplePlus = played.filter(h => h.score >= h.par + 3).length

  const puttData = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.putts)
    .map(([, s]) => s.putts)
  const totalPutts = puttData.reduce((a, b) => a + b, 0)
  const avgPutts = puttData.length > 0 ? (totalPutts / puttData.length).toFixed(1) : '—'

  const fairwayHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.fairway && s.fairway !== 'N/A')
  const fairwaysHit = fairwayHoles.filter(([, s]) => s.fairway === 'Yes').length

  const girHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.gir)
  const girsHit = girHoles.filter(([, s]) => s.gir === 'Yes').length

  const sandHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.sandSave && s.sandSave !== 'N/A')
  const sandSaves = sandHoles.filter(([, s]) => s.sandSave === 'Yes').length

  const totalPenalties = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.penalties !== undefined)
    .reduce((a, [, s]) => a + (s.penalties || 0), 0)

  const clubDistances = {}
  shotHistory.forEach(shot => {
    if (!clubDistances[shot.club]) clubDistances[shot.club] = []
    clubDistances[shot.club].push(shot.distance)
  })
  const clubAverages = Object.entries(clubDistances).map(([club, dists]) => ({
    club,
    avg: Math.round(dists.reduce((a, b) => a + b, 0) / dists.length),
    count: dists.length
  })).sort((a, b) => b.avg - a.avg)

  if (holesPlayed === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 20,
          textAlign: 'center', color: 'var(--tx2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            Stats update live during your round
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            Enter scores on the Card tab to start building your stats.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Round summary */}
      <div style={{ background: 'var(--g1)', borderRadius: 12,
        padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Round Summary · {holesPlayed} holes played
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Score', val: totalStrokes, color: '#fff' },
            { label: 'vs Par', val: vsParTotal === 0 ? 'E' : vsParTotal > 0
              ? '+' + vsParTotal : vsParTotal,
              color: vsParTotal < 0 ? '#4ade80' : vsParTotal > 0 ? '#fca5a5' : '#fff' },
            { label: 'Avg/Hole', val: scoringAvg, color: '#fff' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700,
                fontFamily: 'Bebas Neue', color: s.color, marginTop: 2 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Score Breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'Eagles+', val: eagles, color: '#854d0e', bg: '#fef08a' },
            { label: 'Birdies', val: birdies, color: '#991b1b', bg: '#fecaca' },
            { label: 'Pars', val: pars, color: 'var(--tx)', bg: '#fff' },
            { label: 'Bogeys', val: bogeys, color: '#1e40af', bg: '#dbeafe' },
            { label: 'Doubles', val: doubles, color: '#991b1b', bg: '#fee2e2' },
            { label: 'Triple+', val: triplePlus, color: '#7f1d1d', bg: '#fecaca' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg,
              border: '1px solid var(--bd)', borderRadius: 10,
              padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: s.color, textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700,
                fontFamily: 'Bebas Neue', color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Key stats */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Key Stats
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 12, overflow: 'hidden' }}>
          {fairwayHoles.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🌿 Fairways Hit</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {fairwaysHit}/{fairwayHoles.length}
                </div>
              </div>
              <ProgressBar value={fairwaysHit} max={fairwayHoles.length} color='#4ade80' />
            </div>
          )}
          {girHoles.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🟢 Greens in Reg</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{girsHit}/{girHoles.length}</div>
              </div>
              <ProgressBar value={girsHit} max={girHoles.length} color='#22c55e' />
            </div>
          )}
          {puttData.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⛳ Total Putts</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{totalPutts}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4 }}>
                {avgPutts} avg per hole
              </div>
            </div>
          )}
          {sandHoles.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⛱️ Sand Saves</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {sandSaves}/{sandHoles.length}
                </div>
              </div>
              <ProgressBar value={sandSaves} max={sandHoles.length} color='#f59e0b' />
            </div>
          )}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>⚠️ Penalties</div>
              <div style={{ fontSize: 13, fontWeight: 600,
                color: totalPenalties > 0 ? '#991b1b' : 'var(--tx)' }}>
                {totalPenalties}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Club distances */}
      {clubAverages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Actual Club Distances This Round
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--bd)',
            borderRadius: 12, overflow: 'hidden' }}>
            {clubAverages.map((c, i) => (
              <div key={c.club} style={{ padding: '10px 14px',
                borderBottom: i < clubAverages.length - 1 ? '1px solid var(--bd)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.club}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
                    {c.count} shot{c.count !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700,
                    fontFamily: 'Bebas Neue', color: 'var(--g2)' }}>
                    {c.avg} yds
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eagle tip */}
      {holesPlayed >= 9 && (
        <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            🎯 Eagle AI Tip
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            {girHoles.length > 0 && girsHit / girHoles.length < 0.3
              ? "Your GIR% is low — focus on approach shot accuracy on the back 9."
              : fairwayHoles.length > 0 && fairwaysHit / fairwayHoles.length < 0.4
              ? "Hitting more fairways will set up easier approach shots and lower your score."
              : avgPutts !== '—' && parseFloat(avgPutts) > 2
              ? "You're averaging over 2 putts per hole — focus on lag putting to save strokes."
              : totalPenalties > 2
              ? "Penalties are costing you strokes — play conservatively away from trouble."
              : "You're playing solid golf — stay patient and execute your game plan!"}
          </div>
        </div>
      )}
    </div>
  )
}

function RoundHistory({ roundHistory, onViewRound }) {
  if (roundHistory.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 20,
          textAlign: 'center', color: 'var(--tx2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏌️</div>
          <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            No rounds yet
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            Finish a round on the Card tab to see your history here.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        {roundHistory.length} round{roundHistory.length !== 1 ? 's' : ''} played
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roundHistory.map((round) => {
          const played = round.scores.filter(s => s !== null)
          const totalStrokes = round.scores.reduce((a, b) => b !== null ? a + b : a, 0)
          const totalPar = defaultHoles.slice(0, played.length)
            .reduce((a, h) => a + h.par, 0)
          const diff = totalStrokes - totalPar
          const date = new Date(round.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })
          return (
            <button key={round.id} onClick={() => onViewRound(round)}
              style={{ background: '#fff', border: '1px solid var(--bd)',
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textAlign: 'left' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)',
                  marginBottom: 4 }}>{round.course}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)' }}>
                  {date} · {played.length} holes
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700,
                  fontFamily: 'Bebas Neue', color: 'var(--tx)' }}>
                  {totalStrokes}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600,
                  color: getPlusMinusColor(diff) }}>
                  {getPlusMinus(diff)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Stats({ scores, shotHistory = [], roundHistory = [], selectedCourse }) {
  const [activeTab, setActiveTab] = useState('this')
  const [viewingRound, setViewingRound] = useState(null)

  if (viewingRound) {
    return <RoundDetail round={viewingRound} onBack={() => setViewingRound(null)} />
  }

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: 'flex', background: '#fff',
        borderBottom: '1px solid var(--bd)', padding: '0 16px' }}>
        {[
          { id: 'this', label: 'This Round' },
          { id: 'history', label: 'Round History' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, border: 'none', background: 'transparent',
              padding: '12px 8px', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? 'var(--g2)' : 'var(--tx2)',
              borderBottom: activeTab === tab.id ? '2px solid var(--g2)' : '2px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'this' && (
        <ThisRound scores={scores} shotHistory={shotHistory} selectedCourse={selectedCourse} />
      )}
      {activeTab === 'history' && (
        <RoundHistory roundHistory={roundHistory} onViewRound={setViewingRound} />
      )}
    </div>
  )
}