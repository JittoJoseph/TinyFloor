// Counts the repository's commits a day over the last sixteen weeks, for the
// grid on the home page's open source section, and writes them to
// src/components/home/commits.json. Run before each build; where the clone has
// no history to count (a shallow one), the file from the last run is kept.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const WEEKS = 16;
const OUT = new URL("../src/components/home/commits.json", import.meta.url);

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

try {
  if (git("rev-parse", "--is-shallow-repository") === "true") throw new Error("shallow clone");
  // The grid runs Sunday to Saturday in columns, ending with this week.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay() - 7 * (WEEKS - 1));
  const dates = git("log", `--since=${start.toISOString().slice(0, 10)}`, "--format=%ad", "--date=short").split("\n").filter(Boolean);
  const perDay = {};
  for (const date of dates) perDay[date] = (perDay[date] ?? 0) + 1;
  const days = [];
  for (const day = new Date(start); day <= today; day.setUTCDate(day.getUTCDate() + 1)) days.push(perDay[day.toISOString().slice(0, 10)] ?? 0);
  writeFileSync(OUT, JSON.stringify({ start: start.toISOString().slice(0, 10), days }) + "\n");
  console.log(`commits: ${dates.length} in ${WEEKS} weeks`);
} catch (error) {
  console.log(`commits: kept the last count (${error.message})`);
}
