import { useState, useEffect } from 'react'

const defaultHoles = [
  {par:4,yards:412,hcp:7},{par:5,yards:531,hcp:3},{par:3,yards:178,hcp:15},
  {par:4,yards:387,hcp:11},{par:4,yards:445,hcp:1},{par:3,yards:152,hcp:17},
  {par:5,yards:568,hcp:5},{par:4,yards:398,hcp:9},{par:4,yards:421,hcp:13},
  {par:4,yards:403,hcp:8},{par:5,yards:544,hcp:2},{par:3,yards:169,hcp:16},
  {par:4,yards:415,hcp:10},{par:4,yards:462,hcp:4},{par:3,yards:195,hcp:14},
  {par:5,yards:552,hcp:6},{par:4,yards:391,hcp:12},{par:4,yards:437,hcp:18},
]

function ScoreDisplay({ score, par, size = 24 }) {
  if (score === null) return <span>—</span>
  const diff = score - par
  const numStyle = {
    fontSize: size * 0.5, fontWeight: 600, color: 'var(--tx)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 1,
  }
  if (score === 1) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: size + 8, height: size + 8 }}>
        <span style={{ position: 'absolute', width: size + 8, height: size + 8,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={{ position: 'absolute', width: size, height: size,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={numStyle}>1</span>
      </span>
    )
  } else if (diff <= -2) {
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: size + 8, height: size + 8 }}>
        <span style={{ position: 'absolute', width: size + 8, height: size + 8,
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
        alignItems: 'center', justifyContent: 'center',
        width: size + 8, height: size + 8 }}>
        <span style={{ position: 'absolute', width: size + 8, height: size + 8,
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

function getPlusMinus(diff) {
  if (diff === null) return '—'
  if (diff === 0) return 'E'
  if (diff > 0) return '+' + diff
  return diff
}

function getPlusMinusColor(diff) {
  if (diff === null) return 'var(--tx2)'
  if (diff < 0) return '#166534'
  if (diff > 0) return '#991b1b'
  return 'var(--tx2)'
}

function loadHoleStats() {
  try { return JSON.parse(localStorage.getItem('hole_stats') || '{}') }
  catch { return {} }
}

function saveHoleStats(stats) {
  localStorage.setItem('hole_stats', JSON.stringify(stats))
}

export default function Scorecard({ scores, setScores, currentHole,
  setCurrentHole, selectedCourse, onFinishRound, onClearRound }) {
  const [customInput, setCustomInput] = useState('')
  const [holeStats, setHoleStats] = useState(loadHoleStats)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [courseRating, setCourseRating] = useState('')
  const [slopeRating, setSlopeRating] = useState('')

  useEffect(() => {
    const allNull = scores.every(s => s === null)
    if (allNull) {
      setHoleStats({})
    }
  }, [scores])

  const isGolfAPI = selectedCourse?.course?.isGolfAPI
  const chosenTee = selectedCourse?.course?.chosenTee

  const realHoles = selectedCourse?.course?.holes ||
                    selectedCourse?.course?.tees?.male?.[0]?.holes ||
                    selectedCourse?.course?.tees?.female?.[0]?.holes || null

  const holes = realHoles
    ? realHoles.map((h, i) => ({
        par: h.par || null,
        yards: h.yardage || h.yards || chosenTee?.[`length${i + 1}`] || null,
        hcp: h.handicap || h.hcp || null,
      }))
    : isGolfAPI && chosenTee
    ? Array.from({ length: 18 }, (_, i) => ({
        par: null,
        yards: chosenTee[`length${i + 1}`] || null,
        hcp: null,
      }))
    : defaultHoles

  const h = holes[currentHole]
  const played = scores.filter(s => s !== null)
  const totalStrokes = scores.reduce((a, b) => b !== null ? a + b : a, 0)

  const holesWithPar = holes.filter(hole => hole.par)
  const totalPar = holesWithPar.length > 0
    ? holes.slice(0, played.length).reduce((a, hole) => hole.par ? a + hole.par : a, 0)
    : null
  const diff = totalPar !== null ? totalStrokes - totalPar : null

  const front9Strokes = scores.slice(0, 9).reduce((a, b) => b !== null ? a + b : a, 0)
  const front9Par = holesWithPar.length > 0
    ? holes.slice(0, 9).reduce((a, h) => h.par ? a + h.par : a, 0)
    : null
  const front9Played = scores.slice(0, 9).filter(s => s !== null).length
  const front9Putts = Object.entries(holeStats)
    .filter(([i]) => parseInt(i) < 9 && holeStats[i]?.putts)
    .reduce((a, [, s]) => a + (s.putts || 0), 0)

  const back9Strokes = scores.slice(9).reduce((a, b) => b !== null ? a + b : a, 0)
  const back9Par = holesWithPar.length > 0
    ? holes.slice(9).reduce((a, h) => h.par ? a + h.par : a, 0)
    : null
  const back9Played = scores.slice(9).filter(s => s !== null).length
  const back9Putts = Object.entries(holeStats)
    .filter(([i]) => parseInt(i) >= 9 && holeStats[i]?.putts)
    .reduce((a, [, s]) => a + (s.putts || 0), 0)

  const totalPutts = front9Putts + back9Putts

  const defaultRating = selectedCourse?.course?.courseRating ||
                        chosenTee?.courseRatingMen || ''
  const defaultSlope = selectedCourse?.course?.slope ||
                       chosenTee?.slopeMen || ''

  function setScore(val) {
    const next = [...scores]
    next[currentHole] = val
    setScores(next)
  }

  function submitCustomScore() {
    const val = parseInt(customInput)
    if (val > 0) { setScore(val); setCustomInput('') }
  }

  function updateHoleStat(key, val) {
    const updated = {
      ...holeStats,
      [currentHole]: { ...holeStats[currentHole], [key]: val }
    }
    setHoleStats(updated)
    saveHoleStats(updated)
  }

  function getHoleStat(key) { return holeStats[currentHole]?.[key] }
  function getPutts() { return holeStats[currentHole]?.putts || null }
  function setPutts(val) { updateHoleStat('putts', val) }

  const par = h?.par || 4
  const allOptions = [{ label: 'HIO', val: 1 }]
  if (par >= 4) allOptions.push({ label: par === 5 ? 'Albatross' : 'Eagle', val: 2 })
  if (par >= 4) allOptions.push({ label: par === 5 ? 'Eagle' : 'Birdie', val: 3 })
  if (par === 3) allOptions.push({ label: 'Birdie', val: 2 })
  if (par >= 4) allOptions.push({ label: 'Birdie', val: par - 1 })
  allOptions.push({ label: 'Par', val: par })
  allOptions.push({ label: 'Bogey', val: par + 1 })
  allOptions.push({ label: '+2', val: par + 2 })
  allOptions.push({ label: '+3', val: par + 3 })
  const seen = new Set()
  const scoreOptions = allOptions.filter(o => {
    if (o.val <= 0 || seen.has(o.val)) return false
    seen.add(o.val)
    return true
  }).sort((a, b) => a.val - b.val)

  return (
    <div style={{ padding: 16 }}>

      {selectedCourse && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)',
          marginBottom: 4, textAlign: 'center' }}>
          ⛳ {selectedCourse.course?.club_name}
        </div>
      )}
      {selectedCourse?.course?.selectedTeeLabel && (
        <div style={{ fontSize: 11, color: 'var(--tx2)',
          marginBottom: 12, textAlign: 'center' }}>
          {selectedCourse.course.selectedTeeLabel} Tees
          {selectedCourse.course.courseRating &&
            ` · Rating ${selectedCourse.course.courseRating}`}
          {selectedCourse.course.slope &&
            ` · Slope ${selectedCourse.course.slope}`}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Strokes', val: played.length > 0 ? totalStrokes : '—',
            color: 'var(--tx)' },
          { label: 'vs Par', val: played.length > 0 && diff !== null
            ? getPlusMinus(diff) : '—',
            color: getPlusMinusColor(played.length > 0 ? diff : null) },
          { label: 'Holes', val: played.length + '/18', color: 'var(--tx)' },
          { label: 'Putts', val: totalPutts > 0 ? totalPutts : '—',
            color: 'var(--tx)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', borderRadius: 10,
            padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx2)', textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color, marginTop: 2 }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 600 }}>
            Hole {currentHole + 1} {h?.par ? `— Par ${h.par}` : ''}
          </div>
          {scores[currentHole] !== null && (
            <ScoreDisplay score={scores[currentHole]} par={par} size={28} />
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 12 }}>
          {h?.yards ? `${h.yards} yards` : '— yards'}
          {h?.hcp ? ` · Hcp ${h.hcp}` : ''}
          {' · Tap your score'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 6, marginBottom: 12 }}>
          {scoreOptions.map(o => {
            const selected = scores[currentHole] === o.val
            return (
              <button key={o.val} onClick={() => setScore(o.val)}
                style={{ border: selected
                  ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 10,
                  background: selected ? 'rgba(45,138,84,0.1)' : '#fff',
                  padding: '8px 4px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--tx2)',
                  textTransform: 'uppercase', marginBottom: 6 }}>{o.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ScoreDisplay score={o.val} par={par} size={22} />
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)', whiteSpace: 'nowrap' }}>
            Other:
          </div>
          <input type="number" value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCustomScore()}
            placeholder="e.g. 9" min={1}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
              padding: '8px 10px', fontSize: 14, textAlign: 'center' }} />
          <button onClick={submitCustomScore}
            style={{ background: 'var(--g1)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600 }}>Set</button>
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 8 }}>Putts</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4].map(p => (
              <button key={p} onClick={() => setPutts(p)}
                style={{ flex: 1, border: getPutts() === p
                  ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 8,
                  background: getPutts() === p ? 'rgba(45,138,84,0.1)' : '#fff',
                  padding: '8px 4px', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600 }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 10 }}>Hole Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {par >= 4 && (
              <div style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: 'var(--tx)' }}>🌿 Fairway Hit</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Yes', 'No', 'N/A'].map(v => (
                    <button key={v} onClick={() => updateHoleStat('fairway', v)}
                      style={{ border: getHoleStat('fairway') === v
                        ? '2px solid var(--g3)' : '1px solid var(--bd)',
                        borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        background: getHoleStat('fairway') === v
                          ? 'rgba(45,138,84,0.1)' : '#fff',
                        color: getHoleStat('fairway') === v
                          ? 'var(--g2)' : 'var(--tx2)' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--tx)' }}>🟢 GIR</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Yes', 'No'].map(v => (
                  <button key={v} onClick={() => updateHoleStat('gir', v)}
                    style={{ border: getHoleStat('gir') === v
                      ? '2px solid var(--g3)' : '1px solid var(--bd)',
                      borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600,
                      background: getHoleStat('gir') === v
                        ? 'rgba(45,138,84,0.1)' : '#fff',
                      color: getHoleStat('gir') === v
                        ? 'var(--g2)' : 'var(--tx2)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--tx)' }}>⛱️ Sand Save</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Yes', 'No', 'N/A'].map(v => (
                  <button key={v} onClick={() => updateHoleStat('sandSave', v)}
                    style={{ border: getHoleStat('sandSave') === v
                      ? '2px solid var(--g3)' : '1px solid var(--bd)',
                      borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600,
                      background: getHoleStat('sandSave') === v
                        ? 'rgba(45,138,84,0.1)' : '#fff',
                      color: getHoleStat('sandSave') === v
                        ? 'var(--g2)' : 'var(--tx2)' }}>
                      {v}
                    </button>
                  ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--tx)' }}>⚠️ Penalties</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(v => (
                  <button key={v} onClick={() => updateHoleStat('penalties', v)}
                    style={{ border: getHoleStat('penalties') === v
                      ? '2px solid var(--g3)' : '1px solid var(--bd)',
                      borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: getHoleStat('penalties') === v
                        ? 'rgba(45,138,84,0.1)' : '#fff',
                      color: getHoleStat('penalties') === v
                        ? 'var(--g2)' : 'var(--tx2)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
              background: '#fff', padding: '8px', cursor: 'pointer', fontSize: 13 }}>
            ← Prev hole
          </button>
          <button onClick={() => setCurrentHole(Math.min(17, currentHole + 1))}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
              background: '#fff', padding: '8px', cursor: 'pointer', fontSize: 13 }}>
            Next hole →
          </button>
        </div>
      </div>

      {played.length > 0 && !showFinishConfirm && !showClearConfirm && (
        <button onClick={() => setShowClearConfirm(true)}
          style={{ width: '100%', background: '#fff',
            border: '1px solid #fca5a5', borderRadius: 12,
            padding: '12px', marginBottom: 8,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            color: '#991b1b' }}>
          🗑️ Clear Round
        </button>
      )}

      {showClearConfirm && (
        <div style={{ background: '#fee2e2', borderRadius: 12,
          padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
            Clear this round?
          </div>
          <div style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 14 }}>
            All scores and stats will be reset. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              setHoleStats({})
              saveHoleStats({})
              onClearRound()
              setShowClearConfirm(false)
            }}
              style={{ flex: 1, background: '#991b1b', border: 'none',
                borderRadius: 10, padding: '12px', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, color: '#fff' }}>
              Yes, clear round
            </button>
            <button onClick={() => setShowClearConfirm(false)}
              style={{ flex: 1, background: '#fff',
                border: '1px solid #fca5a5', borderRadius: 10,
                padding: '12px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, color: '#991b1b' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {played.length >= 9 && !showFinishConfirm && !showClearConfirm && (
        <button onClick={() => setShowFinishConfirm(true)}
          style={{ width: '100%', background: '#4ade80', border: 'none',
            borderRadius: 12, padding: '14px', marginBottom: 16,
            fontWeight: 700, fontSize: 16, cursor: 'pointer', color: '#1a3a2a' }}>
          🏁 Finish Round
        </button>
      )}

      {showFinishConfirm && (
        <div style={{ background: 'var(--g1)', borderRadius: 12,
          padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            🏁 Finish this round?
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            {played.length} holes · {totalStrokes} strokes
            {diff !== null ? ` · ${getPlusMinus(diff)} vs par` : ''}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10,
            padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)',
              marginBottom: 10, lineHeight: 1.5 }}>
              📊 Course Rating and Slope for handicap calculation:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  marginBottom: 6 }}>Course Rating</div>
                <input type="number"
                  value={courseRating || defaultRating}
                  onChange={e => setCourseRating(e.target.value)}
                  placeholder="e.g. 74.9" step="0.1"
                  style={{ width: '100%', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 14,
                    background: 'rgba(255,255,255,0.1)', color: '#fff',
                    boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  marginBottom: 6 }}>Slope Rating</div>
                <input type="number"
                  value={slopeRating || defaultSlope}
                  onChange={e => setSlopeRating(e.target.value)}
                  placeholder="e.g. 144"
                  style={{ width: '100%', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 14,
                    background: 'rgba(255,255,255,0.1)', color: '#fff',
                    boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
              {defaultRating
                ? '✅ Auto-filled from course data — edit if needed'
                : 'Skip if you don\'t have these — your round will still be saved'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              onFinishRound(
                courseRating ? parseFloat(courseRating) :
                  defaultRating ? parseFloat(defaultRating) : null,
                slopeRating ? parseFloat(slopeRating) :
                  defaultSlope ? parseFloat(defaultSlope) : null
              )
              setShowFinishConfirm(false)
              setCourseRating('')
              setSlopeRating('')
            }}
              style={{ flex: 1, background: '#4ade80', border: 'none',
                borderRadius: 10, padding: '12px', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, color: '#1a3a2a' }}>
              ✅ Save Round
            </button>
            <button onClick={() => setShowFinishConfirm(false)}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '12px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, color: '#fff' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--g1)', color: '#fff' }}>
              {['Hole','Par','Yds','Score','+/-','Putts'].map(col => (
                <th key={col} style={{ padding: '8px 4px', textAlign: 'center',
                  fontWeight: 500, fontSize: 10 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.slice(0, 9).map((h, i) => {
              const s = scores[i]
              const d = s !== null && h.par ? s - h.par : null
              const putts = holeStats[i]?.putts
              return (
                <tr key={i} onClick={() => setCurrentHole(i)}
                  style={{ background: i === currentHole
                    ? 'rgba(45,138,84,0.07)' : '#fff',
                    cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontWeight: i === currentHole ? 700 : 400 }}>{i + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    {h.par || '—'}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    {h.yards || '—'}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par || 4} size={22} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, color: putts === 1 ? '#166534'
                      : putts >= 3 ? '#991b1b' : 'var(--tx2)' }}>
                    {putts || '—'}
                  </td>
                </tr>
              )
            })}

            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>OUT</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 11 }}>
                {front9Par || '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12 }}>
                {front9Played > 0 ? front9Strokes : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(front9Played > 0 && front9Par
                  ? front9Strokes - front9Par : null) }}>
                {front9Played > 0 && front9Par
                  ? getPlusMinus(front9Strokes - front9Par) : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>
                {front9Putts > 0 ? front9Putts : '—'}
              </td>
            </tr>

            {holes.slice(9).map((h, i) => {
              const idx = i + 9
              const s = scores[idx]
              const d = s !== null && h.par ? s - h.par : null
              const putts = holeStats[idx]?.putts
              return (
                <tr key={idx} onClick={() => setCurrentHole(idx)}
                  style={{ background: idx === currentHole
                    ? 'rgba(45,138,84,0.07)' : '#fff',
                    cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontWeight: idx === currentHole ? 700 : 400 }}>{idx + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    {h.par || '—'}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    {h.yards || '—'}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par || 4} size={22} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, color: putts === 1 ? '#166534'
                      : putts >= 3 ? '#991b1b' : 'var(--tx2)' }}>
                    {putts || '—'}
                  </td>
                </tr>
              )
            })}

            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>IN</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 11 }}>
                {back9Par || '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12 }}>
                {back9Played > 0 ? back9Strokes : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(back9Played > 0 && back9Par
                  ? back9Strokes - back9Par : null) }}>
                {back9Played > 0 && back9Par
                  ? getPlusMinus(back9Strokes - back9Par) : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>
                {back9Putts > 0 ? back9Putts : '—'}
              </td>
            </tr>

            <tr style={{ background: 'var(--g1)' }}>
              <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12, color: '#fff' }}>TOTAL</td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 12, color: '#fff' }}>
                {front9Par && back9Par ? front9Par + back9Par : '—'}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 14, color: '#4ade80' }}>
                {played.length > 0 ? totalStrokes : '—'}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12,
                color: diff !== null
                  ? (diff < 0 ? '#4ade80' : diff > 0 ? '#fca5a5' : '#fff')
                  : '#fff' }}>
                {played.length > 0 && diff !== null ? getPlusMinus(diff) : '—'}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12, color: '#4ade80' }}>
                {totalPutts > 0 ? totalPutts : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}