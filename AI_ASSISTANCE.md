# AI Assistance

## How AI Assisted

AI assisted throughout the implementation of the Movie Application by helping with:

- Planning the MVVM folder structure.
- Creating typed Firebase Realtime Database service functions.
- Setting up Firebase Authentication and Cloud Firestore.
- Creating authentication model, view-model, and view files.
- Building the global authentication context.
- Connecting authentication state to application routing.
- Protecting the Favourites page from unauthenticated users.
- Connecting Favourite buttons to Firebase through the service and model layers.
- Adding loading, error, empty, hover, and success states.
- Improving the login page styling.
- Checking TypeScript diagnostics and production builds.

AI-generated code was reviewed, tested, and adjusted during development rather than being submitted without review.

## Manual Improvements and Corrections

After reviewing the AI-generated code, the following improvements were made manually:

- Fixed Firebase permission and authentication configuration problems.
- Removed automatic anonymous authentication so protected pages require a real account.
- Treated anonymous Firebase users as unauthenticated in the global auth context.
- Corrected the protected `/favourites` route and added the `/auth` route behavior.
- Moved unauthenticated Favourite redirect logic into the Home view-model.
- Added the missing Favourites route rendering so stored movies display correctly.
- Added a removal callback to `MovieCard` while preserving Home page behavior.
- Adjusted movie card height without changing its width.
- Changed Favourite button feedback from a green saved state to the normal button color.
- Added hover and saving states to Favourite buttons.
- Added and connected the Header Logout button.
- Moved shared authentication types into `src/types`.
- Added readable validation and Firebase error messages.
- Reviewed TypeScript diagnostics and production build output after changes.
