export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { endpoint } = req.query
  if (!endpoint) return res.status(400).json({ error: 'No endpoint' })

  const key = process.env.GOLF_API_KEY || process.env.VITE_GOLF_API_KEY
  if (!key) return res.status(500).json({ error: 'No GOLF_API_KEY configured' })

  const url = `https://www.golfapi.io/api/v2.3/${decodeURIComponent(endpoint)}`

  // Per golfapi.io's docs the key goes in a Bearer Authorization header.
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    })
    const text = await response.text()
    res.status(response.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(text)
  } catch (err) {
    res.status(500).json({ error: 'Golf API error', details: err.message })
  }
}