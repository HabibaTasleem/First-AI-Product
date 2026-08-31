# Movie Assistant Gemini Server

This backend is reused from the working AI-Chatbot project.

## Run

From the project root:

```bash
cd server
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default.

The React/Vite app proxies `/api/*` to this server during local development, so Movie Assistant uses the same streaming `/api/chat` behavior as the original chatbot.

Keep `server/.env` private and never expose `GEMINI_API_KEY` in the browser.
