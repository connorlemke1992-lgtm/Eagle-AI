const holes = [
  {par:4,yards:412,hcp:7},{par:5,yards:531,hcp:3},{par:3,yards:178,hcp:15},
  {par:4,yards:387,hcp:11},{par:4,yards:445,hcp:1},{par:3,yards:152,hcp:17},
  {par:5,yards:568,hcp:5},{par:4,yards:398,hcp:9},{par:4,yards:421,hcp:13},
  {par:4,yards:403,hcp:8},{par:5,yards:544,hcp:2},{par:3,yards:169,hcp:16},
  {par:4,yards:415,hcp:10},{par:4,yards:462,hcp:4},{par:3,yards:195,hcp:14},
  {par:5,yards:552,hcp:6},{par:4,yards:391,hcp:12},{par:4,yards:437,hcp:18},
]

export default function Scorecard({ scores, setScores, currentHole, setCurrentHole }) {
  const totalStrokes = scores.reduce((a, b) => b !== null ? a + b : a, 0)
  const played = scores.filter(s => s !== null)
  const totalPar = holes.slice(0, played.length).reduce((a, h) => a + h.par, 0)
  const diff = totalStrokes - totalPar
  const h = holes[currentHole]

  function setScore(val) {
    const next = [...scores]
    next[currentHole] = val
    setScores(next)
  }

  const scoreOptions = [
    { label: 'Eagle', val: h.par - 2 },
    { label: 'Birdie', val: h.par - 1 },
    { label: 'Par', val: h.par },
    { label: 'Bogey', val: h.par + 1 },
    { label: '+2', val: h.par + 2 },
    { label: '+3', val: h.par + 3 },
  ].filter(o => o.val > 0)

  return (
    <div style={{ padding: 16 }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Strokes', val: played.length > 0 ? totalStrokes : '—',
            color: 'var(--tx)' },
          { label: 'vs Par', val: played.length > 0
            ? (diff === 0 ? 'E' : diff > 0 ? '+' + diff : diff) : '—',
            color: diff < 0 ? 'var(--g2)' : diff > 0 ? '#dc2626' : 'var(--tx)' },
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

      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Hole {currentHole + 1} — Par {h.par}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 12 }}>
          {h.yards} yards · Tap your score
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {scoreOptions.map(o => (
            <button key={o.val} onClick={() => setScore(o.val)}
              style={{ border: scores[currentHole] === o.val
                ? '2px solid var(--g3)' : '1px solid var(--bd)',
                borderRadius: 10,
                background: scores[currentHole] === o.val
                  ? 'rgba(45,138,84,0.1)' : '#fff',
                padding: '10px 6px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--tx2)',
                textTransform: 'uppercase' }}>{o.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
                {o.val}
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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

      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--g1)', color: '#fff' }}>
              {['Hole','Par','Yds','Score','+/-'].map(h => (
                <th key={h} style={{ padding: '8px 4px', textAlign: 'center',
                  fontWeight: 500, fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.map((h, i) => {
              const s = scores[i]
              const d = s !== null ? s - h.par : null
              return (
                <tr key={i} onClick={() => setCurrentHole(i)}
                  style={{ background: i === currentHole
                    ? 'rgba(45,138,84,0.07)' : '#fff',
                    cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontWeight: i === currentHole ? 600 : 400 }}>{i + 1}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.par}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{h.yards}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                    {s !== null ? (
                      <span style={{ width: 22, height: 22, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 11, fontWeight: 600,
                        background: d < 0 ? '#dcfce7' : d > 0 ? '#fee2e2' : 'transparent',
                        color: d < 0 ? '#166534' : d > 0 ? '#991b1b' : 'var(--tx)' }}>
                        {s}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'center',
                    fontSize: 11, fontWeight: 600,
                    color: d === null ? 'var(--tx2)' : d < 0 ? '#166534'
                      : d > 0 ? '#991b1b' : 'var(--tx2)' }}>
                    {d === null ? '—' : d === 0 ? 'E' : d > 0 ? '+' + d : d}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}