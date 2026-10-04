import { handleRecommendRequest } from '../server/recommend.js'

// Vercel serverless endpoint for the Movie Assistant.
// Reads GEMINI_API_KEY and VITE_OMDB_API_KEY (or OMDB_API_KEY) from the Vercel project environment.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const { status, body } = await handleRecommendRequest(req.body, process.env)
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(status).json(body)
}
