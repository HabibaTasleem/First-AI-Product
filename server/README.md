# AI Movie Assistant — Portfolio Entry

## Project Brief

AI Movie Assistant helps movie fans decide what to watch by turning requests such as “a comedy under two hours rated 7+” into verified movie recommendations. It is for people who want useful picks based on their time, genre, rating, or a film they already like. I chose this idea because movie discovery benefits from natural-language search, but recommendations should still be grounded in real movie data.

## Live Application

- **Production URL:** Pending deployment. There is no public live instance yet.
- **Local application:** [Open Movie Assistant locally](http://localhost:5173/movie-assistant) after following Setup. This URL is not publicly accessible.

## Repository

- **GitHub repository:** [First-AI-Product](https://github.com/HabibaTasleem/First-AI-Product)

## Setup and Run

Requirements: Node.js compatible with the installed Vite version and credentials for the services you enable.

From the repository root, install frontend and server dependencies:

```bash
npm ci
npm ci --prefix server
```

Copy `.env.example` to `.env` and `server/.env.example` to `server/.env`. In the root `.env`, configure `VITE_OMDB_API_KEY` and the Firebase `VITE_*` values. In `server/.env`, configure `GEMINI_API_KEY`. Never commit real `.env` files or expose the Gemini key through a `VITE_*` variable.

Run the backend and frontend in separate terminals from the repository root:

```bash
npm run dev --prefix server
```

```bash
npm run dev
```

Open the Vite URL printed in the frontend terminal and select **Movie Assistant**. Vite proxies `/api` requests to the local Express server at `http://localhost:5000`.

## Architecture

- [React frontend](../src): routed screens, accessible controls, chat UI, auth context, and client-side services.
- [Recommendation API server](index.js): Express routes, environment loading, and local `/api/recommend` endpoint.
- [Recommendation engine](recommend.js): Gemini request planning, fallback parsing, OMDb lookups, validation, filtering, and response composition; shared with the Vercel function.
- [Vercel recommendation function](../api/recommend.js): serverless entry point for the same recommendation engine.
- [Vercel configuration](../vercel.json): serverless duration and single-page application rewrite.
- [Offline server tests](recommend.test.mjs): mocked-provider coverage of parsing, filtering, fallbacks, and failures.
- [Frontend services and pages](../src): Firebase auth/favourites, movie search, and Movie Assistant views.

## AI Integration

The project uses **Google Gemini**, not Claude. For recommendation requests, the server sends the user's message and recent history to Gemini. The `SYSTEM_PROMPT` in [the recommendation engine](recommend.js) asks Gemini to return structured JSON with an intent, criteria (such as genre, runtime, rating, years, family suitability, and similar title), and candidate movie titles. For supported simple movie questions, Gemini can return a short text answer.

Gemini interprets requests and proposes candidates; it does not decide which movies pass. The server looks up candidates in OMDb and applies the requested filters to verified movie details. This gives users natural-language recommendations without trusting the model to invent metadata or claim a title meets constraints when it does not. If Gemini is unavailable, a rule-based parser handles common recommendation requests, and supported movie facts can be looked up through OMDb.

## Testing Evidence

Run the offline suite from the repository root:

```bash
npm test --prefix server
```

Latest verified output: **14 tests passed, 0 failed**. Tests cover structured criteria, filtering, similar-title behavior, family suitability, partial OMDb failure, Gemini fallback, movie-fact fallback, greetings, input validation, and error handling. Gemini and OMDb are mocked, so the tests need no external API keys or network access.

The frontend TypeScript check and production build are run with:

```bash
npm run build
```

The build succeeds. There are no frontend component tests, browser end-to-end tests, or coverage report configured yet; add an end-to-end recommendation flow before claiming full UI test coverage.

## Performance and Accessibility Audit

- **Lighthouse:** Not run; no scores are available.
- **WAVE/axe:** Not run; WCAG 2.1 AA conformance has not been verified.
- **Automated accessibility checks:** Not configured.
- **Bundle size:** The production build reports an approximately 851 kB JavaScript bundle and warns that it exceeds Vite's 500 kB advisory threshold.
- **Current accessibility support:** Native buttons and links, labeled form controls, descriptive poster alt text, keyboard focus styles, and reduced-motion handling.
- **Concrete improvement:** Recommendation posters use descriptive alternative text and interactive controls expose visible keyboard focus. These are existing manual accessibility improvements, not audit-driven changes; run axe/WAVE and document the resulting fixes before sign-off.

## Deployment and Operation

The repository has a Vercel serverless endpoint, but **the application is not deployed yet**. There is no production URL, monitoring integration, or deployment sign-off.

### Deployment Checklist

- [ ] Deploy the frontend and API to Vercel, Netlify, or another supported host.
- [ ] Configure Gemini, OMDb, and Firebase environment variables in the host.
- [ ] Verify Firebase authentication, database rules, and production domain settings.
- [ ] Test recommendation, movie-fact, fallback, sign-in, and favourites flows in production.
- [ ] Run Lighthouse on desktop and mobile; run axe or WAVE and address findings.
- [ ] Confirm secrets are not tracked and add the public production URL above.
- **Sign-off:** Pending deployment and audits; not signed off.

### Safe Failure and Rollback

When Gemini is unavailable, common recommendation requests use a deterministic fallback parser; supported movie facts use OMDb. Recommendation results are checked against OMDb before display. An isolated OMDb failure does not discard successful lookups, while a total provider outage returns an error instead of fabricated movie data. The UI displays request errors instead of presenting them as recommendations.

Monitoring is not configured. After deployment, rollback can be performed by promoting the previous successful Vercel deployment or redeploying the last known-good commit from `main`. This plan has not yet been tested against a production deployment.

## Known Limitations and Future Improvements

- Offline parsing and factual-question support cover common patterns, not arbitrary movie questions.
- Provider availability, daily quotas, and movie-data freshness depend on Gemini and OMDb.
- Frontend component/e2e tests, coverage reporting, automated accessibility checks, and performance audits are missing.
- The app has no public deployment or production monitoring yet.
- Add a Playwright recommendation flow, axe checks, Lighthouse baselines, bundle splitting, and provider monitoring before production sign-off.

## Reflection

The hardest part was making free-form requests reliable. Gemini can understand what a user wants, but its candidate list cannot be trusted to satisfy every constraint. Keeping the model in a structured planning role and validating each result against OMDb made the recommendations dependable. I would add browser tests, accessibility audits, and monitoring earlier instead of leaving them until portfolio preparation. I was surprised by how much more useful the AI became when it planned the search while deterministic code made the final decision.
