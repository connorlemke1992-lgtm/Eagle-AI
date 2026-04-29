function loadHoleStats() {
  try {
    return JSON.parse(localStorage.getItem('hole_stats') || '{}')
  } catch { return {} }
}

const defaultHoles = [
  {par:4},{par:5},{par:3},{par:4},{par:4},{par:3},
  {par:5},{par:4},{par:4},{par:4},{par:5},{par:3},
  {par:4},{par:4},{par:3},{par:5},{par:4},{par:4},
]

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

export default function Stats({ scores, shotHistory = [] }) {
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

  const played = scores.map((s, i) => ({ score: s, hole: i, par: realHoles[i]?.par || 4 }))
    .filter(h => h.score !== null)

  const totalStrokes = played.reduce((a, h) => a + h.score, 0)
  const totalPar = played.reduce((a, h) => a + h.par, 0)
  const holesPlayed = played.length
  const scoringAvg = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : '—'
  const vsParTotal = totalStrokes - totalPar

  // Score breakdown
  const eagles = played.filter(h => h.score <= h.par - 2).length
  const birdies = played.filter(h => h.score === h.par - 1).length
  const pars = played.filter(h => h.score === h.par).length
  const bogeys = played.filter(h => h.score === h.par + 1).length
  const doubles = played.filter(h => h.score === h.par + 2).length
  const triplePlus = played.filter(h => h.score >= h.par + 3).length

  // Putts
  const puttData = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.putts)
    .map(([, s]) => s.putts)
  const totalPutts = puttData.reduce((a, b) => a + b, 0)
  const avgPutts = puttData.length > 0 ? (totalPutts / puttData.length).toFixed(1) : '—'

  // Fairways
  const fairwayHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.fairway && s.fairway !== 'N/A')
  const fairwaysHit = fairwayHoles.filter(([, s]) => s.fairway === 'Yes').length
  const fairwayPct = fairwayHoles.length > 0
    ? Math.round((fairwaysHit / fairwayHoles.length) * 100) : null

  // GIR
  const girHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.gir)
  const girsHit = girHoles.filter(([, s]) => s.gir === 'Yes').length
  const girPct = girHoles.length > 0
    ? Math.round((girsHit / girHoles.length) * 100) : null

  // Sand saves
  const sandHoles = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.sandSave && s.sandSave !== 'N/A')
  const sandSaves = sandHoles.filter(([, s]) => s.sandSave === 'Yes').length
  const sandPct = sandHoles.length > 0
    ? Math.round((sandSaves / sandHoles.length) * 100) : null

  // Penalties
  const totalPenalties = Object.entries(holeStats)
    .filter(([i, s]) => scores[i] !== null && s.penalties !== undefined)
    .reduce((a, [, s]) => a + (s.penalties || 0), 0)

  // Shot tracking stats
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
            { label: 'vs Par', val: vsParTotal === 0 ? 'E' : vsParTotal > 0 ? '+' + vsParTotal : vsParTotal,
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

          {/* Fairways */}
          {fairwayPct !== null && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🌿 Fairways Hit</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {fairwaysHit}/{fairwayHoles.length}
                </div>
              </div>
              <ProgressBar value={fairwaysHit} max={fairwayHoles.length} color='#4ade80' />
            </div>
          )}

          {/* GIR */}
          {girPct !== null && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🟢 Greens in Reg</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {girsHit}/{girHoles.length}
                </div>
              </div>
              <ProgressBar value={girsHit} max={girHoles.length} color='#22c55e' />
            </div>
          )}

          {/* Putts */}
          {puttData.length > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⛳ Total Putts</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{totalPutts}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4 }}>
                {avgPutts} avg per hole tracked
              </div>
            </div>
          )}

          {/* Sand saves */}
          {sandPct !== null && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⛱️ Sand Saves</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {sandSaves}/{sandHoles.length}
                </div>
              </div>
              <ProgressBar value={sandSaves} max={sandHoles.length} color='#f59e0b' />
            </div>
          )}

          {/* Penalties */}
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

      {/* Club distances from shot tracking */}
      {clubAverages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Your Actual Club Distances This Round
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

      {/* Tip from Eagle */}
      {holesPlayed >= 9 && (
        <div style={{ background: 'var(--g1)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            🎯 Eagle AI Tip
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            {girPct !== null && girPct < 30
              ? "Your GIR% is low — focus on approach shot accuracy on the back 9."
              : fairwayPct !== null && fairwayPct < 40
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