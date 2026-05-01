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
  const [editingName, setEditingName] = useState(null)
  const [tempName, setTempName] = useState('')
  const [showAddClub, setShowAddClub] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [newClubYards, setNewClubYards] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  function startEditName(index) {
    setEditingName(index)
    setTempName(clubs[index].name)
  }

  function saveEditName(index) {
    if (!tempName.trim()) { setEditingName(null); return }
    const updated = [...clubs]
    updated[index] = { ...updated[index], name: tempName.trim() }
    setClubs(updated)
    setEditingName(null)
    setSaved(false)
  }

  function deleteClub(index) {
    if (deleteConfirm === index) {
      const updated = clubs.filter((_, i) => i !== index)
      setClubs(updated)
      setDeleteConfirm(null)
      setSaved(false)
    } else {
      setDeleteConfirm(index)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  function addClub() {
    if (!newClubName.trim() || !newClubYards) return
    const newClub = {
      name: newClubName.trim(),
      yards: parseInt(newClubYards) || 0
    }
    const updated = [...clubs, newClub].sort((a, b) => b.yards - a.yards)
    setClubs(updated)
    setNewClubName('')
    setNewClubYards('')
    setShowAddClub(false)
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
            {clubs.length} clubs · tap name to edit
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'var(--g1)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 16, fontSize: 12,
        color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        🎯 Tap a club name to rename it · tap 🗑️ to delete · tap + Add Club to add a new one
      </div>

      {/* Club list */}
      <div style={{ display: 'flex', flexDirection: 'column',
        gap: 8, marginBottom: 16 }}>
        {clubs.map((club, i) => (
          <div key={i}
            style={{ background: '#fff', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Club name — tap to edit */}
            {editingName === i ? (
              <input
                autoFocus
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onBlur={() => saveEditName(i)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEditName(i)
                  if (e.key === 'Escape') setEditingName(null)
                }}
                style={{ flex: 1, border: '2px solid var(--g3)',
                  borderRadius: 8, padding: '4px 8px',
                  fontSize: 14, fontWeight: 600, color: 'var(--tx)',
                  outline: 'none' }}
              />
            ) : (
              <button onClick={() => startEditName(i)}
                style={{ flex: 1, background: 'transparent', border: 'none',
                  textAlign: 'left', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)' }}>
                  {club.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--tx2)' }}>✏️</span>
              </button>
            )}

            {/* Yardage input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                value={club.yards}
                onChange={e => updateYardage(i, e.target.value)}
                style={{ width: 65, border: '1px solid var(--bd)',
                  borderRadius: 8, padding: '6px 8px', fontSize: 15,
                  fontWeight: 600, textAlign: 'center', color: 'var(--tx)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>yds</span>
            </div>

            {/* Delete button */}
            <button onClick={() => deleteClub(i)}
              style={{ background: deleteConfirm === i ? '#fee2e2' : 'transparent',
                border: deleteConfirm === i ? '1px solid #fca5a5' : 'none',
                borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                fontSize: 16, flexShrink: 0,
                color: deleteConfirm === i ? '#991b1b' : 'var(--tx2)' }}>
              {deleteConfirm === i ? 'Sure?' : '🗑️'}
            </button>
          </div>
        ))}
      </div>

      {/* Add Club button */}
      {!showAddClub ? (
        <button onClick={() => setShowAddClub(true)}
          style={{ width: '100%', background: '#fff',
            border: '2px dashed var(--bd)', borderRadius: 10,
            padding: '12px', marginBottom: 16, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: 'var(--tx2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8 }}>
          ➕ Add Club
        </button>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--bd)',
          borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)',
            marginBottom: 12 }}>Add New Club</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              autoFocus
              value={newClubName}
              onChange={e => setNewClubName(e.target.value)}
              placeholder="Club name e.g. 60 Degree"
              style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, color: 'var(--tx)' }}
            />
            <input
              type="number"
              value={newClubYards}
              onChange={e => setNewClubYards(e.target.value)}
              placeholder="Yds"
              style={{ width: 70, border: '1px solid var(--bd)', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, textAlign: 'center',
                color: 'var(--tx)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addClub}
              disabled={!newClubName.trim() || !newClubYards}
              style={{ flex: 1, background: 'var(--g1)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                opacity: !newClubName.trim() || !newClubYards ? 0.5 : 1 }}>
              ➕ Add
            </button>
            <button onClick={() => {
              setShowAddClub(false)
              setNewClubName('')
              setNewClubYards('')
            }}
              style={{ flex: 1, background: 'var(--bg2)',
                border: '1px solid var(--bd)', borderRadius: 8,
                padding: '10px', cursor: 'pointer',
                fontSize: 13, color: 'var(--tx2)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      <button onClick={saveBag}
        style={{ width: '100%', background: saved ? '#4ade80' : 'var(--g1)',
          color: saved ? '#1a3a2a' : '#fff', border: 'none', borderRadius: 10,
          padding: '14px', fontWeight: 700, fontSize: 15,
          cursor: 'pointer', transition: 'background 0.3s' }}>
        {saved ? '✅ Saved!' : 'Save My Bag'}
      </button>
    </div>
  )
}