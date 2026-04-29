import { useState } from 'react'
import Caddie from './Components/Caddie'
import Scorecard from './Components/Scorecard'
import Stats from './Components/Stats'
import Games from './Components/Games'
import Coach from './Components/Coach'
import HoleView from './Components/HoleView'

const tabs = [
  { id: 'caddie', label: 'Caddie', icon: '🎯' },
  { id: 'scorecard', label: 'Card', icon: '📋' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'games', label: 'Games', icon: '🏆' },
  { id: 'coach', label: 'Coach', icon: '💬' },
  { id: 'map', label: 'Map', icon: '🗺️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('caddie')
  const [scores, setScores] = useState(new Array(18).fill(null))
  const [currentHole, setCurrentHole] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState(null)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--g1)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 26,
            color: '#4db87a', letterSpacing: 1 }}>⛳ Eagle AI</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
            marginTop: 1 }}>
            {selectedCourse
              ? `📍 ${selectedCourse.course?.club_name}`
              : 'Your tour-level caddie'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20,
          padding: '4px 12px', fontSize: 13, color: '#fff', fontWeight: 600 }}>
          HCP: 14.2
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 70 }}>
        {activeTab === 'caddie' && (
          <Caddie
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
            selectedCourse={selectedCourse}
          />
        )}
        {activeTab === 'scorecard' && (
          <Scorecard scores={scores} setScores={setScores}
            currentHole={currentHole} setCurrentHole={setCurrentHole} />
        )}
        {activeTab === 'stats' && <Stats scores={scores} />}
        {activeTab === 'games' && <Games />}
        {activeTab === 'coach' && (
          <Coach
            currentHole={currentHole}
            selectedCourse={selectedCourse}
          />
        )}
        {activeTab === 'map' && (
          <HoleView
            currentHole={currentHole}
            setCurrentHole={setCurrentHole}
            onCourseSelect={setSelectedCourse}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)', width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid var(--bd)',
        display: 'flex', zIndex: 100 }}>
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, border: 'none', background: 'transparent',
              padding: '10px 4px', cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 3,
              color: activeTab === tab.id ? 'var(--g2)' : 'var(--tx2)',
              fontWeight: activeTab === tab.id ? 600 : 400 }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}