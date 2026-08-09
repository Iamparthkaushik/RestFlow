import mongoose from "mongoose";
import { readFileSync } from "fs";

const envContent = readFileSync(".env.development", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected.");

  // Fix users missing experienceLevel
  const r1 = await mongoose.connection.db!.collection("users").updateMany(
    { experienceLevel: { $exists: false } },
    { $set: { experienceLevel: "intermediate", workCapacityFactor: 1.0 } }
  );
  console.log(`Set experienceLevel on ${r1.modifiedCount} users`);

  // Fix users missing workCapacityFactor
  const r2 = await mongoose.connection.db!.collection("users").updateMany(
    { workCapacityFactor: { $exists: false } },
    { $set: { workCapacityFactor: 1.0 } }
  );
  console.log(`Set workCapacityFactor on ${r2.modifiedCount} users`);

  // Also fix null/undefined values
  const r3 = await mongoose.connection.db!.collection("users").updateMany(
    { experienceLevel: null },
    { $set: { experienceLevel: "intermediate" } }
  );
  console.log(`Fixed null experienceLevel on ${r3.modifiedCount} users`);

  const r4 = await mongoose.connection.db!.collection("users").updateMany(
    { workCapacityFactor: null },
    { $set: { workCapacityFactor: 1.0 } }
  );
  console.log(`Fixed null workCapacityFactor on ${r4.modifiedCount} users`);

  // Verify
  const users = await mongoose.connection.db!.collection("users").find({}).toArray();
  for (const u of users) {
    console.log(`  ${u.email}: exp=${u.experienceLevel}, wc=${u.workCapacityFactor}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(console.error);
