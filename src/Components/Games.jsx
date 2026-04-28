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
]

export default function Games() {
  const [active, setActive] = useState(null)

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        Choose a side game
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {gamesList.map(g => (
          <div key={g.id} onClick={() => setActive(g.id)}
            style={{
              border: active === g.id ? '2px solid var(--g3)' : '1px solid var(--bd)',
              borderRadius: 12, padding: 14, cursor: 'pointer',
              background: active === g.id ? 'rgba(45,138,84,0.05)' : '#fff' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{g.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4,
              lineHeight: 1.4 }}>{g.desc}</div>
          </div>
        ))}
      </div>
      {active && (
        <div style={{ background: 'var(--bg2)', borderRadius: 12,
          padding: 16, marginTop: 12, textAlign: 'center',
          color: 'var(--tx2)', fontSize: 13 }}>
          {gamesList.find(g => g.id === active)?.name} selected —
          full live scoring coming soon!
        </div>
      )}
    </div>
  )
}