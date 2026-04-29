import { useState, useEffect } from 'react'

function calculateHandicap(rounds) {
  if (rounds.length === 0) return null

  // Calculate score differential for each round
  const differentials = rounds
    .filter(r => r.courseRating && r.slope && r.score)
    .map(r => {
      const diff = (r.score - r.courseRating) * (113 / r.slope)
      return { ...r, differential: parseFloat(diff.toFixed(1)) }
    })

  if (differentials.length === 0) return null

  // Use last 20 rounds max
  const last20 = differentials.slice(0, 20)

  // Number of differentials to use based on rounds played
  let numToUse
  if (last20.length <= 3) numToUse = 1
  else if (last20.length <= 4) numToUse = 1
  else if (last20.length <= 5) numToUse = 1
  else if (last20.length <= 6) numToUse = 2
  else if (last20.length <= 8) numToUse = 2
  else if (last20.length <= 9) numToUse = 3
  else if (last20.length <= 11) numToUse = 3
  else if (last20.length <= 12) numToUse = 4
  else if (last20.length <= 14) numToUse = 4
  else if (last20.length <= 15) numToUse = 5
  else if (last20.length <= 16) numToUse = 6
  else if (last20.length <= 17) numToUse = 7
  else if (last20.length <= 18) numToUse = 8
  else if (last20.length <= 19) numToUse = 8
  else numToUse = 8

  // Sort by lowest differential and take best ones
  const sorted = [...last20].sort((a, b) => a.differential - b.differential)
  const best = sorted.slice(0, numToUse)
  const avgDiff = best.reduce((a, b) => a + b.differential, 0) / best.length
  const handicapIndex = parseFloat((avgDiff * 0.96).toFixed(1))

  return {
    index: handicapIndex,
    differentials: last20,
    bestRounds: best.map(r => r.id),
    numUsed: numToUse
  }
}

function TrendChart({ rounds }) {
  if (rounds.length < 2) return null
  const last10 = rounds.slice(0, 10).reverse()
  const diffs = last10.map(r => r.differential).filter(Boolean)
  if (diffs.length < 2) return null

  const min = Math.min(...diffs)
  const max = Math.max(...diffs)
  const range = max - min || 1
  const width = 280
  const height = 80

  const points = diffs.map((d, i) => ({
    x: (i / (diffs.length - 1)) * width,
    y: height - ((d - min) / range) * height
  }))

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', marginBottom: 8 }}>
        Differential Trend (last {diffs.length} rounds)
      </div>
      <svg width={width} height={height + 10} style={{ overflow: 'visible' }}>
        <path d={pathD} fill="none" stroke="#4ade80" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4"
            fill="#4ade80" stroke="#1a3a2a" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  )
}

export default function Handicap({ onBack }) {
  const [roundHistory, setRoundHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('round_history') || '[]') }
    catch { return [] }
  })

  const roundsWithRatings = roundHistory.filter(r => r.courseRating && r.slope)
  const result = calculateHandicap(roundsWithRatings)
  const handicapIndex = result?.index
  const differentials = result?.differentials || []
  const bestRounds = result?.bestRounds || []

  function getHandicapLabel(hcp) {
    if (hcp === null) return '—'
    if (hcp <= 0) return 'Scratch or better'
    if (hcp <= 5) return 'Low handicapper'
    if (hcp <= 12) return 'Mid handicapper'
    if (hcp <= 20) return 'High handicapper'
    return 'Beginner'
  }

  function getTrend() {
    if (differentials.length < 3) return null
    const recent = differentials.slice(0, 3).reduce((a, r) => a + r.differential, 0) / 3
    const older = differentials.slice(3, 6).reduce((a, r) => a + r.differential, 0) /
      Math.min(3, differentials.slice(3, 6).length)
    if (!older) return null
    const diff = recent - older
    if (diff < -0.5) return { label: '📈 Improving', color: '#4ade80' }
    if (diff > 0.5) return { label: '📉 Getting higher', color: '#fca5a5' }
    return { label: '➡️ Stable', color: '#fff' }
  }

  const trend = getTrend()

  return (
    <div style={{ padding: 16 }}>

      {/* Back button */}
      <button onClick={onBack}
        style={{ border: '1px solid var(--bd)', borderRadius: 8,
          background: '#fff', padding: '6px 14px', cursor: 'pointer',
          fontSize: 13, marginBottom: 16 }}>← Back</button>

      {/* Header */}
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 26,
        marginBottom: 4 }}>My Handicap</div>
      <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 16 }}>
        Calculated using World Handicap System (WHS)
      </div>

      {/* Main handicap display */}
      <div style={{ background: 'var(--g1)', borderRadius: 14,
        padding: 20, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Handicap Index
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, fontFamily: 'Bebas Neue',
            color: '#4ade80', lineHeight: 1 }}>
            {handicapIndex !== null ? handicapIndex : '—'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            {getHandicapLabel(handicapIndex)}
          </div>
          {trend && (
            <div style={{ fontSize: 12, fontWeight: 600,
              color: trend.color, marginTop: 6 }}>
              {trend.label}
            </div>
          )}
        </div>

        {differentials.length >= 2 && <TrendChart rounds={differentials} />}

        {result && (
          <div style={{ marginTop: 12, padding: '10px 12px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
              marginBottom: 4 }}>
              Best {result.numUsed} of {differentials.length} rounds used
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Average differential × 0.96
            </div>
          </div>
        )}
      </div>

      {/* Rounds need info */}
      {roundsWithRatings.length === 0 && roundHistory.length > 0 && (
        <div style={{ background: '#fef3c7', borderRadius: 12,
          padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e',
            marginBottom: 4 }}>
            ⚠️ Course ratings needed
          </div>
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
            You have {roundHistory.length} round{roundHistory.length !== 1 ? 's' : ''} saved
            but no Course Rating or Slope data. These are needed for WHS calculation.
            Enter them when finishing your next round.
          </div>
        </div>
      )}

      {roundHistory.length === 0 && (
        <div style={{ background: 'var(--bg2)', borderRadius: 12,
          padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⛳</div>
          <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            No rounds yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>
            Finish a round on the Card tab to start tracking your handicap.
            You need at least 3 rounds for a handicap calculation.
          </div>
        </div>
      )}

      {/* Round differentials */}
      {differentials.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Score Differentials
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--bd)',
            borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              padding: '8px 14px', background: 'var(--bg2)',
              fontSize: 10, color: 'var(--tx2)', textTransform: 'uppercase',
              letterSpacing: '0.05em', fontWeight: 600 }}>
              <div>Course</div>
              <div style={{ textAlign: 'center', minWidth: 40 }}>Score</div>
              <div style={{ textAlign: 'center', minWidth: 40 }}>Diff</div>
              <div style={{ textAlign: 'center', minWidth: 30 }}>⭐</div>
            </div>
            {differentials.map((r, i) => {
              const isBest = bestRounds.includes(r.id)
              const date = new Date(r.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric'
              })
              return (
                <div key={r.id} style={{ display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  padding: '10px 14px',
                  borderBottom: i < differentials.length - 1
                    ? '1px solid var(--bd)' : 'none',
                  background: isBest ? 'rgba(74,222,128,0.06)' : '#fff' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600,
                      color: 'var(--tx)' }}>{r.course}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx2)' }}>{date}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 40,
                    fontSize: 13, fontWeight: 600, color: 'var(--tx)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.score}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 40,
                    fontSize: 13, fontWeight: 700,
                    color: r.differential < 0 ? '#166534' : 'var(--tx)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.differential}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isBest ? '⭐' : ''}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 8,
            textAlign: 'center' }}>
            ⭐ = rounds used in handicap calculation
          </div>
        </div>
      )}
    </div>
  )
}