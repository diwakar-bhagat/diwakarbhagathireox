# Domain Migration Runbook (`diwakarbhagathireox.onrender.com` -> `hireox.in`)

## Automated Changes (already applied in repo)

- Updated backend default CORS allowlist in `server/index.js` to include:
  - `https://hireox.in`
  - `https://www.hireox.in`
- Updated `server/.env.example`:
  - `CLIENT_ORIGINS=https://hireox.in,https://www.hireox.in,http://localhost:5173,http://127.0.0.1:5173`
- Updated `client/.env.example`:
  - `VITE_SERVER_URL=https://ox-server-90t3.onrender.com`

## MANUAL: Firebase Console

1. Go to Firebase Console -> Authentication -> Settings -> Authorized domains.
2. Add:
   - `hireox.in`
   - `www.hireox.in`
3. Keep old domain temporarily during migration:
   - `diwakarbhagathireox.onrender.com`

## MANUAL: Google OAuth (Cloud Console)

1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Open the OAuth Web Client used by Firebase Auth.
3. Add Authorized JavaScript origins:
   - `https://hireox.in`
   - `https://www.hireox.in`
4. Ensure redirect URI for Firebase handler is present:
   - `https://hireox-2a852.firebaseapp.com/__/auth/handler`

## MANUAL: Razorpay Webhooks

1. Open Razorpay Dashboard -> Webhooks.
2. Ensure webhook endpoint points to backend API host (not frontend domain).
3. If backend host is still Render API service, keep endpoint on that host.
4. Rotate and set webhook secret in backend env (if webhook flow is enabled).

## MANUAL: Render Environment Variables

### Backend service

- `CLIENT_ORIGINS=https://hireox.in,https://www.hireox.in,https://diwakarbhagathireox.onrender.com,http://localhost:5173,http://127.0.0.1:5173`
- `FIREBASE_WEB_API_KEY=<firebase_web_api_key_for_hireox-2a852>`
- `JWT_SECRET=<strong_secret>`
- Keep existing payment/database secrets.

### Frontend service

- `VITE_SERVER_URL=https://ox-server-90t3.onrender.com` (or your backend custom API domain)
- `VITE_FIREBASE_APIKEY=<same_firebase_web_api_key>`
- `VITE_RAZORPAY_KEY_ID=<live_key_id>`

Redeploy backend and frontend after env updates.

## MANUAL: Canonical Domain Enforcement

In Render frontend "Redirects/Rewrites":

1. Redirect `https://www.hireox.in/*` -> `https://hireox.in/:splat` with `301`.
2. Keep old Render frontend domain live briefly, then add `301` to canonical.

## MANUAL: SSL/TLS Validation

1. Confirm certificate is valid for:
   - `hireox.in`
   - `www.hireox.in`
2. Confirm no mixed-content errors in browser console.

## Verification (post-deploy)

1. Login flow:
   - `POST /api/auth/google` -> `200`
   - `GET /api/user/current-user` -> `200`
2. Payment flow:
   - Order creation succeeds
   - Payment verify succeeds
3. CORS:
   - Calls from `https://hireox.in` succeed
   - Unknown origins rejected

## Silent Failure Modes to watch

- Missing `www.hireox.in` in Firebase authorized domains
- OAuth `origin_mismatch` due stale Google OAuth origins
- Backend `CLIENT_ORIGINS` missing canonical domains
- Env changed without redeploy
- Webhook still targeting old URL
