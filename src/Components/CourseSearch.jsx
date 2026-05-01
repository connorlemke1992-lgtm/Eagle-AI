import { useState, useRef } from 'react'
import { localCourses } from '../localCourses'

export default function CourseSearch({ onCourseSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  async function searchCourses(val) {
    setQuery(val)
    if (val.length < 3) { setResults([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')

      // 1. Search local Colorado courses first
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

      // 2. Search GolfAPI.io via serverless function
      try {
        const endpoint = encodeURIComponent(
          `clubs?name=${encodeURIComponent(val)}&country=usa`
        )
        const res = await fetch(`/api/golfapi?endpoint=${endpoint}`)
        const data = await res.json()

        console.log('GolfAPI search response:', data)

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
        console.error('GolfAPI search error:', err)
        setResults(localResults)
        if (localResults.length === 0) {
          setError('Could not search courses — check your connection')
        }
      }
      setLoading(false)
    }, 500)
  }

  async function selectCourse(course) {
    if (course.isLocal) {
      onCourseSelect(course.fullData)
      return
    }

    setLoading(true)
    setError('')

    try {
      const cacheKey = `golfapi_course_${course.id}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        onCourseSelect(JSON.parse(cached))
        setLoading(false)
        return
      }

      // Step 1 — fetch club to get course IDs
      const clubRes = await fetch(
        `/api/golfapi?endpoint=${encodeURIComponent(`clubs/${course.id}`)}`
      )
      const clubData = await clubRes.json()
      console.log('Club data:', clubData)

      // Get first course ID from club
      const coursesList = clubData.club?.courses ||
                          clubData.courses ||
                          course.courses || []
      const courseId = coursesList[0]?.courseID ||
                       coursesList[0]?.id ||
                       course.id

      console.log('Using courseId:', courseId)

      // Step 2 — fetch course and coordinates using course ID
      const [courseRes, coordRes] = await Promise.all([
        fetch(`/api/golfapi?endpoint=${encodeURIComponent(`courses/${courseId}`)}`),
        fetch(`/api/golfapi?endpoint=${encodeURIComponent(`coordinates/${courseId}`)}`)
      ])

      const courseData = await courseRes.json()
      const coordData = await coordRes.json()

      console.log('Course data:', courseData)
      console.log('Coord data:', coordData)

      // Build course object
      const tees = courseData.course?.tees ||
                   courseData.tees || {}

      const coordinates = coordData.course?.coordinates ||
                          coordData.coordinates || []

      // Get location from coordinates if not in club data
      const lat = course.location?.latitude ||
                  coordData.course?.location?.lat ||
                  clubData.club?.lat
      const lng = course.location?.longitude ||
                  coordData.course?.location?.lng ||
                  clubData.club?.lng

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

      console.log('Built course:', builtCourse)
      localStorage.setItem(cacheKey, JSON.stringify(builtCourse))
      onCourseSelect(builtCourse)
    } catch(e) {
      console.error('Course select error:', e)
      setError('Could not load course data — try again')
    }
    setLoading(false)
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