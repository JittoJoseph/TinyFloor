# 03. Auth and accounts

## Constraints

- **10ms of CPU per HTTP request on the Workers Free plan.** Password hashing
  takes far longer, so it runs in the `PasswordGuard` Durable Object, which gets
  30 seconds of CPU per request on every plan. Everything else uses WebCrypto:
  SHA-256 for token hashes and HMAC-SHA-256 for room tickets.
- **Email sending needs Workers Paid**, or an external provider. Password reset
  and magic links wait for that.

## Sign-in methods

| Method | When | Result |
|---|---|---|
| Email and password | From the start | Account session (30 days) |
| Guest | From the start | Guest session (7 days): lobby and guest-link rooms only |
| Google | Far later | Account session |
| Magic link, password reset | Once email sending is set up | Account session |

### Email and password

- `POST /v1/auth/signup { email, password, displayName, character?, turnstileToken }`
  - The sign-up form asks for a name, an email and a password only. A
    character comes from whatever the browser remembers, or the default; it
    is picked at the door of a space, not when making an account.
  - Email is trimmed and lowercased. Passwords are 8 characters to 72 bytes
    (bcrypt's limit), and not only spaces.
  - Turnstile is checked before anything is created.
  - An email that already has an account gets `409 email_taken`.
  - **A guest who signs up is upgraded in place:** same user id, keeping their
    name and character unless they chose new ones. Their guest session is
    replaced by an account session.
- `POST /v1/auth/login { email, password }`
  - Wrong password and unknown email get the same `401 wrong_credentials`, and
    an unknown email is checked against a decoy hash so both take as long.
  - Five wrong passwords for one email within 15 minutes lock that email for the
    rest of the window (`429`). One IP address gets 30 attempts per 15 minutes
    across all emails.
  - Signing in from a guest session ends the guest session.
- `POST /v1/me/password { currentPassword, newPassword }` signs out every other
  session.
- Errors carry `field` when they are about one form field, so the site can show
  them next to it.

Hashes are bcrypt, cost 11. The Java backend's hashes are bcrypt too (cost 10),
so carried-over accounts sign in with their old passwords, and their hash is
quietly upgraded to cost 11 on the first sign-in.

### `PasswordGuard` Durable Object

One object per `email:<address>` or `ip:<address>`:
- `hash(password)`, `verify(password, hash | null)`, `needsRehash(hash)`
- `attempt(max)` for the per-IP count
- Failure counts live in its SQLite and reset on a successful sign-in.

### Guests

`POST /v1/auth/guest { name, character, turnstileToken }`

- Turnstile is verified server-side before anything is created.
- Creates a user with `is_guest = 1` and a 7-day session.
- Signing up later upgrades the guest in place (above).

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
- `AUTH_LIMIT`, a Workers Rate Limiting binding: 10 sign-ups, sign-ins and
  guest creations per IP per minute (`slow_down`), checked before Turnstile.
- Sign-in: 5 wrong passwords per email per 15 minutes, 30 attempts per IP
  (`PasswordGuard`).
- ICE credentials are cached per user for an hour.
- WebSocket message limits are enforced in the room object; see
  `05-realtime-rooms.md`.

## Account settings

- `PATCH /v1/me { displayName, character }`
- Delete account: removes memberships, sessions and the user. Workspaces they
  own must be transferred or deleted first.
