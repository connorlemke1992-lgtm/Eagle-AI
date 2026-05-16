import { useState, useRef } from 'react'
import { localCourses } from '../localCourses'

const TEE_OPTIONS = [
  { label: 'Back', desc: 'Tips / Championship', icon: '⬛', sideFW: 1 },
  { label: 'Middle', desc: 'Standard / Men\'s', icon: '⬜', sideFW: 2 },
  { label: 'Forward', desc: 'Senior / Ladies', icon: '🟡', sideFW: 3 },
]

function getTeeColor(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('black')) return '#1a1a1a'
  if (n.includes('gold') || n.includes('yellow')) return '#c9a227'
  if (n.includes('blue')) return '#2563eb'
  if (n.includes('white')) return '#e5e7eb'
  if (n.includes('red')) return '#dc2626'
  if (n.includes('silver') || n.includes('grey') || n.includes('gray')) return '#9ca3af'
  if (n.includes('green')) return '#16a34a'
  return '#888888'
}

function getPermanentCourses(q) {
  const permanent = []
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('permanent_'))
      .forEach(k => {
        const d = JSON.parse(localStorage.getItem(k))
        if (!d?.course) return
        const name = d.course.club_name?.toLowerCase() || ''
        const city = d.course.location?.city?.toLowerCase() || ''
        if (name.includes(q) || city.includes(q)) {
          permanent.push({
            id: k,
            club_name: d.course.club_name,
            location: d.course.location,
            isLocal: false,
            isPermanent: true,
            fullData: d,
          })
        }
      })
  } catch {}
  return permanent
}

export default function CourseSearch({ onCourseSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingCourse, setPendingCourse] = useState(null)
  const [selectedTeeIndex, setSelectedTeeIndex] = useState(0)
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
      const permanentResults = getPermanentCourses(q)
      const localResults = localCourses.filter(c =>
        c.club_name.toLowerCase().includes(q) ||
        c.location.city.toLowerCase().includes(q)
      ).map(c => ({
        id: c.id,
        club_name: c.club_name,
        location: c.location,
        isLocal: true,
        fullData: c,
      }))

      try {
        const res = await fetch(
          `/api/golfcourseapi?endpoint=${encodeURIComponent(`search?search_query=${val}`)}`
        )
        const data = await res.json()
        const apiResults = (data.courses || []).map(c => ({
          id: c.id,
          club_name: c.club_name,
          location: c.location,
          isLocal: false,
          fullCourseData: c,
        }))

        const combined = [
          ...permanentResults,
          ...localResults,
          ...apiResults.filter(a =>
            !localResults.find(l => l.club_name?.toLowerCase() === a.club_name?.toLowerCase()) &&
            !permanentResults.find(p => p.club_name?.toLowerCase() === a.club_name?.toLowerCase())
          )
        ]
        setResults(combined)
      } catch {
        const combined = [...permanentResults, ...localResults]
        setResults(combined)
        if (combined.length === 0) setError('Could not search courses — check your connection')
      }
      setLoading(false)
    }, 500)
  }

  async function selectCourse(course) {
    if (course.isPermanent) {
      setPendingCourse({ ...course, builtData: course.fullData })
      setSelectedTeeIndex(0)
      setShowTeeSelector(true)
      return
    }

    if (course.isLocal) {
      setPendingCourse({ ...course, isLocal: true })
      setShowTeeSelector(true)
      return
    }

    const c = course.fullCourseData
    const builtCourse = {
      course: {
        club_name: c.club_name,
        location: c.location,
        tees: c.tees || {},
        coordinates: [],
        isGolfCourseAPI: true,
      }
    }

    // GolfCourseAPI gives us scorecard data but no GPS coordinates. Look the
    // course up in golfapi.io (a different provider) by name to grab the tee
    // box, green, and hazard coordinates so the map can show where you are
    // on each hole. Wrapped in try/catch — if golfapi.io doesn't have this
    // course, we just continue with no coordinates and the map falls back to
    // estimated positions around the course location.
    setLoading(true)
    try {
      const coords = await fetchCoordinates(c.club_name, c.location)
      if (coords?.length) builtCourse.course.coordinates = coords
    } catch (err) {
      console.warn('[CourseSearch] coordinate lookup failed:', err)
    }
    setLoading(false)

    localStorage.setItem(`golfapi_course_${course.id}`, JSON.stringify(builtCourse))
    setPendingCourse({ ...course, builtData: builtCourse })
    setSelectedTeeIndex(0)
    setShowTeeSelector(true)
  }

  // Look this course up in golfapi.io and pull its POI coordinates. The API
  // has three endpoints we chain together:
  //   1) GET /clubs?...  → list of matching clubs
  //   2) GET /clubs/{clubID}  → club details including a courses[] array
  //   3) GET /courses/{courseID}  → full course data (includes coordinates)
  //
  // Search is the brittle part. golfapi.io's name field is partial-match but
  // their dataset uses inconsistent naming, so we try a few strategies in
  // order and stop at the first one that returns matches.
  async function fetchCoordinates(name, location) {
    if (!name) return null
    console.log('[golfapi] looking up:', name, location)

    const candidates = await findClubCandidates(name, location)
    if (!candidates.length) {
      console.warn('[golfapi] no club matches after all search strategies')
      return null
    }

    // Prefer a candidate in the same city/state if we know one — disambiguates
    // common names like "Saddleback" that exist in multiple states.
    const wantCity = location?.city?.toLowerCase()
    const wantState = location?.state?.toLowerCase()
    const bestClub = candidates.find(c => {
      const cCity = (c.city || c.clubCity || '').toLowerCase()
      const cState = (c.state || c.clubState || '').toLowerCase()
      return wantCity && cCity === wantCity && (!wantState || cState === wantState)
    }) || candidates[0]

    const clubID = bestClub.clubID || bestClub.id
    console.log('[golfapi] picked club:', bestClub.clubName, 'clubID:', clubID)
    if (!clubID) return null

    // Step 2 — fetch club details to get its courses[] array. The clubs/{id}
    // response includes a `courses` array; we want the first course's ID.
    const club = await goAndLog(`clubs/${clubID}`, 'club detail')
    const clubCourses = club?.courses || []
    let courseID = clubCourses[0]?.courseID || clubCourses[0]?.id

    // Some clubs return courses in a separate field, or only return the
    // course ID list. If we didn't find one, try the courses?clubID= variant.
    if (!courseID) {
      const list = await goAndLog(`courses?clubID=${clubID}`, 'courses by clubID')
      const items = list?.courses || (Array.isArray(list) ? list : [])
      courseID = items[0]?.courseID || items[0]?.id
    }
    if (!courseID) {
      console.warn('[golfapi] no courseID found for clubID', clubID)
      return null
    }
    console.log('[golfapi] using courseID:', courseID)

    // Step 3 — fetch the dedicated coordinates endpoint for this course.
    // /courses/{id} returns metadata only (address, phone, etc); the actual
    // POI coordinates live on a separate /coordinates/{courseID} endpoint.
    const coordsResp = await goAndLog(`coordinates/${courseID}`, 'coordinates')
    const coords = coordsResp?.coordinates ||
                   (Array.isArray(coordsResp) ? coordsResp : [])
    console.log('[golfapi] got', coords.length, 'coordinates')
    return coords.length ? coords : null
  }

  // Try a series of /clubs queries until one returns matches. golfapi.io's
  // search is sensitive to exact naming and country format, so we fall
  // through:
  //   1) Full name + country
  //   2) Full name only (no country filter)
  //   3) First word of name only (e.g. "Saddleback" instead of full name)
  //   4) City + state lookup, then client-side name match
  async function findClubCandidates(name, location) {
    const country = location?.country
    const city = location?.city
    const state = location?.state
    const firstWord = name.split(/\s+/)[0]

    // Strategy 1 — full name + country.
    if (country) {
      const r1 = await searchClubs({ name, country })
      if (r1.length) return r1
    }

    // Strategy 2 — full name only.
    const r2 = await searchClubs({ name })
    if (r2.length) return r2

    // Strategy 3 — first word only (catches "Saddleback Golf Club" stored
    // as just "Saddleback" or with a different suffix).
    if (firstWord && firstWord.toLowerCase() !== name.toLowerCase()) {
      const r3 = await searchClubs({ name: firstWord })
      if (r3.length) return r3
    }

    // Strategy 4 — search by city/state and filter client-side. Last resort
    // because it can return a lot of unrelated clubs.
    if (city && state) {
      const r4 = await searchClubs({ city, state })
      if (r4.length) {
        const wantLower = name.toLowerCase()
        const fuzzy = r4.filter(c => {
          const cName = (c.clubName || c.name || '').toLowerCase()
          return cName.includes(firstWord.toLowerCase()) ||
                 wantLower.includes(cName) || cName.includes(wantLower)
        })
        if (fuzzy.length) return fuzzy
        return r4 // even unfiltered, the city+state shortlist is useful
      }
    }

    return []
  }

  async function searchClubs(params) {
    const qs = new URLSearchParams(params).toString()
    const result = await goAndLog(`clubs?${qs}`, `clubs(${qs})`)
    return result?.clubs || (Array.isArray(result) ? result : [])
  }

  // Helper: hit /api/golfapi with the given endpoint, log status + body
  // preview, parse JSON, and return the data (or null on failure).
  async function goAndLog(endpoint, label) {
    try {
      const res = await fetch(`/api/golfapi?endpoint=${encodeURIComponent(endpoint)}`)
      const text = await res.text()
      console.log(`[golfapi] ${label} status:`, res.status, 'body:', text.slice(0, 300))
      if (!res.ok) return null
      return JSON.parse(text)
    } catch (e) {
      console.warn(`[golfapi] ${label} failed:`, e.message)
      return null
    }
  }

  function confirmTeeSelection() {
    if (!pendingCourse) return

    if (pendingCourse.isLocal && !pendingCourse.isPermanent) {
      const data = {
        ...pendingCourse.fullData,
        selectedTee: 2,
        selectedTeeLabel: 'Middle',
        selectedTeeIndex: 0,
      }
      localStorage.setItem('selected_tee', '2')
      onCourseSelect(data)
      setShowTeeSelector(false)
      setPendingCourse(null)
      return
    }

    const builtData = pendingCourse.builtData

    if (builtData.course.isGolfCourseAPI) {
      const t = builtData.course.tees
      const allTees = [...(t?.male || []), ...(t?.female || [])]
      const chosenTee = allTees[selectedTeeIndex] || allTees[0]
      if (!chosenTee) return

      const holes = (chosenTee.holes || []).map((h, i) => ({
        hole: i + 1,
        yardage: h.yardage || 0,
        par: h.par || null,
        handicap: h.handicap || null,
      }))

      const data = {
        ...builtData,
        course: {
          ...builtData.course,
          selectedTee: 2,
          selectedTeeLabel: chosenTee.tee_name || 'Middle',
          selectedTeeIndex,
          chosenTee,
          holes,
          courseRating: chosenTee.course_rating,
          slope: chosenTee.slope_rating,
        }
      }
      localStorage.setItem('selected_tee', '2')
      localStorage.setItem('selected_course', JSON.stringify(data))
      onCourseSelect(data)
    } else {
      // Legacy format for permanently cached courses
      const tees = builtData.course.tees || []
      const chosenTee = tees[selectedTeeIndex] || tees[0]
      const scorecard = builtData.course.scorecard
      const teeName = chosenTee?.teeName?.toLowerCase() || ''
      let scorecardHoles = null

      if (scorecard?.tees) {
        const allTees = [
          ...(scorecard.tees.male || []),
          ...(scorecard.tees.female || []),
        ]
        const matched = allTees.find(t =>
          t.tee_name?.toLowerCase().includes(teeName) ||
          teeName.includes(t.tee_name?.toLowerCase())
        ) || scorecard.tees.male?.[0] || allTees[0]
        scorecardHoles = matched?.holes || null
      }

      const holes = Array.from({ length: 18 }, (_, i) => {
        const n = i + 1
        const yardage = chosenTee?.[`length${n}`] || chosenTee?.[`Length${n}`] || 0
        const scorecardHole = scorecardHoles?.[i]
        return {
          hole: n,
          yardage,
          par: scorecardHole?.par || null,
          handicap: scorecardHole?.handicap || null,
        }
      })

      const data = {
        ...builtData,
        course: {
          ...builtData.course,
          selectedTee: 2,
          selectedTeeLabel: chosenTee?.teeName || 'Middle',
          selectedTeeIndex,
          chosenTee,
          holes,
          courseRating: chosenTee?.courseRatingMen,
          slope: chosenTee?.slopeMen,
        }
      }
      localStorage.setItem('selected_tee', '2')
      localStorage.setItem('selected_course', JSON.stringify(data))
      onCourseSelect(data)
    }

    setShowTeeSelector(false)
    setPendingCourse(null)
  }

  if (showTeeSelector && pendingCourse) {
    const builtData = pendingCourse.builtData
    const isGolfCourseAPI = builtData?.course?.isGolfCourseAPI
    const isLocal = pendingCourse.isLocal && !pendingCourse.isPermanent

    let tees = []
    if (isGolfCourseAPI) {
      const t = builtData.course.tees
      tees = [...(t?.male || []), ...(t?.female || [])]
    } else if (!isLocal) {
      tees = builtData?.course?.tees || []
    }

    const selectedTee = tees[selectedTeeIndex]

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

        {!isLocal && tees.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {tees.map((tee, i) => {
              const name = tee.tee_name || tee.teeName || `Tee ${i + 1}`
              const totalYards = tee.total_yards ||
                (tee.holes ? tee.holes.reduce((a, h) => a + (h.yardage || 0), 0) : 0) ||
                Array.from({ length: 18 }, (_, j) => tee[`length${j + 1}`] || 0).reduce((a, b) => a + b, 0)
              const rating = tee.course_rating || tee.courseRatingMen
              const slope = tee.slope_rating || tee.slopeMen
              return (
                <button key={i} onClick={() => setSelectedTeeIndex(i)}
                  style={{ background: selectedTeeIndex === i ? 'var(--g1)' : '#fff',
                    border: selectedTeeIndex === i
                      ? '2px solid var(--g3)' : '1px solid var(--bd)',
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%',
                    background: tee.teeColor || getTeeColor(name),
                    border: '2px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700,
                      color: selectedTeeIndex === i ? '#fff' : 'var(--tx)', marginBottom: 2 }}>
                      {name} Tees
                    </div>
                    <div style={{ fontSize: 12,
                      color: selectedTeeIndex === i ? 'rgba(255,255,255,0.6)' : 'var(--tx2)' }}>
                      {totalYards > 0 ? `${totalYards.toLocaleString()} yards` : ''}
                      {rating ? ` · Rating ${rating}` : ''}
                      {slope ? ` · Slope ${slope}` : ''}
                    </div>
                  </div>
                  {selectedTeeIndex === i && <div style={{ fontSize: 20 }}>✅</div>}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {TEE_OPTIONS.map(tee => (
              <button key={tee.sideFW}
                onClick={() => setSelectedTeeIndex(tee.sideFW - 1)}
                style={{ background: selectedTeeIndex === tee.sideFW - 1
                  ? 'var(--g1)' : '#fff',
                  border: selectedTeeIndex === tee.sideFW - 1
                    ? '2px solid var(--g3)' : '1px solid var(--bd)',
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                <div style={{ fontSize: 32 }}>{tee.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700,
                    color: selectedTeeIndex === tee.sideFW - 1 ? '#fff' : 'var(--tx)',
                    marginBottom: 2 }}>{tee.label} Tees</div>
                  <div style={{ fontSize: 12,
                    color: selectedTeeIndex === tee.sideFW - 1
                      ? 'rgba(255,255,255,0.6)' : 'var(--tx2)' }}>{tee.desc}</div>
                </div>
                {selectedTeeIndex === tee.sideFW - 1 && <div style={{ fontSize: 20 }}>✅</div>}
              </button>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--bg2)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 20, fontSize: 12,
          color: 'var(--tx2)', lineHeight: 1.5 }}>
          🎯 Eagle AI will use these yardages for club recommendations on every hole.
        </div>

        <button onClick={confirmTeeSelection}
          style={{ width: '100%', background: 'var(--g1)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '16px',
            fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          {selectedTee
            ? `Let's Play ${selectedTee.tee_name || selectedTee.teeName} Tees →`
            : 'Let\'s Play →'}
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
        Powered by GolfCourseAPI · 40,000+ courses
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
                {(course.isLocal || course.isPermanent) && (
                  <span style={{ fontSize: 10,
                    background: 'rgba(45,138,84,0.1)',
                    color: 'var(--g2)', padding: '2px 8px',
                    borderRadius: 10, fontWeight: 500 }}>
                    {course.isPermanent ? 'Saved ⚡' : 'Local ⚡'}
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
