// Checks D1 against the report and the export: every written account is there,
// and a sample matches field by field. `--local` or `--remote`.
import { readFileSync } from "node:fs";
import { transform } from "./transform.mjs";
import { d1 } from "./wrangler.mjs";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const { rows } = transform(JSON.parse(readFileSync("out/users.json", "utf8")));
const report = JSON.parse(readFileSync("out/report.json", "utf8"));

function query(sql) {
  const output = d1(target, ["--json", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return JSON.parse(output.slice(output.indexOf("[")))[0].results;
}

const problems = [];
if (rows.length !== report.accountsWritten) problems.push(`report says ${report.accountsWritten} accounts, transform gives ${rows.length}`);

// Present by email; an existing account on the new platform may own an email first.
const inD1 = new Map();
for (let i = 0; i < rows.length; i += 50) {
  const emails = rows.slice(i, i + 50).map((row) => `'${row.email.replace(/'/g, "''")}'`).join(",");
  for (const found of query(`SELECT id, email, password_hash, display_name, character, is_guest, created_at FROM users WHERE email IN (${emails})`)) {
    inD1.set(found.email, found);
  }
}

let carried = 0;
let ownedByNewAccount = 0;
for (const row of rows) {
  const found = inD1.get(row.email);
  if (!found) {
    problems.push(`missing: ${row.id}`);
    continue;
  }
  if (found.id !== row.id) {
    ownedByNewAccount++;
    continue;
  }
  carried++;
  const expected = { password_hash: row.passwordHash, display_name: row.displayName, character: row.character, is_guest: 0, created_at: row.createdAt };
  for (const [field, value] of Object.entries(expected)) {
    if (found[field] !== value) problems.push(`${row.id}: ${field} differs`);
  }
}

console.log(`accounts expected: ${rows.length}`);
console.log(`carried over and matching: ${carried}`);
console.log(`email already taken by a new account (left as is): ${ownedByNewAccount}`);
if (problems.length) {
  console.log(`problems (${problems.length}):`);
  for (const problem of problems.slice(0, 50)) console.log(`  ${problem}`);
  process.exitCode = 1;
} else {
  console.log("clean");
}
