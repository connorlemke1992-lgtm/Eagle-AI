import { useState, useEffect } from 'react'

const defaultClubs = [
  { name: 'Driver', yards: 265 },
  { name: '3 Wood', yards: 235 },
  { name: '5 Wood', yards: 215 },
  { name: 'Hybrid', yards: 200 },
  { name: '4 Iron', yards: 190 },
  { name: '5 Iron', yards: 177 },
  { name: '6 Iron', yards: 164 },
  { name: '7 Iron', yards: 151 },
  { name: '8 Iron', yards: 138 },
  { name: '9 Iron', yards: 124 },
  { name: 'PW', yards: 112 },
  { name: 'GW', yards: 98 },
  { name: 'SW', yards: 82 },
  { name: 'LW', yards: 65 },
]

export default function MyBag({ onBack }) {
  const [clubs, setClubs] = useState(defaultClubs)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('my_bag')
    if (stored) setClubs(JSON.parse(stored))
  }, [])

  function updateYardage(index, value) {
    const updated = [...clubs]
    updated[index] = { ...updated[index], yards: parseInt(value) || 0 }
    setClubs(updated)
    setSaved(false)
  }

  function saveBag() {
    localStorage.setItem('my_bag', JSON.stringify(clubs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 12px',
            fontSize: 13, cursor: 'pointer', color: 'var(--tx)' }}>
          ← Back
        </button>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22 }}>My Bag</div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>
            Enter your stock yardages for each club
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'var(--g1)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 16, fontSize: 12,
        color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        🎯 These yardages are used by Eagle AI to recommend the exact club
        for your distance, adjusted for wind and conditions.
      </div>

      {/* Club list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {clubs.map((club, i) => (
          <div key={club.name}
            style={{ background: '#fff', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)', width: 80 }}>
              {club.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={club.yards}
                onChange={e => updateYardage(i, e.target.value)}
                style={{ width: 70, border: '1px solid var(--bd)', borderRadius: 8,
                  padding: '6px 10px', fontSize: 15, fontWeight: 600,
                  textAlign: 'center', color: 'var(--tx)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>yds</span>
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <button onClick={saveBag}
        style={{ width: '100%', background: saved ? '#4ade80' : 'var(--g1)',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '14px', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', transition: 'background 0.3s' }}>
        {saved ? '✅ Saved!' : 'Save My Bag'}
      </button>
    </div>
  )
}