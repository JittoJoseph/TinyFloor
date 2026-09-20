// Turns exported MongoDB users into SQL for D1, and says what was left out and why.
//   node transform.mjs [out/users.json]  ->  out/users.sql, out/report.json
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cleanDisplayName, DEFAULT_CHARACTER, isCharacter } from "../../shared-protocol/src/profile.ts";

/** Rows per INSERT, keeping each statement well under D1's statement size limit. */
const ROWS_PER_STATEMENT = 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Spring's BCryptPasswordEncoder writes $2a$; bcryptjs reads $2a$ and $2b$. */
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * The mapping from docs/09-data-migration-and-cutover.md. Only accounts that can
 * sign in on the new platform are carried over: not guests, and not accounts
 * without an email or a password.
 */
export function transform(users) {
  const skipped = [];
  const byEmail = new Map();

  for (const user of users) {
    const id = String(user._id ?? "");
    if (!id) {
      skipped.push({ id, reason: "no_id" });
      continue;
    }
    if (user.isGuest === true || user.guest === true) {
      skipped.push({ id, reason: "guest" });
      continue;
    }
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!email) {
      skipped.push({ id, reason: "no_email", username: user.username ?? null });
      continue;
    }
    if (!EMAIL.test(email) || email.length > 254) {
      skipped.push({ id, reason: "bad_email", username: user.username ?? null });
      continue;
    }
    if (typeof user.passwordHash !== "string" || !BCRYPT.test(user.passwordHash)) {
      skipped.push({ id, reason: "no_password", email });
      continue;
    }

    const createdAt = time(user.createdAt) ?? time(user.lastActiveAt) ?? Date.now();
    const row = {
      id,
      email,
      passwordHash: user.passwordHash,
      displayName: cleanDisplayName(user.displayName) || cleanDisplayName(user.username) || email.split("@")[0].slice(0, 32),
      character: isCharacter(user.avatarPreferences?.characterName) ? user.avatarPreferences.characterName : DEFAULT_CHARACTER,
      createdAt,
      lastActiveAt: time(user.lastActiveAt) ?? createdAt,
    };

    // Two accounts with the same email (different case): the one used most recently wins.
    const existing = byEmail.get(email);
    if (existing) {
      const [keep, drop] = row.lastActiveAt > existing.lastActiveAt ? [row, existing] : [existing, row];
      byEmail.set(email, keep);
      skipped.push({ id: drop.id, reason: "duplicate_email", email, kept: keep.id });
      continue;
    }
    byEmail.set(email, row);
  }

  const rows = [...byEmail.values()].sort((a, b) => a.createdAt - b.createdAt);
  const reasons = {};
  for (const { reason } of skipped) reasons[reason] = (reasons[reason] ?? 0) + 1;

  return {
    rows,
    sql: toSql(rows),
    report: { accountsIn: users.length, accountsWritten: rows.length, skippedByReason: reasons, skipped },
  };
}

/**
 * INSERT OR IGNORE: an id or email that already exists in D1 (someone who signed
 * up on the new platform first) is left as it is.
 */
export function toSql(rows) {
  const statements = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_STATEMENT) {
    const values = rows.slice(i, i + ROWS_PER_STATEMENT).map(
      (row) =>
        `(${quote(row.id)}, ${quote(row.email)}, 0, ${quote(row.passwordHash)}, ${quote(row.displayName)}, ${quote(row.character)}, 0, ${row.createdAt}, ${row.lastActiveAt})`,
    );
    statements.push(
      "INSERT OR IGNORE INTO users (id, email, email_verified, password_hash, display_name, character, is_guest, created_at, last_active_at) VALUES\n" +
        values.join(",\n") +
        ";",
    );
  }
  return statements.join("\n\n") + "\n";
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Dates arrive as ISO strings or `{ $date }` from the export. */
function time(value) {
  const raw = value && typeof value === "object" && "$date" in value ? value.$date : value;
  const ms = typeof raw === "number" ? raw : Date.parse(raw ?? "");
  return Number.isFinite(ms) ? Math.round(ms) : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = process.argv[2] ?? "out/users.json";
  const { sql, report } = transform(JSON.parse(readFileSync(input, "utf8")));
  writeFileSync("out/users.sql", sql);
  writeFileSync("out/report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(`accounts in: ${report.accountsIn}, written: ${report.accountsWritten}`);
  console.log("skipped:", report.skippedByReason);
}
