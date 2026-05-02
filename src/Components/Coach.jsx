import { useState, useRef, useEffect } from 'react'

function degreesToCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export default function Coach({ currentHole, selectedCourse, distanceToPin, scores = [] }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey! I'm Eagle, your AI golf coach. Ask me anything — club selection, course strategy, swing tips, mental game, rules questions. I'm here to help you play your best golf.`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [weather, setWeather] = useState(null)
  const bottomRef = useRef(null)
  const recognitionRef = useRef(null)

  const holes = selectedCourse?.course?.holes ||
                selectedCourse?.course?.tees?.male?.[0]?.holes ||
                selectedCourse?.course?.tees?.female?.[0]?.holes || []
  const h = holes[currentHole]
  const courseName = selectedCourse?.course?.club_name || null

  // Score context
  const playedScores = scores.filter(s => s !== null)
  const totalStrokes = playedScores.reduce((a, b) => a + b, 0)
  const totalPar = holes.slice(0, playedScores.length).reduce((a, h) => a + (h?.par || 4), 0)
  const scoreDiff = playedScores.length > 0 ? totalStrokes - totalPar : null

  function getScoreContext() {
    if (scoreDiff === null) return ''
    if (scoreDiff <= -2) return `Player is ${Math.abs(scoreDiff)} under par through ${playedScores.length} holes — playing great, recommend aggressive strategy.`
    if (scoreDiff === -1) return `Player is 1 under par through ${playedScores.length} holes — stay aggressive but smart.`
    if (scoreDiff === 0) return `Player is even par through ${playedScores.length} holes — play your game.`
    if (scoreDiff <= 2) return `Player is ${scoreDiff} over par through ${playedScores.length} holes — play smart, avoid bogey makers.`
    if (scoreDiff <= 5) return `Player is ${scoreDiff} over par through ${playedScores.length} holes — play conservative, minimize mistakes.`
    return `Player is ${scoreDiff} over par through ${playedScores.length} holes — play safe, focus on bogey golf.`
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) setVoiceSupported(true)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`
        const res = await fetch(url)
        const data = await res.json()
        const c = data.current
        setWeather({
          windSpeed: Math.round(c.wind_speed_10m),
          windDir: degreesToCardinal(c.wind_direction_10m),
          windGusts: Math.round(c.wind_gusts_10m),
          temp: Math.round(c.temperature_2m),
          rain: c.precipitation > 0,
        })
      } catch {}
    }, null, { enableHighAccuracy: true, timeout: 12000 })
  }, [])

  function toggleVoice() {
    if (isListening) stopListening()
    else startListening()
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice not supported in this browser. Try Chrome or Safari.')
      return
    }
    setVoiceError('')
    setTranscript('')
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setTranscript(final || interim)
    }
    recognition.onerror = () => {
      setVoiceError('Could not hear you. Please try again.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
    setTimeout(() => {
      if (transcript.trim()) {
        sendMessage(transcript.trim())
        setTranscript('')
      }
    }, 300)
  }

  async function sendMessage(text) {
    const userText = text || input.trim()
    if (!userText) return

    const userMsg = { role: 'user', content: userText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const shotShape = localStorage.getItem('shot_shape') || 'fade'
    const scoreContext = getScoreContext()

    const systemContext = `You are Eagle, an elite AI golf coach and caddie.
${courseName ? `Player is at ${courseName}.` : ''}
${h ? `Current hole: Hole ${currentHole + 1}, Par ${h.par || '?'}, ${h.yardage || h.yards || '?'} yards, Handicap ${h.handicap || '?'}.` : `Current hole: Hole ${currentHole + 1}.`}
${distanceToPin ? `Distance to pin: ${distanceToPin} yards.` : ''}
${weather ? `Conditions: ${weather.windSpeed} mph wind from ${weather.windDir}, gusting ${weather.windGusts} mph, ${weather.temp}°F, ${weather.rain ? 'raining' : 'no rain'}.` : ''}
${scoreContext ? scoreContext : ''}
Shot shape: ${shotShape}.

Give direct, specific, actionable golf advice. Factor in all conditions automatically without being asked. Be conversational but expert. No markdown, no asterisks, plain text only.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          system: systemContext,
          messages: updatedMessages
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Could not get a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Could not connect. Please try again.'
      }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>

      {/* Context banner */}
      {(courseName || distanceToPin || h || weather) && (
        <div style={{ background: 'var(--g1)', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {courseName && `${courseName} · `}
            {`Hole ${currentHole + 1}`}
            {h?.par && ` · Par ${h.par}`}
            {(h?.yardage || h?.yards) && ` · ${h.yardage || h.yards} yds`}
            {distanceToPin && ` · ${distanceToPin} yds to pin`}
            {weather && ` · 💨 ${weather.windSpeed}mph ${weather.windDir} · ${weather.temp}°F`}
            {scoreDiff !== null && ` · ${scoreDiff > 0 ? '+' : ''}${scoreDiff} thru ${playedScores.length}`}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%',
                background: 'var(--g1)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, marginRight: 8,
                flexShrink: 0, alignSelf: 'flex-end' }}>🎯</div>
            )}
            <div style={{
              maxWidth: '78%',
              background: msg.role === 'user' ? 'var(--g1)' : '#fff',
              color: msg.role === 'user' ? '#fff' : 'var(--tx)',
              border: msg.role === 'assistant' ? '1px solid var(--bd)' : 'none',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              background: 'var(--g1)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14 }}>🎯</div>
            <div style={{ background: '#fff', border: '1px solid var(--bd)',
              borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
              fontSize: 14, color: 'var(--tx2)' }}>
              Eagle is thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Voice transcript */}
      {(isListening || transcript) && (
        <div style={{ margin: '0 16px 8px', background: 'var(--g1)',
          borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: transcript ? 6 : 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%',
              background: isListening ? '#ef4444' : '#4ade80',
              animation: isListening ? 'pulse 1s infinite' : 'none' }} />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {isListening ? 'Listening...' : 'Heard'}
            </div>
          </div>
          {transcript && (
            <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
              {transcript}
            </div>
          )}
        </div>
      )}

      {voiceError && (
        <div style={{ margin: '0 16px 8px', background: '#fee2e2',
          borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
          {voiceError}
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '8px 16px 16px', borderTop: '1px solid var(--bd)',
        background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10,
          overflowX: 'auto', paddingBottom: 4 }}>
          {[
            '🏌️ Club advice',
            '💨 Wind adjustment',
            '🧠 Mental tip',
            '📐 Course strategy',
            '⛳ Rules question',
          ].map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--bd)',
                borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                fontSize: 11, color: 'var(--tx)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Eagle anything..."
            rows={1}
            style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 20,
              padding: '10px 14px', fontSize: 14, resize: 'none',
              fontFamily: 'inherit', outline: 'none',
              background: 'var(--bg2)', color: 'var(--tx)',
              lineHeight: 1.4, maxHeight: 100, overflowY: 'auto' }} />

          {voiceSupported && (
            <button onClick={toggleVoice}
              style={{ width: 44, height: 44, borderRadius: '50%',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                background: isListening ? '#ef4444' : 'var(--g1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, transition: 'all 0.2s',
                boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none' }}>
              {isListening ? '⏹️' : '🎤'}
            </button>
          )}

          <button onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{ width: 44, height: 44, borderRadius: '50%',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              background: input.trim() && !loading ? 'var(--g1)' : 'var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18 }}>
            ➤
          </button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--tx2)', textAlign: 'center', marginTop: 8 }}>
          {voiceSupported
            ? 'Tap 🎤 to start voice · tap ⏹️ to stop and send'
            : 'Type your question and press Enter'}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}