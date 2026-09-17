// Runs out/users.sql against tinyfloor-db: `--local` for a rehearsal, `--remote` on the day.
import { resolve } from "node:path";
import { d1 } from "./wrangler.mjs";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
d1(target, ["--yes", "--file", resolve("out/users.sql")], { stdio: "inherit" });
