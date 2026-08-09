"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/database/db";
import Exercise from "@/lib/database/models/exercise.model";
import UserSchedule from "@/lib/database/models/schedule.model";
import Session from "@/lib/database/models/session.model";
import UserExerciseAdjustment from "@/lib/database/models/adjustment.model";
import { User } from "@/lib/database/models/auth.model";
import { calculateRest } from "@/lib/algorithm";

export async function getExercises() {
  await connectDB();
  const exercises = await Exercise.find({}).sort({ name: 1 });
  return JSON.parse(JSON.stringify(exercises));
}

export async function getUserSchedule(dayOfWeek: number) {
  const session = await auth();
  if (!session?.user?._id) throw new Error("Unauthorized");
  
  await connectDB();
  
  const schedule = await UserSchedule.findOne({ 
    userId: session.user._id,
    dayOfWeek 
  }).populate("exercises.exerciseId");
  
  return JSON.parse(JSON.stringify(schedule));
}

export async function hasAnySchedule() {
  const session = await auth();
  if (!session?.user?._id) return false;
  
  await connectDB();
  const count = await UserSchedule.countDocuments({ userId: session.user._id });
  return count > 0;
}

export async function saveSchedule(dayOfWeek: number, exerciseIds: string[]) {
  const session = await auth();
  if (!session?.user?._id) throw new Error("Unauthorized");
  
  await connectDB();
  
  const exercises = exerciseIds.map((id, index) => ({
    exerciseId: id,
    order: index
  }));
  
  await UserSchedule.findOneAndUpdate(
    { userId: session.user._id, dayOfWeek },
    { $set: { exercises } },
    { upsert: true, new: true }
  );
  
  return true;
}

export async function logSetAndGetRest({
  sessionId,
  exerciseId,
  reps,
  weightKg = 0,
  rpeRating,
}: {
  sessionId?: string;
  exerciseId: string;
  reps: number;
  weightKg?: number;
  rpeRating: "easy" | "solid" | "hard" | "limit";
}) {
  const userSession = await auth();
  if (!userSession?.user?._id) throw new Error("Unauthorized");
  await connectDB();

  // Safety: if client passes full exercise object instead of string ID, extract _id
  const safeExerciseId = typeof exerciseId === "object" && exerciseId !== null
    ? (exerciseId as any)._id?.toString() || String(exerciseId)
    : String(exerciseId);

  // 1. Fetch User & Exercise
  const user = await User.findById(userSession.user._id);
  const exercise = await Exercise.findById(safeExerciseId);
  if (!user || !exercise) throw new Error("Not found");

  // 2. Fetch or Create Session
  let activeSession;
  if (sessionId) {
    activeSession = await Session.findById(sessionId).populate("sets.exerciseId");
  } else {
    activeSession = new Session({ userId: user._id, sets: [] });
  }

  // 3. Count sets of this exercise already in session & determine set number
  const existingSets = activeSession.sets || [];
  const setsOfThisExercise = existingSets.filter(
    (s: any) => (s.exerciseId?._id || s.exerciseId).toString() === safeExerciseId
  ).length;
  const newSetNumber = setsOfThisExercise + 1;

  // 4. Build lastSet from the CURRENT set being logged
  //    (the set the user just completed IS the "last completed set")
  const lastSetData = {
    exerciseId: safeExerciseId,
    setNumber: newSetNumber,
    reps: reps,
    rpeRating: rpeRating,
  };

  // 5. Determine previous exercise (from the most recent set already in session)
  let previousExerciseData = null;
  if (existingSets.length > 0) {
    const prevSetDoc = existingSets[existingSets.length - 1];
    const prevExId = prevSetDoc.exerciseId?._id || prevSetDoc.exerciseId;
    previousExerciseData = {
      _id: prevExId.toString(),
      primaryMuscleGroup: prevSetDoc.exerciseId?.primaryMuscleGroup || "",
    };
  }

  // 6. Fetch Adjustment Factor
  const adjustment = await UserExerciseAdjustment.findOne({ userId: user._id, exerciseId: exercise._id });
  const adjFactor = adjustment ? Number(adjustment.adjustmentFactor) : 1.0;

  // 7. Calculate historical avg reps
  let historicalAvgReps = null;
  const pastSessions = await Session.find({ userId: user._id }).select("sets").lean();
  let totalReps = 0; let count = 0;
  for (const s of pastSessions) {
    for (const set of s.sets as any[]) {
      if (set.exerciseId.toString() === safeExerciseId) {
        totalReps += set.reps; count++;
      }
    }
  }
  if (count > 0) historicalAvgReps = totalReps / count;

  // 8. Update Session Systemic Fatigue (BEFORE calculateRest)
  activeSession.systemicFatiguePoints += Number(exercise.systemicLoadPoints);

  // 9. Diagnostic logging
  console.log(`\n=== [REST CALC] Exercise: ${exercise.name} (Set #${newSetNumber}) ===`);
  console.log(`  User: exp=${user.experienceLevel}, wc=${user.workCapacityFactor}`);
  console.log(`  Exercise: mTax=${exercise.mTax}, energyTax=${exercise.energyTaxLevel}, systemic=${exercise.systemicLoadPoints}, muscle=${exercise.primaryMuscleGroup}`);
  console.log(`  LastSet: exId=${lastSetData.exerciseId}, set#=${lastSetData.setNumber}, rpe=${lastSetData.rpeRating}`);
  console.log(`  PrevExercise: ${previousExerciseData ? `id=${previousExerciseData._id}, muscle=${previousExerciseData.primaryMuscleGroup}` : 'null'}`);
  console.log(`  AdjFactor: ${adjFactor} (from DB: ${adjustment ? adjustment.adjustmentFactor : 'none'})`);
  console.log(`  Session systemic: ${activeSession.systemicFatiguePoints}`);
  console.log(`  Historical avg reps: ${historicalAvgReps}`);

  // 10. Calculate Rest (with safety defaults for missing user fields)
  const safeExpLevel = user.experienceLevel || "intermediate";
  const safeWcFactor = user.workCapacityFactor ?? 1.0;
  const calculatedRest = calculateRest(
    { experienceLevel: safeExpLevel, workCapacityFactor: safeWcFactor },
    { systemicFatiguePoints: activeSession.systemicFatiguePoints },
    lastSetData,
    { _id: exercise._id.toString(), energyTaxLevel: exercise.energyTaxLevel, mTax: exercise.mTax, primaryMuscleGroup: exercise.primaryMuscleGroup },
    adjFactor,
    previousExerciseData,
    historicalAvgReps
  );

  console.log(`  => REST RESULT: ${calculatedRest}s (${Math.floor(calculatedRest/60)}:${String(calculatedRest%60).padStart(2,'0')})\n`);

  // 11. Add set to Session
  activeSession.sets.push({
    exerciseId: exercise._id,
    setNumber: newSetNumber,
    reps,
    weightKg,
    rpeRating,
    suggestedRest: calculatedRest,
    actualRestTaken: calculatedRest,
    manualOverride: false,
  });

  await activeSession.save();

  return {
    sessionId: activeSession._id.toString(),
    restTime: calculatedRest,
    suggestedRest: calculatedRest,
    setId: activeSession.sets[activeSession.sets.length - 1]._id.toString(),
  };
}

export async function completeRest(sessionId: string, setId: string, actualRestTaken: number, suggestedRest: number) {
  const userSession = await auth();
  if (!userSession?.user?._id) throw new Error("Unauthorized");
  await connectDB();

  const activeSession = await Session.findOne({ _id: sessionId, userId: userSession.user._id });
  if (!activeSession) return;

  const setIndex = activeSession.sets.findIndex((s: any) => s._id.toString() === setId);
  if (setIndex === -1) return;

  activeSession.sets[setIndex].actualRestTaken = actualRestTaken;
  
  const diff = actualRestTaken - suggestedRest;
  if (Math.abs(diff) > 10) { 
    activeSession.sets[setIndex].manualOverride = true;
    const exerciseId = activeSession.sets[setIndex].exerciseId;
    let adjustment = await UserExerciseAdjustment.findOne({ userId: userSession.user._id, exerciseId });
    if (!adjustment) {
      adjustment = new UserExerciseAdjustment({ userId: userSession.user._id, exerciseId, adjustmentFactor: 1.0 });
    }
    const ratio = actualRestTaken / suggestedRest;
    // EMA with α=0.3 per spec, floor at 0.5 to prevent runaway decay
    const rawAdj = (adjustment.adjustmentFactor * 0.7) + (ratio * 0.3);
    adjustment.adjustmentFactor = Math.max(0.5, rawAdj);
    console.log(`  [ADJ UPDATE] exercise=${exerciseId}, ratio=${ratio.toFixed(3)}, oldAdj=${adjustment.adjustmentFactor}, newAdj=${rawAdj.toFixed(3)} -> clamped=${adjustment.adjustmentFactor}`);
    await adjustment.save();
  }

  await activeSession.save();
  return true;
}
