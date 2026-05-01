import { useState, useRef } from 'react'
import { localCourses } from '../localCourses'

const TEE_OPTIONS = [
  { label: 'Back', desc: 'Tips / Championship', icon: '⬛', sideFW: 1, color: '#1a1a1a' },
  { label: 'Middle', desc: 'Standard / Men\'s', icon: '⬜', sideFW: 2, color: '#4a7c59' },
  { label: 'Forward', desc: 'Senior / Ladies', icon: '🟡', sideFW: 3, color: '#d97706' },
]

export default function CourseSearch({ onCourseSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingCourse, setPendingCourse] = useState(null)
  const [selectedTee, setSelectedTee] = useState(2)
  const [showTeeSelector, setShowTeeSelector] = useState(false)
  const debounceRef = useRef(null)

  async function searchCourses(val) {
    setQuery(val)
    if (val.length < 3) { setResults([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')

      const q = val.toLowerCase()
      const localResults = localCourses.filter(c =>
        c.club_name.toLowerCase().includes(q) ||
        c.location.city.toLowerCase().includes(q)
      ).map(c => ({
        id: c.id,
        club_name: c.club_name,
        location: c.location,
        isLocal: true,
        fullData: c
      }))

      try {
        const endpoint = encodeURIComponent(
          `clubs?name=${encodeURIComponent(val)}&country=usa`
        )
        const res = await fetch(`/api/golfapi?endpoint=${endpoint}`)
        const data = await res.json()

        const apiResults = (data.clubs || []).map(c => ({
          id: c.clubID || c.id,
          club_name: c.clubName || c.name || c.club_name,
          location: {
            city: c.city,
            state: c.state,
            country: c.country,
            latitude: c.lat || c.latitude,
            longitude: c.lng || c.longitude,
          },
          courses: c.courses || [],
          isLocal: false,
        }))

        const combined = [
          ...localResults,
          ...apiResults.filter(a => !localResults.find(l =>
            l.club_name?.toLowerCase() === a.club_name?.toLowerCase()
          ))
        ]
        setResults(combined)
      } catch (err) {
        setResults(localResults)
        if (localResults.length === 0) {
          setError('Could not search courses — check your connection')
        }
      }
      setLoading(false)
    }, 500)
  }

  async function selectCourse(course) {
    // Local course — show tee selector first
    if (course.isLocal) {
      setPendingCourse(course)
      setShowTeeSelector(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      const cacheKey = `golfapi_course_${course.id}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setPendingCourse({ ...course, builtData: JSON.parse(cached) })
        setShowTeeSelector(true)
        setLoading(false)
        return
      }

      const clubRes = await fetch(
        `/api/golfapi?endpoint=${encodeURIComponent(`clubs/${course.id}`)}`
      )
      const clubData = await clubRes.json()

      const coursesList = clubData.club?.courses ||
                          clubData.courses ||
                          course.courses || []
      const courseId = coursesList[0]?.courseID ||
                       coursesList[0]?.id ||
                       course.id

      const [courseRes, coordRes] = await Promise.all([
        fetch(`/api/golfapi?endpoint=${encodeURIComponent(`courses/${courseId}`)}`),
        fetch(`/api/golfapi?endpoint=${encodeURIComponent(`coordinates/${courseId}`)}`)
      ])

      const courseData = await courseRes.json()
      const coordData = await coordRes.json()

      const tees = courseData.course?.tees || courseData.tees || {}
      const coordinates = coordData.course?.coordinates || coordData.coordinates || []
      const lat = course.location?.latitude || clubData.club?.lat
      const lng = course.location?.longitude || clubData.club?.lng

      const builtCourse = {
        course: {
          club_name: course.club_name,
          location: {
            city: course.location?.city,
            state: course.location?.state,
            latitude: lat,
            longitude: lng,
          },
          tees,
          coordinates,
        }
      }

      localStorage.setItem(cacheKey, JSON.stringify(builtCourse))
      setPendingCourse({ ...course, builtData: builtCourse })
      setShowTeeSelector(true)
    } catch(e) {
      setError('Could not load course data — try again')
    }
    setLoading(false)
  }

  function confirmTeeSelection() {
    if (!pendingCourse) return
    const teeOption = TEE_OPTIONS.find(t => t.sideFW === selectedTee)

    if (pendingCourse.isLocal) {
      const data = {
        ...pendingCourse.fullData,
        selectedTee: selectedTee,
        selectedTeeLabel: teeOption.label,
      }
      localStorage.setItem('selected_tee', String(selectedTee))
      onCourseSelect(data)
    } else {
      const data = {
        ...pendingCourse.builtData,
        selectedTee: selectedTee,
        selectedTeeLabel: teeOption.label,
      }
      localStorage.setItem('selected_tee', String(selectedTee))
      onCourseSelect(data)
    }

    setShowTeeSelector(false)
    setPendingCourse(null)
  }

  // Tee selector screen
  if (showTeeSelector && pendingCourse) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => { setShowTeeSelector(false); setPendingCourse(null) }}
          style={{ border: '1px solid var(--bd)', borderRadius: 8,
            background: '#fff', padding: '6px 14px', cursor: 'pointer',
            fontSize: 13, marginBottom: 16 }}>← Back</button>

        <div style={{ fontFamily: 'Bebas Neue', fontSize: 26, marginBottom: 4 }}>
          Which Tees?
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 20 }}>
          ⛳ {pendingCourse.club_name}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10,
          marginBottom: 24 }}>
          {TEE_OPTIONS.map(tee => (
            <button key={tee.sideFW}
              onClick={() => setSelectedTee(tee.sideFW)}
              style={{ background: selectedTee === tee.sideFW
                ? 'var(--g1)' : '#fff',
                border: selectedTee === tee.sideFW
                  ? '2px solid var(--g3)' : '1px solid var(--bd)',
                borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                textAlign: 'left' }}>
              <div style={{ fontSize: 32 }}>{tee.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700,
                  color: selectedTee === tee.sideFW ? '#fff' : 'var(--tx)',
                  marginBottom: 2 }}>
                  {tee.label} Tees
                </div>
                <div style={{ fontSize: 12,
                  color: selectedTee === tee.sideFW
                    ? 'rgba(255,255,255,0.6)' : 'var(--tx2)' }}>
                  {tee.desc}
                </div>
              </div>
              {selectedTee === tee.sideFW && (
                <div style={{ fontSize: 20 }}>✅</div>
              )}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 20, fontSize: 12,
          color: 'var(--tx2)', lineHeight: 1.5 }}>
          🎯 Eagle AI will use these tee box GPS coordinates and yardages for every hole.
          You can change this anytime by selecting a new course.
        </div>

        <button onClick={confirmTeeSelection}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '16px',
            fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          Let's Play {TEE_OPTIONS.find(t => t.sideFW === selectedTee)?.label} Tees →
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginBottom: 4 }}>
        Find your course
      </div>
      <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 12 }}>
        Powered by GolfAPI.io · 42,000+ courses
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)', fontSize: 16 }}>🔍</div>
        <input
          value={query}
          onChange={e => searchCourses(e.target.value)}
          placeholder="Search any golf course..."
          style={{ width: '100%', border: '1px solid var(--bd)',
            borderRadius: 10, padding: '12px 12px 12px 40px',
            fontSize: 14, background: '#fff', color: 'var(--tx)',
            boxSizing: 'border-box' }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)', fontSize: 12,
            color: 'var(--tx2)' }}>Searching...</div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', borderRadius: 8,
          padding: '8px 12px', fontSize: 13, color: '#991b1b',
          marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.map(course => (
          <div key={course.id}
            onClick={() => selectCourse(course)}
            style={{ background: '#fff', border: '1px solid var(--bd)',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>⛳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                {course.club_name}
                {course.isLocal && (
                  <span style={{ fontSize: 10,
                    background: 'rgba(45,138,84,0.1)',
                    color: 'var(--g2)', padding: '2px 8px',
                    borderRadius: 10, fontWeight: 500 }}>
                    Local ⚡
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                📍 {course.location?.city}, {course.location?.state}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--g2)', fontWeight: 600 }}>
              Select →
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && query.length >= 3 && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem',
          color: 'var(--tx2)', fontSize: 13 }}>
          No courses found — try a different search
        </div>
      )}

      {query.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem',
          color: 'var(--tx2)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⛳</div>
          <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            20 Colorado courses pre-loaded
          </div>
          <div style={{ lineHeight: 1.5 }}>
            All Front Range courses available instantly.<br/>
            Search for any other course worldwide.
          </div>
        </div>
      )}
    </div>
  )
}