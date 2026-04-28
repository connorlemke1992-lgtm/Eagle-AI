export default function Stats({ scores }) {
  const played = scores.filter(s => s !== null).length
  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 20,
        textAlign: 'center', color: 'var(--tx2)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
          Stats unlock after your round
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          {played === 0
            ? 'Play a few holes on the Scorecard tab to start building your stats.'
            : `You've played ${played} holes. Finish your round to see full analysis.`}
        </div>
      </div>
    </div>
  )
}