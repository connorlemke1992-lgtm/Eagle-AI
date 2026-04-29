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
    fontSize: size * 0.5,
    fontWeight: 600,
    color: 'var(--tx)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  }

  if (score === 1) {
    // Hole in one — number 1 with two circles
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
  } else if (diff <= -3) {
    // Albatross — two circles
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
  } else if (diff === -2) {
    // Eagle — two circles
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
    // Birdie — one circle
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: size, height: size }}>
        <span style={{ position: 'absolute', width: size, height: size,
          borderRadius: '50%', border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else if (diff === 0) {
    // Par — just the number
    return <span style={numStyle}>{score}</span>
  } else if (diff === 1) {
    // Bogey — one square
    return (
      <span style={{ position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: size, height: size }}>
        <span style={{ position: 'absolute', width: size, height: size,
          border: '1.5px solid #111' }} />
        <span style={numStyle}>{score}</span>
      </span>
    )
  } else if (diff === 2) {
    // Double bogey — two squares
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
    // Triple+ — just the number
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

export default function Scorecard({ scores, setScores, currentHole, setCurrentHole, selectedCourse }) {
  const [customInput, setCustomInput] = useState('')

  const realHoles = selectedCourse?.course?.tees?.male?.[0]?.holes ||
                    selectedCourse?.course?.tees?.female?.[0]?.holes || null
  const holes = realHoles
    ? realHoles.map(h => ({ par: h.par, yards: h.yardage, hcp: h.handicap }))
    : defaultHoles

  const h = holes[currentHole]
  const played = scores.filter(s => s !== null)
  const totalStrokes = scores.reduce((a, b) => b !== null ? a + b : a, 0)
  const totalPar = holes.slice(0, played.length).reduce((a, h) => a + h.par, 0)
  const diff = totalStrokes - totalPar

  const front9Strokes = scores.slice(0, 9).reduce((a, b) => b !== null ? a + b : a, 0)
  const front9Par = holes.slice(0, 9).reduce((a, h) => a + h.par, 0)
  const front9Played = scores.slice(0, 9).filter(s => s !== null).length

  const back9Strokes = scores.slice(9).reduce((a, b) => b !== null ? a + b : a, 0)
  const back9Par = holes.slice(9).reduce((a, h) => a + h.par, 0)
  const back9Played = scores.slice(9).filter(s => s !== null).length

  function setScore(val) {
    const next = [...scores]
    next[currentHole] = val
    setScores(next)
  }

  function submitCustomScore() {
    const val = parseInt(customInput)
    if (val > 0) {
      setScore(val)
      setCustomInput('')
    }
  }

  function setPutts(val) {
    try {
      const stored = JSON.parse(localStorage.getItem('putts') || '[]')
      stored[currentHole] = val
      localStorage.setItem('putts', JSON.stringify(stored))
    } catch {}
  }

  function getPutts() {
    try {
      const stored = JSON.parse(localStorage.getItem('putts') || '[]')
      return stored[currentHole] || null
    } catch { return null }
  }

  const scoreOptions = [
    { label: 'HIO', val: 1 },
    { label: h.par >= 5 ? 'Albatross' : 'Eagle', val: h.par - 2 },
    { label: 'Birdie', val: h.par - 1 },
    { label: 'Par', val: h.par },
    { label: 'Bogey', val: h.par + 1 },
    { label: '+2', val: h.par + 2 },
    { label: '+3', val: h.par + 3 },
  ].filter(o => o.val > 0)

  return (
    <div style={{ padding: 16 }}>

      {/* Course name */}
      {selectedCourse && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)',
          marginBottom: 12, textAlign: 'center' }}>
          ⛳ {selectedCourse.course?.club_name}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Strokes', val: played.length > 0 ? totalStrokes : '—',
            color: 'var(--tx)' },
          { label: 'vs Par', val: played.length > 0 ? getPlusMinus(diff) : '—',
            color: getPlusMinusColor(played.length > 0 ? diff : null) },
          { label: 'Holes', val: played.length + '/18', color: 'var(--tx)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', borderRadius: 10,
            padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx2)', textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color, marginTop: 2 }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Score entry */}
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 600 }}>
            Hole {currentHole + 1} — Par {h.par}
          </div>
          {scores[currentHole] !== null && (
            <ScoreDisplay score={scores[currentHole]} par={h.par} size={28} />
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 12 }}>
          {h.yards} yards · Hcp {h.hcp} · Tap your score
        </div>

        {/* Score buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 6, marginBottom: 12 }}>
          {scoreOptions.map(o => {
            const selected = scores[currentHole] === o.val
            return (
              <button key={o.val} onClick={() => setScore(o.val)}
                style={{ border: selected ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 10,
                  background: selected ? 'rgba(45,138,84,0.1)' : '#fff',
                  padding: '8px 4px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--tx2)',
                  textTransform: 'uppercase', marginBottom: 6 }}>{o.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ScoreDisplay score={o.val} par={h.par} size={22} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Custom score input for high scores */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12,
          alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)', whiteSpace: 'nowrap' }}>
            Other score:
          </div>
          <input
            type="number"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCustomScore()}
            placeholder="e.g. 9"
            min={1}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
              padding: '8px 10px', fontSize: 14, textAlign: 'center' }}
          />
          <button onClick={submitCustomScore}
            style={{ background: 'var(--g1)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600 }}>
            Set
          </button>
        </div>

        {/* Putts tracker */}
        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: 8 }}>Putts</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4].map(p => (
              <button key={p} onClick={() => setPutts(p)}
                style={{ flex: 1, border: getPutts() === p
                  ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 8, background: getPutts() === p
                    ? 'rgba(45,138,84,0.1)' : '#fff',
                  padding: '8px 4px', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600 }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Prev/Next */}
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

      {/* Scorecard table */}
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--g1)', color: '#fff' }}>
              {['Hole','Par','Yds','Score','+/-'].map(col => (
                <th key={col} style={{ padding: '8px 4px', textAlign: 'center',
                  fontWeight: 500, fontSize: 10 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Front 9 */}
            {holes.slice(0, 9).map((h, i) => {
              const s = scores[i]
              const d = s !== null ? s - h.par : null
              return (
                <tr key={i} onClick={() => setCurrentHole(i)}
                  style={{ background: i === currentHole
                    ? 'rgba(45,138,84,0.07)' : '#fff',
                    cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontWeight: i === currentHole ? 700 : 400 }}>{i + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.par}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.yards}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par} size={22} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                </tr>
              )
            })}

            {/* OUT subtotal */}
            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>OUT</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 11 }}>{front9Par}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12 }}>
                {front9Played > 0 ? front9Strokes : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(front9Played > 0 ? front9Strokes - front9Par : null) }}>
                {front9Played > 0 ? getPlusMinus(front9Strokes - front9Par) : '—'}
              </td>
            </tr>

            {/* Back 9 */}
            {holes.slice(9).map((h, i) => {
              const idx = i + 9
              const s = scores[idx]
              const d = s !== null ? s - h.par : null
              return (
                <tr key={idx} onClick={() => setCurrentHole(idx)}
                  style={{ background: idx === currentHole
                    ? 'rgba(45,138,84,0.07)' : '#fff',
                    cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontWeight: idx === currentHole ? 700 : 400 }}>{idx + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.par}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.yards}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    <ScoreDisplay score={s} par={h.par} size={22} />
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: getPlusMinusColor(d) }}>
                    {getPlusMinus(d)}
                  </td>
                </tr>
              )
            })}

            {/* IN subtotal */}
            <tr style={{ background: 'rgba(45,138,84,0.08)',
              borderTop: '2px solid var(--g3)', borderBottom: '2px solid var(--g3)' }}>
              <td colSpan={2} style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11 }}>IN</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 11 }}>{back9Par}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12 }}>
                {back9Played > 0 ? back9Strokes : '—'}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 11,
                color: getPlusMinusColor(back9Played > 0 ? back9Strokes - back9Par : null) }}>
                {back9Played > 0 ? getPlusMinus(back9Strokes - back9Par) : '—'}
              </td>
            </tr>

            {/* Total */}
            <tr style={{ background: 'var(--g1)' }}>
              <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 700, fontSize: 12, color: '#fff' }}>TOTAL</td>
              <td style={{ padding: '8px 4px', textAlign: 'center',
                fontWeight: 600, fontSize: 12, color: '#fff' }}>
                {front9Par + back9Par}
              </td>
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