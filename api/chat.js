const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'

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

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured in Vercel.')
    return res.status(500).json({ error: 'Gemini API key is not configured.' })
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' })
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
        }),
      },
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API request failed:', geminiResponse.status, errorText.slice(0, 1000))
      return res.status(502).json({ error: 'Unable to get a response from Gemini.' })
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    if (!geminiResponse.body) {
      return res.end()
    }

    const reader = geminiResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const text = parsed.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || '')
              .join('') || ''
            if (text) res.write(text)
          } catch {
            // Ignore malformed/incomplete SSE events and continue streaming.
          }
        }
      }

      if (done) break
    }

    return res.end()
  } catch (error) {
    console.error('Gemini serverless function failed:', error)
    if (res.headersSent) return res.end()
    return res.status(500).json({ error: 'Unable to get a response from Gemini.' })
  }
}
