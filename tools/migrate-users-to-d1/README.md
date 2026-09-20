# migrate-users-to-d1

Carried TinyFloor accounts from MongoDB into D1 when the platform moved, in
September 2026. Run locally, never deployed; kept only in case another batch of
old accounts turns up.

```bash
pnpm install
node export.mjs            # MongoDB users -> out/users.json (read-only; MONGODB_URI or backend-springboot/.env)
node transform.mjs         # -> out/users.sql and out/report.json
node import.mjs --local    # rehearsal; --remote on the day
node verify.mjs --local    # every written account present and matching
node --test                # the mapping's tests
```

`out/` holds personal data and is gitignored. Delete it after the cutover.
