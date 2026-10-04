# AI Movie Assistant

## Project Brief

AI Movie Assistant helps movie fans decide what to watch by turning requests such as “a comedy under two hours rated 7+” into verified movie recommendations. It is for people who want useful picks based on their time, genre, rating, or a film they already like. I chose this problem because recommendation systems are most useful when they understand natural language but still ground their results in trustworthy movie data.

## Live Application

- **Production URL:** Not deployed yet. A public deployment is still required before this can be submitted as a live application.
- **Local preview:** `http://localhost:5173/movie-assistant` after following the setup instructions. This address is only available on the developer's machine.

## Repository

- **GitHub:** [First-AI-Product repository](https://github.com/HabibaTasleem/First-AI-Product)

## Features

- Search movies using OMDb data.
- Create an account, sign in, and save favourite movies with Firebase.
- Ask for recommendations by genre, runtime, rating, release year, family suitability, or a similar title.
- Ask supported simple movie questions, such as a film's director, cast, plot, release year, runtime, or genres.
- Continue to get rule-based recommendations and supported movie facts when Gemini is unavailable.
- Browse movie details and favourites through the routed React application.

## Architecture

- `src/` contains the React and TypeScript frontend, routes, accessible UI components, auth context, and client services.
- `src/services/` owns calls to Firebase, OMDb, health, and the recommendation endpoint.
- `src/pages/` contains route-level views and their models/view models.
- `server/index.js` runs the local Express API on port 5000 and loads server environment variables.
- `server/recommend.js` is the shared recommendation engine used by both the local server and Vercel function.
- `server/recommend.test.mjs` tests parsing, filtering, fallbacks, provider errors, and recommendation behavior without external network calls.
- `api/recommend.js` exposes the recommendation engine as a Vercel serverless endpoint; `vercel.json` configures its duration and SPA rewrite.

## AI Integration

The assistant uses **Google Gemini**, not Claude. The server sends the request and recent conversation history to Gemini. Its system prompt asks it to return structured JSON containing an intent, recommendation criteria, and candidate movie titles. For ordinary movie questions it can return a short text response.

Gemini is used as a request interpreter and candidate generator, not as the source of truth. The server fetches candidate details from OMDb and applies the user's genre, runtime, rating, year, and family-suitability filters itself. This makes conversational requests flexible while preventing an unverified AI suggestion from being presented as a matching result. When Gemini fails, a rule-based parser handles common recommendation requests; supported movie-fact questions use OMDb.

The runtime system prompt is defined as `SYSTEM_PROMPT` in [`server/recommend.js`](server/recommend.js). It instructs Gemini to produce JSON matching the criteria/candidate schema, use recent history for follow-ups, and leave final filtering to the application.

## Setup and Run

Requirements: Node.js compatible with the installed Vite version, plus API credentials for the services you use.

Install both frontend and backend dependencies from the repository root:

```bash
npm ci
npm ci --prefix server
```

Copy `.env.example` to `.env` and `server/.env.example` to `server/.env`. Set the `VITE_OMDB_API_KEY` and Firebase `VITE_*` values in the root `.env`; set `GEMINI_API_KEY` in `server/.env`. Keep the Gemini key server-side and never commit either `.env` file.

Run the backend and frontend in separate terminals from the repository root:

```bash
npm run dev --prefix server
```

```bash
npm run dev
```

Open the Vite URL shown in the frontend terminal and select **Movie Assistant**. Vite proxies `/api` requests to `http://localhost:5000`.

## Testing Evidence

Run the offline server tests:

```bash
npm test --prefix server
```

Latest verified result: **14 tests passed, 0 failed**. The suite mocks Gemini and OMDb, including fallback behavior and an isolated OMDb network failure.

Run the frontend TypeScript check and production build:

```bash
npm run build
```

Latest verified result: build completed successfully. There are currently no component-level or end-to-end tests, and no coverage report is configured. The server test output is the available test evidence; a browser-flow test should be added for the primary recommendation workflow.

## Performance and Accessibility Audit

- **Lighthouse scores:** Not measured yet.
- **axe/WAVE audit:** Not run yet. WCAG 2.1 AA conformance has not been verified.
- **Automated accessibility test:** None currently configured.
- **Bundle note:** The production build reports a JavaScript bundle of approximately 851 kB, above Vite's 500 kB advisory threshold. Code splitting should be evaluated.
- **Accessibility support currently in the UI:** Native buttons and links, labeled form controls, poster alternative text, visible keyboard-focus styles, and reduced-motion handling.
- **Concrete manual improvement:** Recommendation posters have descriptive alternative text and interactive controls expose keyboard-focus styling. This is not a substitute for an axe/WAVE or manual WCAG audit; audit-derived fixes remain pending.

## Deployment and Operation

The repository includes a Vercel serverless recommendation endpoint and configuration, but the application has **not been deployed**. No production URL, deployment sign-off, monitoring, or rollback execution is available yet.

### Deployment Checklist

- [ ] Deploy the frontend and API to Vercel or another supported host.
- [ ] Configure Firebase, OMDb, and Gemini environment variables in the hosting provider.
- [ ] Verify Firebase auth, database rules, and the production domain.
- [ ] Test recommendation, simple movie-fact, fallback, sign-in, and favourites flows in production.
- [ ] Run Lighthouse on desktop and mobile; run axe or WAVE and address findings.
- [ ] Add a public live URL and confirm secret files are not tracked.
- **Sign-off:** Pending deployment and audit; not signed off.

### Safe Failure and Rollback

If Gemini is unavailable, supported recommendation requests fall back to deterministic parsing; supported movie facts can be looked up through OMDb. Recommendation candidates are checked against OMDb before display. An isolated OMDb lookup failure does not discard successful parallel lookups; a total provider outage still returns an error rather than fabricated movie data. The UI displays request errors instead of treating them as recommendations.

No monitoring service is configured. After deploying to Vercel, a basic rollback is to promote the previous successful production deployment from the Vercel Deployments page, or redeploy the last known-good commit from `main`. This is a documented plan, not a tested rollback.

## Known Limitations and Future Improvements

- The offline parser and factual question patterns cover common requests, not arbitrary natural-language questions.
- OMDb quotas, provider availability, and recommendation freshness depend on external services.
- There are no frontend component or end-to-end tests, no coverage report, and no automated accessibility checks.
- The app is not deployed, and production monitoring and rollback have not been exercised.
- Add Playwright flows, axe checks, Lighthouse baselines, bundle splitting, and provider monitoring before calling the project production-ready.

## Reflection

The hardest part was making free-form movie requests reliable. Gemini can interpret intent and suggest titles, but its output cannot be trusted to satisfy a user's exact constraints. Keeping the model in the planning role and validating every result against OMDb made the recommendations more dependable. I would add browser-level tests, accessibility audits, and deployment monitoring earlier, rather than leaving them until portfolio preparation. The most surprising lesson was that the AI works better as a structured planner than as the final decision-maker: deterministic filtering is what makes the result trustworthy.