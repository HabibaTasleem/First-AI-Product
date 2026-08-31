import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const apiKey = process.env.GEMINI_API_KEY?.trim()

console.log(`Gemini API key loaded: ${Boolean(apiKey)}${apiKey ? ` (${apiKey.length} characters)` : ''}`)

const ai = new GoogleGenAI({
	apiKey,
})

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
	res.send('Gemini chatbot backend is running.')
})

app.get('/api/health', (req, res) => {
	res.json({ success: true })
})

app.post('/api/chat', async (req, res) => {
	const { message } = req.body
	let clientDisconnected = false

	res.on('close', () => {
		if (!res.writableFinished) {
			clientDisconnected = true
		}
	})

	if (typeof message !== 'string' || !message.trim()) {
		return res.status(400).json({ error: 'Message is required.' })
	}

	try {
		const stream = await ai.models.generateContentStream({
			model: 'gemini-3.6-flash',
			contents: message.trim(),
		})

		if (clientDisconnected || res.destroyed) {
			return res.end()
		}

		res.setHeader('Content-Type', 'text/plain; charset=utf-8')
		res.setHeader('Cache-Control', 'no-cache')
		res.setHeader('Connection', 'keep-alive')
		res.flushHeaders()

		for await (const chunk of stream) {
			if (clientDisconnected || res.destroyed) {
				break
			}

			if (chunk.text) {
				res.write(chunk.text)
			}
		}

		return res.end()
	} catch (error) {
		const safeMessage = String(error.message || 'Unknown Gemini error')
			.replace(apiKey || '', '[REDACTED]')

		console.error('Gemini request failed:', {
			name: error.name || 'Error',
			status: error.status || error.code || 'unknown',
			message: safeMessage,
		})
		if (res.headersSent) {
			return res.end()
		}

		return res.status(500).json({ error: 'Unable to get a response from Gemini.' })
	}
})

app.listen(port, () => {
	console.log(`Server listening on port ${port}`)
})

export { ai, app }
