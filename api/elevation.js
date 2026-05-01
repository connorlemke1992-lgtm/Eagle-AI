export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { lat, lng } = req.query
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' })

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${process.env.VITE_GOOGLE_MAPS_KEY}`
    )
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Elevation API error', details: err.message })
  }
}