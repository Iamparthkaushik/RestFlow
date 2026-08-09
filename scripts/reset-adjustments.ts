/**
 * Diagnostic script: Inspect and reset user exercise adjustment factors.
 * 
 * Usage:
 *   npx tsx scripts/reset-adjustments.ts          # Inspect all adjustments
 *   npx tsx scripts/reset-adjustments.ts --reset   # Reset all to 1.0
 *   npx tsx scripts/reset-adjustments.ts --clear-sessions  # Also clear old sessions
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";

// Load env manually (no dotenv dependency)
const envContent = readFileSync(".env.development", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.development");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.\n");

  const shouldReset = process.argv.includes("--reset");
  const shouldClearSessions = process.argv.includes("--clear-sessions");

  // 1. Check adjustments
  const adjustments = await mongoose.connection.db!.collection("userexerciseadjustments").find({}).toArray();
  
  if (adjustments.length === 0) {
    console.log("No adjustment records found. adjFactor defaults to 1.0 for all exercises.");
  } else {
    console.log(`Found ${adjustments.length} adjustment record(s):\n`);
    
    for (const adj of adjustments) {
      // Look up exercise name
      const exercise = await mongoose.connection.db!.collection("exercises").findOne({ _id: adj.exerciseId });
      const exName = exercise?.name || adj.exerciseId.toString();
      
      const factor = adj.adjustmentFactor;
      const status = factor < 0.8 ? "⚠️  CORRUPTED" : factor < 0.95 ? "⚡ Slightly low" : "✅ OK";
      
      console.log(`  ${status} | ${exName}: adjFactor = ${factor.toFixed(4)}`);
    }
  }

  // 2. Check user profile
  const users = await mongoose.connection.db!.collection("users").find({}).toArray();
  console.log(`\nUser profiles (${users.length}):`);
  for (const u of users) {
    console.log(`  ${u.email}: exp=${u.experienceLevel}, wc=${u.workCapacityFactor ?? 'undefined'}`);
  }

  // 3. Check exercises
  const exercises = await mongoose.connection.db!.collection("exercises").find({}).toArray();
  console.log(`\nExercises (${exercises.length}):`);
  for (const ex of exercises) {
    console.log(`  ${ex.name}: mTax=${ex.mTax}, energyTax=${ex.energyTaxLevel}, systemic=${ex.systemicLoadPoints}, muscle=${ex.primaryMuscleGroup}`);
  }

  // 4. Check sessions
  const sessions = await mongoose.connection.db!.collection("sessions").find({}).toArray();
  console.log(`\nSessions: ${sessions.length} total`);
  for (const s of sessions) {
    console.log(`  Session ${s._id}: ${s.sets?.length || 0} sets, systemic=${s.systemicFatiguePoints}, created=${s.createdAt}`);
  }

  // 5. Reset if requested
  if (shouldReset) {
    console.log("\n--- RESETTING all adjustments to 1.0 ---");
    const result = await mongoose.connection.db!.collection("userexerciseadjustments").updateMany(
      {},
      { $set: { adjustmentFactor: 1.0 } }
    );
    console.log(`Updated ${result.modifiedCount} adjustment(s) to 1.0.`);
  }

  if (shouldClearSessions) {
    console.log("\n--- CLEARING all sessions ---");
    const result = await mongoose.connection.db!.collection("sessions").deleteMany({});
    console.log(`Deleted ${result.deletedCount} session(s).`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(console.error);
