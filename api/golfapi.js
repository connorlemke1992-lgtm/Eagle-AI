export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { endpoint } = req.query
  if (!endpoint) return res.status(400).json({ error: 'No endpoint' })

  try {
    const response = await fetch(
      `https://www.golfapi.io/api/v2.3/${endpoint}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.VITE_GOLF_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Golf API error' })
  }
}