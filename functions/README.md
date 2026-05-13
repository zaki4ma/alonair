# Alonair Firebase Functions

`analyzeCheckinPhoto` proxies Gemini image analysis so the mobile app does not ship a public Gemini API key.

## Required Firebase setup

Firebase Functions secrets require the project to be on the Blaze plan.

1. Upgrade the Firebase project to Blaze:
   https://console.firebase.google.com/project/alonair/usage/details
2. Set the Gemini key as a Functions secret:

   ```sh
   npx firebase-tools functions:secrets:set GEMINI_API_KEY --project alonair
   ```

3. Deploy functions:

   ```sh
   npm run deploy:functions
   ```

4. If callable requests return `401 Unauthorized` before reaching the function, allow public invocation on the underlying Cloud Run service. The function still requires Firebase Auth inside the handler.

   Google Cloud Console:
   - Cloud Run
   - Region: `asia-northeast1`
   - Service: `analyzecheckinphoto`
   - Permissions
   - Grant access
   - New principals: `allUsers`
   - Role: `Cloud Run Invoker`

## Function

- `analyzeCheckinPhoto`
- Region: `asia-northeast1`
- Auth: Firebase Auth required
- Input: `{ base64: string, mimeType: string }`
- Output: `{ keywords, category, colorTemp, density, tools, mood }`
