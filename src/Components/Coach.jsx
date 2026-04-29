import { useState } from 'react'

const holes = [
  {par:4,yards:412,hcp:7,name:"The Opener",type:"Dogleg Right"},
  {par:5,yards:531,hcp:3,name:"The Long Walk",type:"Straight"},
  {par:3,yards:178,hcp:15,name:"Carry or Die",type:"Island Green"},
  {par:4,yards:387,hcp:11,name:"Risk & Reward",type:"Dogleg"},
  {par:4,yards:445,hcp:1,name:"The Beast",type:"Long Par 4"},
  {par:3,yards:152,hcp:17,name:"The Dip",type:"Downhill"},
  {par:5,yards:568,hcp:5,name:"Snake Run",type:"Double Dogleg"},
  {par:4,yards:398,hcp:9,name:"Fairway Wide",type:"Straight"},
  {par:4,yards:421,hcp:13,name:"The Climb",type:"Uphill"},
  {par:4,yards:403,hcp:8,name:"Turn Here",type:"Dogleg"},
  {par:5,yards:544,hcp:2,name:"Eagle Alley",type:"Par 5"},
  {par:3,yards:169,hcp:16,name:"The Mirror",type:"Water Left"},
  {par:4,yards:415,hcp:10,name:"The Elbow",type:"Dogleg Right"},
  {par:4,yards:462,hcp:4,name:"The Grind",type:"Straight"},
  {par:3,yards:195,hcp:14,name:"Tough Carry",type:"Long Par 3"},
  {par:5,yards:552,hcp:6,name:"Eagle's Nest",type:"Risk/Reward"},
  {par:4,yards:391,hcp:12,name:"Driveable?",type:"Short Par 4"},
  {par:4,yards:437,hcp:18,name:"The Closer",type:"Finishing"},
]

const quickQuestions = [
  "How do I hit a low punch shot into the wind?",
  "Tips for a downhill lie in the rough?",
  "How should I read a fast downhill putt?",
  "What's the best way to escape a fairway bunker?",
  "How do I stop pulling my irons left?",
  "Give me a pre-shot routine I can use every hole.",
]

export default function Coach({ currentHole }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "I'm Eagle, your AI golf coach. I know your current hole and conditions. Ask me anything — swing tips, strategy, mental game, club selection." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const h = holes[currentHole]

  async function send(msg) {
    if (!msg.trim() || loading) return
    const userMsg = msg.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          system: `You are Eagle, an expert PGA-level golf coach and caddie. Current context: the player is on Hole ${currentHole + 1} — "${h.name}" (Par ${h.par}, ${h.yards} yards, ${h.type}). Give concise, practical, expert advice. Use proper golf terminology. Be encouraging but direct. Keep answers under 120 words.`,
          messages: [{ role: 'user', content: userMsg }]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Could not get a response.'
      setMessages(prev => [...prev, { role: 'ai', text: reply }])
    } catch(e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection error — try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid var(--bd)',
        borderRadius: 12, padding: 12, marginBottom: 12,
        maxHeight: 340, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? 'var(--g1)' : 'var(--bg2)',
            color: m.role === 'user' ? '#fff' : 'var(--tx)',
            padding: '10px 14px', borderRadius: 12,
            borderBottomRightRadius: m.role === 'user' ? 4 : 12,
            borderBottomLeftRadius: m.role === 'ai' ? 4 : 12,
            fontSize: 13, lineHeight: 1.6, maxWidth: '88%'
          }}>{m.text}</div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg2)',
            padding: '10px 14px', borderRadius: 12, fontSize: 13,
            color: 'var(--tx2)', fontStyle: 'italic' }}>Thinking...</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Ask your coach..."
          style={{ flex: 1, border: '1px solid var(--bd)', borderRadius: 8,
            padding: '10px 12px', fontSize: 14, background: '#fff' }} />
        <button onClick={() => send(input)}
          style={{ background: 'var(--g1)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 16px', fontWeight: 600,
            cursor: 'pointer', fontSize: 13 }}>Ask ↗</button>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Quick questions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {quickQuestions.map(q => (
          <button key={q} onClick={() => send(q)}
            style={{ border: '1px solid var(--bd)', borderRadius: 8,
              background: 'var(--bg2)', padding: '9px 12px', textAlign: 'left',
              fontSize: 12, color: 'var(--tx2)', cursor: 'pointer' }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}