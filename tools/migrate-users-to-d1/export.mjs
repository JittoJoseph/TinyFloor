// Reads the MongoDB `users` collection into out/users.json. Read-only.
// MONGODB_URI comes from the environment, or from backend-springboot/.env.
import { setServers } from "node:dns";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { MongoClient } from "mongodb";

function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = new URL("../../backend-springboot/.env", import.meta.url);
  if (!existsSync(file)) throw new Error("Set MONGODB_URI");
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("MONGODB_URI="));
  if (!line) throw new Error("Set MONGODB_URI");
  return line.slice("MONGODB_URI=".length).trim();
}

// Node on Windows often can't resolve mongodb+srv records through the system resolver.
if (process.platform === "win32") setServers(["1.1.1.1", "8.8.8.8"]);

const client = new MongoClient(mongoUri(), { readPreference: "secondaryPreferred" });
try {
  await client.connect();
  const users = await client
    .db(process.env.MONGODB_DB ?? "spatialmeet")
    .collection("users")
    .find(
      {},
      {
        projection: {
          username: 1,
          email: 1,
          passwordHash: 1,
          displayName: 1,
          "avatarPreferences.characterName": 1,
          isGuest: 1,
          guest: 1,
          createdAt: 1,
          lastActiveAt: 1,
        },
      },
    )
    .toArray();

  mkdirSync("out", { recursive: true });
  writeFileSync("out/users.json", JSON.stringify(users.map((user) => ({ ...user, _id: String(user._id) })), null, 2));
  console.log(`exported ${users.length} users to out/users.json`);
} finally {
  await client.close();
}
