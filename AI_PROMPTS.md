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

## Project Structure and Quality

25. Scaffold the existing React + Vite + TypeScript movie application with missing folders and empty files only, without changing existing functionality.
26. Inspect the installed npm libraries and install only genuinely required missing packages.
27. Implement only the routing structure using the installed routing library, connect existing pages, and add placeholder route components where necessary.
28. Add basic placeholder content to currently empty routed pages without implementing real functionality.
29. Configure Tailwind CSS and a base design system with typography, spacing, container width, border radius, surface, color, and responsive tokens.
30. Make the existing application responsive at 375px and 1280px without changing business functionality.
31. Implement a health-check page and service that fetch data from an accessible endpoint, display the result, and handle loading and errors.
32. Review and improve the existing Firebase integration without rebuilding it, preserving authentication and environment-variable configuration.
33. Perform a code-quality review for duplicate code, unused imports, incorrect types, missing error handling, unnecessary dependencies, broken imports, and dead files, then apply only safe refactoring.
34. Perform a production build check for TypeScript errors, missing imports/files, routing, environment variables, Tailwind, and Vite configuration.
35. Remove Movies and Health links from the navigation bar while preserving their routes.
36. Remove Health page-specific styling while preserving the health-check functionality.

## Security and Submission Documentation

37. Perform a security review of environment variables and secrets, ensuring `.env` is ignored, `.env.example` contains placeholders only, and no secrets are in source or console output.
38. Document the prompts used during development, how AI assisted, and the manual corrections and refactoring performed after reviewing AI-generated code.
39. Explain what files should be uploaded to GitHub, how to keep `.env` private, and how to provide a separate live demo URL.
40. Perform a final audit of the complete project against the assignment requirements and report the status of scaffolding, routing, layout, Server Components, Tailwind, Vercel, preview deployments, environment variables, health checks, responsiveness, secrets, and final deliverable links without making changes.
