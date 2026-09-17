# 03. Auth and accounts

## Constraints

- **10ms of CPU per HTTP request on the Workers Free plan.** No password
  hashing. Everything cryptographic uses WebCrypto: SHA-256 for token hashes,
  HMAC-SHA-256 for room tickets, RSA verification for Google ID tokens. Waiting
  on network calls does not count as CPU time.
- **Email sending needs Workers Paid.** Magic links come later; see below.
- **No passwords in the new system.** Password accounts from MongoDB are carried
  over by email and sign in with Google (or a magic link once available).

## Sign-in methods

| Method | When | Result |
|---|---|---|
| Google | From the start | Account session |
| Guest | From the start | Guest session: lobby and guest-link rooms only |
| Magic link | When on Workers Paid, or through an external email provider | Account session |

### Google (OpenID Connect, authorization code flow)

1. `GET /v1/auth/google/start?next=/dashboard`
   - Creates `state` and `nonce`, and a PKCE `code_verifier`.
   - Stores them in a short-lived, HttpOnly cookie (10 minutes).
   - Redirects to Google with `scope=openid email profile`.
2. `GET /v1/auth/google/callback?code&state`
   - Checks `state` against the cookie.
   - Exchanges the code at Google's token endpoint (network, not CPU).
   - Verifies the ID token: signature against Google's JWKS (cached with the
     Cache API for the time Google allows), `iss`, `aud`, `exp`, `nonce`,
     `email_verified`.
   - Finds the user by `google_sub`, else by verified `email` (this is how
     migrated accounts get linked), else creates one.
   - Creates a session and redirects to `next`, which must be a same-site path.

### Guests

`POST /v1/auth/guest { name, character, turnstileToken }`

- Turnstile is verified server-side before anything is created.
- Creates a user with `is_guest = 1` and a 7-day session.
- Signing in with Google later **upgrades the guest in place** when it's the
  same browser: the guest row becomes the account, so the name and character
  carry over.

### Magic links (later)

`POST /v1/auth/magic-link { email, turnstileToken }` sends a single-use link
valid for 15 minutes. The token is stored as a SHA-256 hash.
`GET /v1/auth/magic-link/verify?token` signs the person in. Limited to 3 emails
per address per hour.

## Sessions

- A 32-byte random token, base64url, set as:
  `tf_session=<token>; Domain=.tinyfloor.com; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=...`
- D1 stores only `SHA-256(token)`, so a database leak exposes no usable
  sessions.
- Each authenticated request is one D1 read: the session joined with the user.
- `last_seen_at` is refreshed at most once a day, to keep writes low.
- Logout deletes the row and clears the cookie.

## CSRF and CORS

- `tinyfloor-api` sends CORS headers only for the site's origin, with
  `Access-Control-Allow-Credentials: true`.
- Every state-changing request (POST, PATCH, DELETE) must carry
  `Content-Type: application/json`. Combined with `SameSite=Lax` and the strict
  origin list, cross-site forms cannot trigger them.
- The API also checks the `Origin` header on those requests.

## Room tickets

The realtime Worker never reads D1 when someone connects. The API decides who may
enter a room and hands out a ticket:

```ts
interface RoomTicket {
  v: 1;
  room: string;        // room id or lobby copy, e.g. "lobby-2"
  sub: string;         // user id
  name: string;
  character: string;
  role: "owner" | "admin" | "member" | "guest";
  cap: number;         // room capacity
  exp: number;         // now + 60 seconds
}
```

- Encoded as `base64url(json).base64url(hmacSha256(json, TICKET_SECRET))`.
- `TICKET_SECRET` is shared by `tinyfloor-api` and `tinyfloor-realtime`.
- The realtime Worker checks the signature and expiry, and that `room` matches
  the URL.
- A ticket works once per connection attempt window. Reconnects fetch a new one.

## Who may get a ticket

| Room | Allowed |
|---|---|
| Lobby copy | Anyone with a session, guest or account |
| Workspace room | Members of that workspace |
| Workspace room through a guest link | Anyone with a session and a valid, unexpired, unrevoked guest link |

## Abuse protection

- Turnstile on guest sign-up and magic-link requests. A guest passes it once,
  when the guest is created, not again for each lobby ticket.
- Per-IP and per-user limits on sign-in, guest creation, invites and ICE
  credentials.
  - Use the Workers Rate Limiting binding if it's available on the plan in use.
  - Otherwise, a small counter in D1 per IP per minute for the few sensitive
    endpoints only.
- WebSocket message limits are enforced in the room object; see
  `05-realtime-rooms.md`.

## Account settings

- `PATCH /v1/me { displayName, character }`
- Delete account: removes memberships, sessions and the user. Workspaces they
  own must be transferred or deleted first.
