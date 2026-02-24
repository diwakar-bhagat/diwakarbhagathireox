# Firebase Newsletter Setup

This setup adds:
- Client-side newsletter subscribe flow from footer.
- Duplicate prevention by normalized email document id.
- Firestore security rules for controlled access (create + single doc get only).
- Cloud Functions for queued campaigns and direct campaign send.

## 1) Firestore Collection Design

Collection: `newsletter_subscribers`

Document ID: normalized email (`email.toLowerCase().trim()`)

Document shape:

```json
{
  "email": "name@example.com",
  "emailLower": "name@example.com",
  "source": "footer",
  "status": "active",
  "createdAt": "serverTimestamp()"
}
```

Why this prevents duplicates:
- The client checks if a document with this email id exists before create.
- Rules allow `create` only when that document id does not exist.

## 2) Security Rules

Rules file:
- `firebase/firestore.rules`

Deploy:

```bash
firebase deploy --only firestore:rules
```

## 3) Cloud Functions (Campaign Sending)

Functions source:
- `firebase/functions/index.js`

Functions added:
- `queueNewsletterCampaign` (HTTP): queue a campaign in Firestore.
- `sendNewsletterCampaign` (HTTP): send immediately to all active subscribers.
- `processQueuedNewsletterCampaigns` (Scheduler): runs every 30 minutes.

### Install function dependencies

```bash
cd firebase/functions
npm install
```

### Configure function environment

Copy and fill:
- `firebase/functions/.env.example` -> `.env`

Required:
- `NEWSLETTER_ADMIN_TOKEN`
- `NEWSLETTER_FROM_EMAIL`
- `EMAIL_PROVIDER` (`resend` | `sendgrid` | `mailgun`)
- Provider API key(s)

### Deploy functions

```bash
firebase deploy --only functions
```

## 4) Secure HTTP Usage

Use admin token via header:
- `Authorization: Bearer <NEWSLETTER_ADMIN_TOKEN>`
or
- `X-Newsletter-Admin-Token: <NEWSLETTER_ADMIN_TOKEN>`

Example direct send:

```bash
curl -X POST "https://<region>-<project-id>.cloudfunctions.net/sendNewsletterCampaign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <NEWSLETTER_ADMIN_TOKEN>" \
  -d '{
    "subject": "New features on HireOX.AI",
    "html": "<h1>Update</h1><p>We shipped new interview insights.</p>",
    "provider": "resend"
  }'
```

Example queued send:

```bash
curl -X POST "https://<region>-<project-id>.cloudfunctions.net/queueNewsletterCampaign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <NEWSLETTER_ADMIN_TOKEN>" \
  -d '{
    "subject": "Weekly newsletter",
    "text": "Thanks for using HireOX.AI",
    "provider": "resend"
  }'
```

## 5) Client Integration Files

- `client/src/utils/firebase.js` exports `db`.
- `client/src/services/newsletter.js` performs duplicate check + create.
- `client/src/components/Footer.jsx` calls newsletter service on submit.

No interview/payment logic was changed.
