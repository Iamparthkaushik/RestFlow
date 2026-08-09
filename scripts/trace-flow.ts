/**
 * End-to-end simulation: trace through the EXACT same flow as logSetAndGetRest
 * with real DB data to find where the numbers go wrong.
 */
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { calculateRest } from "../lib/algorithm";

// Load env
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
  console.log("Connected to MongoDB.\n");

  const db = mongoose.connection.db!;

  // Get user
  const user = await db.collection("users").findOne({ email: "parth0kaushikk@gmail.com" });
  console.log("User:", JSON.stringify({ experienceLevel: user?.experienceLevel, workCapacityFactor: user?.workCapacityFactor }));

  // Get Chin-ups exercise
  const chinups = await db.collection("exercises").findOne({ name: "Chin-ups" });
  console.log("Chin-ups:", JSON.stringify(chinups));

  // Get adjustment
  const adj = await db.collection("userexerciseadjustments").findOne({ userId: user?._id, exerciseId: chinups?._id });
  console.log("Adj:", JSON.stringify(adj));
  const adjFactor = adj ? adj.adjustmentFactor : 1.0;

  console.log("\n=== SIMULATING 4 CHIN-UP SETS ===\n");
  
  const exerciseId = chinups!._id.toString();
  let systemicFatiguePoints = 0;

  const sets = [
    { reps: 7, rpeRating: "solid" as const },
    { reps: 7, rpeRating: "hard" as const },
    { reps: 5, rpeRating: "limit" as const },
    { reps: 3, rpeRating: "limit" as const },
  ];

  for (let i = 0; i < sets.length; i++) {
    const setNum = i + 1;
    const { reps, rpeRating } = sets[i];

    // Build lastSet from CURRENT set (as in the fixed code)
    const lastSetData = {
      exerciseId: exerciseId, // STRING
      setNumber: setNum,
      reps: reps,
      rpeRating: rpeRating,
    };

    // Update systemic fatigue BEFORE calculateRest
    systemicFatiguePoints += Number(chinups!.systemicLoadPoints);

    console.log(`--- Set ${setNum} (${rpeRating}, ${reps} reps) ---`);
    console.log(`  lastSet.exerciseId: "${lastSetData.exerciseId}" (type: ${typeof lastSetData.exerciseId})`);
    console.log(`  nextExercise._id: "${exerciseId}" (type: ${typeof exerciseId})`);
    console.log(`  MATCH: ${lastSetData.exerciseId === exerciseId}`);
    console.log(`  systemic: ${systemicFatiguePoints}`);

    const result = calculateRest(
      { 
        experienceLevel: (user?.experienceLevel || "intermediate") as any, 
        workCapacityFactor: user?.workCapacityFactor ?? 1.0 
      },
      { systemicFatiguePoints },
      lastSetData,
      { 
        _id: exerciseId, 
        energyTaxLevel: chinups!.energyTaxLevel, 
        mTax: chinups!.mTax, 
        primaryMuscleGroup: chinups!.primaryMuscleGroup 
      },
      adjFactor,
      null, // no previous exercise for first exercise
      null  // no historical avg
    );

    console.log(`  => REST: ${result}s (${Math.floor(result/60)}:${String(result%60).padStart(2, '0')})\n`);
  }

  // NOW simulate what the CLIENT actually passes as exerciseId
  console.log("\n=== SIMULATING CLIENT FLOW ===\n");
  
  // getUserSchedule returns JSON.parse(JSON.stringify(schedule)) where exercises are populated
  // So exerciseId in the schedule is a full object { _id: "...", name: "Chin-ups", ... }
  // WorkoutClient does: exercises = initialSchedule.map(e => e.exerciseId)
  // activeExercise = exercises[currentExIndex] -- this is the FULL exercise object
  // logSet calls: exerciseId: activeExercise -- passes the FULL OBJECT, not just _id
  
  const clientExerciseId = { 
    _id: chinups!._id.toString(), 
    name: "Chin-ups", 
    mTax: chinups!.mTax, 
    energyTaxLevel: chinups!.energyTaxLevel 
  };
  
  console.log(`Client passes exerciseId = ${JSON.stringify(clientExerciseId)}`);
  console.log(`typeof: ${typeof clientExerciseId}`);
  
  // What does Exercise.findById(clientExerciseId) do?
  // Import the model
  const { default: Exercise } = await import("../lib/database/models/exercise.model");
  
  try {
    const found = await Exercise.findById(clientExerciseId as any);
    console.log(`Exercise.findById(object) result: ${found ? found.name : 'NULL'}`);
  } catch (e: any) {
    console.log(`Exercise.findById(object) ERROR: ${e.message}`);
  }
  
  try {
    const found = await Exercise.findById(clientExerciseId._id);
    console.log(`Exercise.findById(string) result: ${found ? found.name : 'NULL'}`);
  } catch (e: any) {
    console.log(`Exercise.findById(string) ERROR: ${e.message}`);
  }

  // The critical comparison
  const nextExId = chinups!._id.toString();
  console.log(`\nComparison in algorithm:`);
  console.log(`  lastSetData.exerciseId (from client) = ${JSON.stringify(clientExerciseId)} (type: ${typeof clientExerciseId})`);
  console.log(`  nextExercise._id = "${nextExId}" (type: ${typeof nextExId})`);
  console.log(`  clientExerciseId === nextExId: ${(clientExerciseId as any) === nextExId}`);
  console.log(`  String(clientExerciseId): "${String(clientExerciseId)}"`);

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(console.error);
