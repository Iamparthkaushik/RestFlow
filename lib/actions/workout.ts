"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/database/db";
import Exercise from "@/lib/database/models/exercise.model";
import UserSchedule from "@/lib/database/models/schedule.model";
import Session from "@/lib/database/models/session.model";
import UserExerciseAdjustment from "@/lib/database/models/adjustment.model";
import WorkoutRecord from "@/lib/database/models/record.model";
import { User } from "@/lib/database/models/auth.model";
import { calculateRest } from "@/lib/algorithm";
import { revalidatePath } from "next/cache";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  // 0 is Sunday -> subtract 6 to reach Monday; 1 is Monday -> diff is 0
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

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

export async function getAllUserSchedules() {
  const session = await auth();
  if (!session?.user?._id) throw new Error("Unauthorized");
  await connectDB();
  const schedules = await UserSchedule.find({ userId: session.user._id })
    .populate("exercises.exerciseId")
    .sort({ dayOfWeek: 1 });
  return JSON.parse(JSON.stringify(schedules));
}

export async function hasAnySchedule() {
  const session = await auth();
  if (!session?.user?._id) return false;
  
  await connectDB();
  const count = await UserSchedule.countDocuments({
    userId: session.user._id,
    "exercises.0": { $exists: true }
  });
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
  
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/records");
  revalidatePath("/workout");
  return true;
}

export async function deleteSchedule(dayOfWeek: number) {
  const session = await auth();
  if (!session?.user?._id) throw new Error("Unauthorized");
  await connectDB();
  await UserSchedule.findOneAndUpdate(
    { userId: session.user._id, dayOfWeek },
    { $set: { exercises: [] } },
    { upsert: true }
  );
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/records");
  return true;
}

export async function completeWorkoutSession({
  sessionId,
  dayOfWeek,
  exerciseIds,
}: {
  sessionId?: string;
  dayOfWeek?: number;
  exerciseIds?: string[];
}) {
  const userSession = await auth();
  if (!userSession?.user?._id) throw new Error("Unauthorized");
  await connectDB();

  const now = new Date();
  const currentDayOfWeek = typeof dayOfWeek === "number" ? dayOfWeek : now.getDay();
  const dateString = formatDateString(now);
  const dayName = DAY_NAMES[currentDayOfWeek];

  // Fetch exercises details
  let exercisesToSave: any[] = [];
  if (exerciseIds && exerciseIds.length > 0) {
    const safeIds = exerciseIds.map(id => typeof id === "object" ? (id as any)._id : id);
    const foundExercises = await Exercise.find({ _id: { $in: safeIds } });
    exercisesToSave = foundExercises.map((ex) => ({
      exerciseId: ex._id,
      name: ex.name,
      primaryMuscleGroup: ex.primaryMuscleGroup,
      setsCount: 0,
    }));
  } else {
    const userSched = await UserSchedule.findOne({
      userId: userSession.user._id,
      dayOfWeek: currentDayOfWeek,
    }).populate("exercises.exerciseId");
    if (userSched && userSched.exercises) {
      exercisesToSave = userSched.exercises
        .filter((e: any) => e.exerciseId)
        .map((e: any) => ({
          exerciseId: e.exerciseId._id,
          name: e.exerciseId.name,
          primaryMuscleGroup: e.exerciseId.primaryMuscleGroup,
          setsCount: 0,
        }));
    }
  }

  // Update session if present
  if (sessionId) {
    await Session.findOneAndUpdate(
      { _id: sessionId, userId: userSession.user._id },
      {
        $set: {
          endedAt: now,
          status: "completed",
          dayOfWeek: currentDayOfWeek,
          dateString,
        },
      }
    );
  }

  // Save WorkoutRecord
  await WorkoutRecord.findOneAndUpdate(
    { userId: userSession.user._id, dateString },
    {
      $set: {
        userId: userSession.user._id,
        dateString,
        dayOfWeek: currentDayOfWeek,
        dayName,
        status: "completed",
        title: `${dayName}'s workout - Completed`,
        sessionId: sessionId || null,
        completedAt: now,
        exercises: exercisesToSave,
      },
    },
    { upsert: true, new: true }
  );

  revalidatePath("/");
  revalidatePath("/workout");
  revalidatePath("/records");
  return true;
}

export async function getUserDashboardData() {
  const session = await auth();
  if (!session?.user?._id) return null;
  await connectDB();

  const now = new Date();
  const todayDayOfWeek = now.getDay();
  const todayDateString = formatDateString(now);
  const todayDayName = DAY_NAMES[todayDayOfWeek];

  // 1. Fetch all schedules for this user
  const schedules = await UserSchedule.find({ userId: session.user._id })
    .populate("exercises.exerciseId")
    .lean();

  const schedulesByDay: Record<number, any> = {};
  for (const s of schedules) {
    const validExercises = (s.exercises || [])
      .map((e: any) => e.exerciseId)
      .filter(Boolean);
    if (validExercises.length > 0) {
      schedulesByDay[s.dayOfWeek] = {
        _id: s._id.toString(),
        dayOfWeek: s.dayOfWeek,
        dayName: DAY_NAMES[s.dayOfWeek],
        exercises: validExercises,
      };
    }
  }

  const hasSchedule = Object.keys(schedulesByDay).length > 0;

  // 2. Fetch current week's Monday (start of week)
  const monday = getMondayOfWeek(now);
  const weekDates: { date: Date; dateString: string; dayOfWeek: number; dayName: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    weekDates.push({
      date: d,
      dateString: formatDateString(d),
      dayOfWeek: d.getDay(),
      dayName: DAY_NAMES[d.getDay()],
    });
  }

  // 3. Fetch existing workout records for this week
  const weekDateStrings = weekDates.map((w) => w.dateString);
  const existingRecords = await WorkoutRecord.find({
    userId: session.user._id,
    dateString: { $in: weekDateStrings },
  }).lean();

  const recordsByDate: Record<string, any> = {};
  for (const r of existingRecords) {
    recordsByDate[r.dateString] = r;
  }

  // 4. For past scheduled days in this week with no completed record, mark as missed
  for (const w of weekDates) {
    if (w.dateString < todayDateString) {
      const scheduledDay = schedulesByDay[w.dayOfWeek];
      if (scheduledDay && !recordsByDate[w.dateString]) {
        const missedTitle = `${w.dayName}'s workout missed`;
        const exerciseSnapshots = scheduledDay.exercises.map((ex: any) => ({
          exerciseId: ex._id,
          name: ex.name,
          primaryMuscleGroup: ex.primaryMuscleGroup || "",
        }));

        try {
          const newMissedRecord = await WorkoutRecord.findOneAndUpdate(
            { userId: session.user._id, dateString: w.dateString },
            {
              $setOnInsert: {
                userId: session.user._id,
                dateString: w.dateString,
                dayOfWeek: w.dayOfWeek,
                dayName: w.dayName,
                status: "missed",
                title: missedTitle,
                exercises: exerciseSnapshots,
              },
            },
            { upsert: true, new: true }
          ).lean();

          recordsByDate[w.dateString] = newMissedRecord;
        } catch (e) {
          // ignore duplicate race
        }
      }
    }
  }

  // 5. Check if today's workout is completed
  const todayRecord = recordsByDate[todayDateString];
  const todayCompleted = !!todayRecord && todayRecord.status === "completed";

  // 6. Build Active Sessions list ordered from today downwards (offsets 0 to 6)
  const activeSessions: any[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const targetDayOfWeek = (todayDayOfWeek + offset) % 7;
    const targetDayName = DAY_NAMES[targetDayOfWeek];
    const scheduled = schedulesByDay[targetDayOfWeek];

    if (!scheduled) continue; // No workout scheduled for this day

    // If offset is 0 (Today) and it's already finished for the day, it DISAPPEARS from dashboard!
    if (offset === 0 && todayCompleted) {
      continue;
    }

    let headerTitle = "";
    if (offset === 0) {
      headerTitle = "Today's Plan";
    } else if (offset === 1) {
      headerTitle = "Tomorrow's Plan";
    } else {
      headerTitle = `${targetDayName}'s Plan`;
    }

    activeSessions.push({
      dayOfWeek: targetDayOfWeek,
      dayName: targetDayName,
      headerTitle,
      offset,
      isToday: offset === 0,
      isTomorrow: offset === 1,
      exercises: scheduled.exercises,
    });
  }

  // 7. Build Records list for throughout the week (completed and missed)
  const weeklyRecords: any[] = [];
  for (const w of weekDates) {
    const record = recordsByDate[w.dateString];
    if (record) {
      weeklyRecords.push({
        _id: record._id.toString(),
        dateString: w.dateString,
        dayOfWeek: w.dayOfWeek,
        dayName: w.dayName,
        status: record.status,
        title: record.status === "completed" ? `${w.dayName}'s workout - Completed` : `${w.dayName}'s workout missed`,
        completedAt: record.completedAt ? new Date(record.completedAt).toISOString() : null,
        exercises: record.exercises || [],
      });
    }
  }

  // 8. Fetch all exercises for session editor
  const allExercises = await Exercise.find({}).sort({ name: 1 }).lean();

  return JSON.parse(
    JSON.stringify({
      todayDateString,
      todayDayOfWeek,
      todayDayName,
      todayCompleted,
      hasAnySchedule: hasSchedule,
      activeSessions,
      records: weeklyRecords,
      allExercises,
      schedulesByDay,
    })
  );
}

export async function getRecordsData(weekOffset: number = 0) {
  const session = await auth();
  if (!session?.user?._id) return null;
  await connectDB();

  const now = new Date();
  const baseMonday = getMondayOfWeek(now);
  const targetMonday = new Date(baseMonday.getTime() + weekOffset * 7 * 86400000);
  const todayDateString = formatDateString(now);

  const weekDates: { date: Date; dateString: string; dayOfWeek: number; dayName: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday.getTime() + i * 86400000);
    weekDates.push({
      date: d,
      dateString: formatDateString(d),
      dayOfWeek: d.getDay(),
      dayName: DAY_NAMES[d.getDay()],
    });
  }

  // Fetch all user schedules
  const schedules = await UserSchedule.find({ userId: session.user._id })
    .populate("exercises.exerciseId")
    .lean();
  const schedulesByDay: Record<number, any> = {};
  for (const s of schedules) {
    const valid = (s.exercises || []).map((e: any) => e.exerciseId).filter(Boolean);
    if (valid.length > 0) schedulesByDay[s.dayOfWeek] = valid;
  }

  const weekDateStrings = weekDates.map((w) => w.dateString);
  const records = await WorkoutRecord.find({
    userId: session.user._id,
    dateString: { $in: weekDateStrings },
  }).lean();

  const recordsByDate: Record<string, any> = {};
  for (const r of records) {
    recordsByDate[r.dateString] = r;
  }

  // Ensure missed records for past days in this week
  for (const w of weekDates) {
    if (w.dateString < todayDateString && schedulesByDay[w.dayOfWeek] && !recordsByDate[w.dateString]) {
      const missedTitle = `${w.dayName}'s workout missed`;
      try {
        const newMissed = await WorkoutRecord.findOneAndUpdate(
          { userId: session.user._id, dateString: w.dateString },
          {
            $setOnInsert: {
              userId: session.user._id,
              dateString: w.dateString,
              dayOfWeek: w.dayOfWeek,
              dayName: w.dayName,
              status: "missed",
              title: missedTitle,
              exercises: schedulesByDay[w.dayOfWeek].map((ex: any) => ({
                exerciseId: ex._id,
                name: ex.name,
                primaryMuscleGroup: ex.primaryMuscleGroup || "",
              })),
            },
          },
          { upsert: true, new: true }
        ).lean();
        recordsByDate[w.dateString] = newMissed;
      } catch (e) {}
    }
  }

  const items = weekDates.map((w) => {
    const r = recordsByDate[w.dateString];
    const isPast = w.dateString < todayDateString;
    const isToday = w.dateString === todayDateString;
    const isFuture = w.dateString > todayDateString;
    const scheduled = schedulesByDay[w.dayOfWeek] || null;

    let status = "rest";
    let title = `${w.dayName} - Rest Day`;
    let exercises = scheduled || [];

    if (r) {
      status = r.status;
      title = r.status === "completed" ? `${w.dayName}'s workout - Completed` : `${w.dayName}'s workout missed`;
      exercises = r.exercises || scheduled || [];
    } else if (scheduled) {
      if (isToday) {
        status = "today-pending";
        title = "Today's workout - Pending";
      } else if (isFuture) {
        status = "upcoming";
        title = `${w.dayName}'s workout - Scheduled`;
      }
    }

    return {
      dateString: w.dateString,
      dayOfWeek: w.dayOfWeek,
      dayName: w.dayName,
      status,
      title,
      completedAt: r?.completedAt ? new Date(r.completedAt).toISOString() : null,
      exercises,
      isScheduled: !!scheduled,
      isToday,
      isPast,
    };
  });

  const completedCount = items.filter((i) => i.status === "completed").length;
  const missedCount = items.filter((i) => i.status === "missed").length;
  const totalScheduled = items.filter((i) => i.isScheduled).length;

  return JSON.parse(
    JSON.stringify({
      weekOffset,
      weekStart: weekDates[0].dateString,
      weekEnd: weekDates[6].dateString,
      items,
      stats: {
        completedCount,
        missedCount,
        totalScheduled,
        rate: totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0,
      },
    })
  );
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
