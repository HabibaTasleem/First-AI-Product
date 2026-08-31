# Movie Application

A React, TypeScript, and Vite movie application with OMDb search, Firebase authentication, protected favourites, and a health-check page.

## Live Demo

Add the deployed application URL here after deploying to Vercel or Netlify.

## Technologies

- React and TypeScript
- Vite
- React Router
- Firebase Authentication
- Firebase Realtime Database
- Cloud Firestore
- OMDb API
- Tailwind CSS v4 with Vite integration

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Add your own OMDb and Firebase values to `.env`, then start the app:

```bash
npm run dev
```

Never upload `.env`. It is excluded by `.gitignore`. Upload `.env.example` with placeholder values only.

## Routes

- `/` - Home movie search and results
- `/auth` - Login and account creation
- `/favourites` - Protected favourite movies page
- `/favorites` - Protected American-spelling alias
- `/movies` - Movies placeholder page
- `/movies/:id` - Movie details placeholder page
- `/search` - Search placeholder page
- `/health` - Fetch-backed health-check page

## Assignment Documentation

- [AI prompts used during development](AI_PROMPTS.md)
- [AI assistance and manual improvements](AI_ASSISTANCE.md)

The project keeps the real `.env` file local. Firebase web configuration is supplied through Vite environment variables, and `.env.example` documents the required variable names.

## Submission Checklist

- [ ] Deploy the application to Vercel or Netlify.
- [ ] Add the required `VITE_*` environment variables in the hosting provider dashboard.
- [ ] Confirm Firebase Authentication, database rules, and the deployed domain configuration.
- [ ] Test `/`, `/auth`, `/favourites`, `/movies`, `/movies/:id`, `/search`, and `/health`.
- [ ] Test the application at 375px and 1280px with no horizontal overflow.
- [ ] Confirm preview deployments work for pushes or branches.
- [ ] Confirm `.env` is not tracked or present in Git history.
- [ ] Replace the Live Demo placeholder above with the deployed URL.
- [ ] Submit both the GitHub repository URL and the Live Demo URL.

The assignment audit identified Server Components as a framework-dependent requirement. This project uses React with Vite rather than Next.js, so it does not provide Server Components. Confirm with the assessor whether this requirement applies to this Vite assignment.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Development Prompts

The following prompts were used to build and refine this application:

1. Shorten every movie card to approximately 30% of the available row width without changing the card width afterward.
2. Restore the movie cards to their original layout and dimensions.
3. Shorten the vertical length of every card by approximately 30%, then make it an additional 10% shorter without changing its width.
4. Implement `src/services/firebaseService.ts` with typed `addFavourite`, `removeFavourite`, and `getFavourites` functions using `imdbID` as the unique identifier. Keep Firebase communication in the service and return readable errors.
5. Implement `src/pages/Favourites/FavouritesModel.ts` as a wrapper around the Firebase service with `loadFavourites`, `saveFavourite`, and `deleteFavourite`.
6. Implement `src/pages/Favourites/useFavouritesViewModel.ts` with favourites, loading, and error state; load favourites on mount; and remove movies from local state after deletion.
7. Implement `src/pages/Favourites/FavouritesView.tsx` with loading, error, empty, mapped `MovieCard`, and remove states using only the view model.
8. Make the Home page Favourite button save the selected movie to Firebase through the model and view-model layers.
9. Fix Firebase permission errors by configuring authentication and explaining the required Realtime Database rules and Anonymous Authentication setup.
10. Keep the Favourite button label as `Favourite`, show saving feedback, and add hover color styling without using a green saved color.
11. Initialize Firebase Authentication with `getAuth`, Cloud Firestore with `getFirestore`, export `auth` and `db`, read configuration from Vite environment variables, and create `.env.example`.
12. Create `src/services/authService.ts` with typed registration, login, logout, and auth-state subscription functions using the modular Firebase Authentication SDK.
13. Create the authentication MVVM files: `AuthModel.ts`, `useAuthViewModel.ts`, and `AuthView.tsx`, initially as typed placeholders.
14. Implement `AuthModel.ts` with email normalization, credential validation, six-character minimum passwords, and wrappers around `authService`.
15. Implement `useAuthViewModel.ts` with email, password, mode, loading, and error state; submit handling; mode toggling; readable errors; and password clearing after successful authentication.
16. Implement `AuthView.tsx` as a controlled login and registration form with validation messages, loading state, submit handling, and an account-mode switch.
17. Create a global `AuthContext` with `user`, `authLoading`, and `logout`; subscribe through `authService`; unsubscribe on unmount; show an initialization loading state; and wrap the application with `AuthProvider`.
18. Move authentication context types, including `AuthProviderProps`, into `src/types`.
19. Add `/auth`, protect `/favourites`, keep Home public, redirect unauthenticated users to `/auth`, redirect authenticated users away from `/auth`, and preserve the Header on every page.
20. Move unauthenticated Favourite redirect logic into the Home view model.
21. Add a Header Logout button connected to the global authentication context.
22. Redirect unauthenticated users who click a Home Favourite button into the protected favourites/authentication flow.
23. Restyle the login page with a responsive centered panel, styled inputs, error messages, buttons, focus states, and a themed background.
24. Add clear account switching text: `Already have an account? Login` and a matching create-account prompt.

The complete prompt history is available in [AI_PROMPTS.md](AI_PROMPTS.md), including project scaffolding, routing, Tailwind setup, responsive behavior, health checks, security review, and code-quality review.
## AI Assistance

See the complete explanation in [AI_ASSISTANCE.md](AI_ASSISTANCE.md).

AI was used to help design and implement the application structure, including
Firebase services, authentication, MVVM layers, routing protection, UI
styling, and error handling. I reviewed and tested the generated code
throughout the development process.

## Manual Improvements and Corrections

After reviewing the AI-generated code, I:

- Corrected Firebase authentication and permission configuration issues.
- Adjusted movie card height while preserving card width.
- Moved redirect logic into the Home view-model.
- Moved shared authentication types into `src/types`.
- Added protected routing for the Favourites page.
- Added saving feedback and hover states to Favourite buttons.
- Added and connected the Logout button.
- Ran TypeScript diagnostics and production builds to verify the application.

The complete development prompt list is available in [AI_PROMPTS.md](AI_PROMPTS.md).
## Movie Assistant (Gemini)

The project now includes the streaming Gemini Movie Assistant reused from the working AI-Chatbot project.

### Local development

1. Install the movie app dependencies in the project root: `npm install`
2. Install the assistant backend dependencies: `cd server && npm install`
3. Make sure `server/.env` contains your `GEMINI_API_KEY` and `PORT=5000`.
4. Start the backend: `npm run dev` from `server/`.
5. Start the React app with `npm run dev` from the project root.
6. Open **Movie Assistant** from the navbar.

The Vite development server proxies `/api/chat` to the Gemini backend on port 5000. The assistant keeps the original chatbot's streaming responses, loading state, Stop button, error handling, and browser-session conversation behavior.
