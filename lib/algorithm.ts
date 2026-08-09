type User = {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  workCapacityFactor: number;
};

type Session = {
  systemicFatiguePoints: number;
};

type LastSet = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  rpeRating: "easy" | "solid" | "hard" | "limit";
} | null;

type NextExercise = {
  _id: string;
  energyTaxLevel: number;
  mTax: number;
  primaryMuscleGroup: string;
};

type PreviousExercise = {
  _id: string;
  primaryMuscleGroup: string;
} | null;

const INTENSITY_MAP = { easy: 0.65, solid: 0.85, hard: 1.00, limit: 1.40 };
const EXPERIENCE_MAP = { beginner: 1.15, intermediate: 1.00, advanced: 0.85 };

const BASE_REST = 120;
const MIN_REST = 30;
const MAX_REST = 300;
const PERF_DROP_PENALTY = 45;
const PERF_DROP_THRESHOLD = 0.8;

export function calculateRest(
  user: User,
  session: Session,
  lastSet: LastSet,
  nextExercise: NextExercise,
  adjFactor: number,
  previousExercise: PreviousExercise,
  historicalAvgReps: number | null
): number {
  // ---- 1. Intensity multiplier ----
  let mIntensity = 1.0;
  if (lastSet && lastSet.exerciseId === nextExercise._id) {
    mIntensity = INTENSITY_MAP[lastSet.rpeRating];
  } // Else defaults to 1.0 for new exercise transition

  // ---- 2. Experience multiplier ----
  const mExperience = EXPERIENCE_MAP[user.experienceLevel] || 1.0;

  // ---- 3. Exercise tax ----
  const mTaxNext = Number(nextExercise.mTax);

  // ---- 4. Work capacity ----
  const aWc = Number(user.workCapacityFactor);

  // ---- 5. Personal adjustment ----
  const adj = Number(adjFactor);

  // ---- 6. Overlap ----
  let mOverlap = 1.0;
  if (previousExercise && previousExercise._id !== nextExercise._id) {
    if (previousExercise.primaryMuscleGroup === nextExercise.primaryMuscleGroup) {
      mOverlap = 1.2;
    }
  }

  // ---- 7. Cumulative set fatigue (for next exercise) ----
  let setsDone = 0;
  if (lastSet && lastSet.exerciseId === nextExercise._id) {
    setsDone = lastSet.setNumber;
  }
  const deltaSet = setsDone * (5 + Number(nextExercise.energyTaxLevel) * 5);

  // ---- 8. Session systemic fatigue ----
  const systemicPoints = Number(session.systemicFatiguePoints || 0);
  const deltaSession = Math.floor(systemicPoints / 5) * 20;

  // ---- 9. Performance drop penalty ----
  let deltaPerf = 0;
  if (lastSet && historicalAvgReps !== null && historicalAvgReps > 0) {
    if (lastSet.reps / historicalAvgReps < PERF_DROP_THRESHOLD) {
      deltaPerf = PERF_DROP_PENALTY;
    }
  }

  // ---- Core calculation ----
  const raw =
    BASE_REST * mIntensity * mExperience * mTaxNext * aWc * adj * mOverlap +
    deltaSet +
    deltaSession +
    deltaPerf;

  const finalRest = Math.max(MIN_REST, Math.min(MAX_REST, Math.round(raw)));

  // Debug Logging
  console.log(`[Algorithm Debug] Next Ex: ${nextExercise._id} | setsDone: ${setsDone} | sysPoints: ${systemicPoints}`);
  console.log(`  -> raw = ${BASE_REST} * ${mIntensity}(int) * ${mExperience}(exp) * ${mTaxNext}(tax) * ${aWc}(wc) * ${adj}(adj) * ${mOverlap}(over) + ${deltaSet}(set) + ${deltaSession}(sys) + ${deltaPerf}(perf)`);
  console.log(`  -> raw sum: ${raw} -> clamped: ${finalRest}`);

  return finalRest;
}
